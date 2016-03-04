# -*- coding: utf-8 -*-
'''Public section, including homepage and signup.'''
import json
import datetime, uuid, os

from flask import (Blueprint, request, render_template, flash, url_for,
                    redirect, session, jsonify, redirect, request, current_app,
                    abort)
from flask.ext.login import login_user, login_required, logout_user, current_user
from rq import Queue
from redis import Redis
from translatorsdesk.extensions import login_manager
from translatorsdesk.user.models import User, File
from translatorsdesk.public.forms import LoginForm
from translatorsdesk.user.forms import RegisterForm
from translatorsdesk.utils import flash_errors
from translatorsdesk.database import db
import translatorsdesk.worker_functions as worker_functions

blueprint = Blueprint('public', __name__, static_folder="../static")

#TO-DO : Change this to a redis pool
redis_conn = Redis()
q = Queue(connection=redis_conn, default_timeout=300)

"""
    Helper functions
"""
def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1] in current_app.config['ALLOWED_FILE_EXTENSIONS']

def _can_user_access_file(uid, fileName, current_user):
    file = File.query.filter_by(uuid = uid, name = fileName).first()
    if not file.shareable:
        if not current_user.is_authenticated():
            return False
        else:
            if file.user_id != current_user.id:
                return False
    return True

"""
    Checks if a uid, fileName pair exists
"""
def fileExists(uid, fileName):
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName)
    if os.path.exists(filepath):
        return True
    else:
        return False

"""
    Checks if the XLIFF file for a uid, fileName pair exists
    Note: This assumes that the uid and fileName pair exists
"""
def fileXLIFFExists(uid, fileName):
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName+".xlf")
    if os.path.exists(filepath):
        return True
    else:
        return False

def returnFileData(uid, fileName):
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName)    
    f = open(filepath, 'r')
    data = f.read()
    f.close()
    return data

def get_redis_connection():
    return Redis()

@login_manager.user_loader
def load_user(id):
    return User.get_by_id(int(id))

@blueprint.route("/", methods=["GET", "POST"])
def home():
    return render_template("public/home.html")

@blueprint.route("/login/", methods=["GET", "POST"])
def login():
    login_form = LoginForm(request.form)
    register_form = RegisterForm(request.form, csrf_enabled=False)
    if request.method == 'POST':
        if login_form.validate_on_submit():
            login_user(login_form.user)
            redirect_url = url_for("user.account") or request.args.get("next") 
            return redirect(redirect_url)
        else:
            flash_errors(login_form)
    return render_template('public/register.html', login_form=login_form, register_form=register_form)

@blueprint.route('/logout/')
@login_required
def logout():
    logout_user()
    return redirect(url_for('public.home'))

@blueprint.route("/register/", methods=['GET', 'POST'])
def register():
    login_form = LoginForm(request.form)
    register_form = RegisterForm(request.form, csrf_enabled=False)
    if register_form.validate_on_submit():
        new_user = User.create(username=register_form.username.data,
                        email=register_form.email.data,
                        password=register_form.password.data,
                        active=True)
        flash("Thank you for registering. You can now log in.", 'success')
        return redirect(url_for('public.home'))
    else:
        flash_errors(register_form)
    return render_template('public/register.html', login_form=login_form, register_form=register_form)

@blueprint.route("/about/")
def about():
    form = LoginForm(request.form)
    return render_template("public/about.html", form=form)


"""
    Handles file uploads
"""

@blueprint.route('/upload', methods=['POST'])
def upload():
    if request.method == 'POST':
        r_conn = get_redis_connection()
        src = request.values.get("src", None)
        tgt = request.values.get("tgt", None)

        #CHECK IF SRC AND TGT ARE VALID
        if not (src and tgt):
            return jsonify({"success": False, "message": "Source and Target Languages not specified!!"})

        lg_pairs = json.loads(r_conn.get("language_pairs"))
        print lg_pairs
        if (src[:3].lower() not in lg_pairs) or (tgt[:3].lower()not in lg_pairs[src[:3].lower()]):
            return jsonify({"success": False, "message": "Source and Target Languages not valid!!"})

        #CLEAN SRC AND TGT VAR
        src = src.strip('\n').strip('\r').strip()
        tgt = tgt.strip('\n').strip('\r').strip()

        file = request.files.get('file', None)
        raw_text = request.values.get("raw_text", None)

        if file:
            if _allowed_file(file.filename):
                _uuid = str(uuid.uuid4())
                secure_filename = file.filename.replace('/', "_").replace('\\', '_')
                filepath = os.path.join(current_app.config['UPLOAD_FOLDER'],  _uuid, secure_filename)
                if not os.path.exists(os.path.dirname(filepath)):
                    os.makedirs(os.path.dirname(filepath))
                file.save(filepath)
            else:
                return jsonify({"success": False, "message": "File Type not supported yet!!"})

        elif raw_text:
            _uuid = str(uuid.uuid4())
            secure_filename = "raw_text.txt"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'],  _uuid, secure_filename)
            if not os.path.exists(os.path.dirname(filepath)):
                os.makedirs(os.path.dirname(filepath))
            job = q.enqueue_call(func=worker_functions.save_text_file, args=(filepath, raw_text))
        
        if current_user.is_authenticated():
            user_file = File.create(
                            uuid = _uuid,
                            name = secure_filename,
                            user_id = current_user.id,
                        )
        else:
            user_file = File.create(
                            uuid = _uuid,
                            name = secure_filename,
                            shareable = True
                        )

        if file or raw_text:
            ## Add Job to Queue
            print filepath
            job = q.enqueue_call(func=worker_functions.process_input_file, args=(filepath, src, tgt))

            return jsonify({"success":True, "filename":secure_filename, "uuid": _uuid })       
        else:
            return jsonify({"success": False, "message": "Corrupt File"})


"""
    Handles Computer Assisted Translation of a particular xliff file
"""
@blueprint.route('/translate/<uid>/<fileName>/', methods=['GET'])
def translate(uid, fileName):
    
    #Check if user is allowed to view the file
    if not _can_user_access_file(uid, fileName, current_user):
        abort(403)

    #Check if the uid and filename exists
    r_conn = get_redis_connection()
    _status = r_conn.lrange("state_"+uid+"/"+fileName, 0, -1)
    if len(_status) > 0:
        if fileExists(uid, fileName):
            if _status[0].startswith("TRANSLATING_PO_FILE") or _status[0].startswith("GENERATING_TRANSLATED_PO_FILE") or _status[0].startswith("OUTPUT_FILE_GENERATED"):
                filepath = os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName+".meta")
                meta_file = open(filepath, 'r')
                meta = json.loads(meta_file.read())
                _status = r_conn.lrange("state_"+uid+"/"+fileName, 0, -1)
                return render_template('public/translate.html',\
                                    fileName=fileName,
                                    uid=uid,
                                    status = _status,
                                    PO = {'po':True, 'data':meta}
                                    )
            elif _status[0].startswith("PIPELINE_ERROR"):
                print "RESUMED", fileName
                filepath = os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName)
                job = q.enqueue_call(func=worker_functions.translate_po, args=(filepath,) )

            return render_template('public/translate.html',\
                                fileName=fileName,
                                uid=uid,
                                status=_status,
                                PO = False
                                )
        else:
                print "ELSE 1"
                return abort(404)
    else:
        print "ELSE 2"
        return abort(404)


@blueprint.route('/download', methods=['POST'])
@login_required
def download():
    data = request.values
    uid = data.get('uid', None)
    fileName = data.get('fileName', None)
    corrections = data.get('data', None)
    print uid, fileName, corrections
    if not (uid and fileName and corrections):
        return jsonify({"success": False, "message": "Data Missing"})
    if not _can_user_access_file(uid, fileName, current_user):
        abort(403)
    file = os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName)
    job = q.enqueue_call(func=worker_functions.generateOutputFile, args=(file, json.loads(corrections)))
    return "#";


@blueprint.route('/status/<uid>/<fileName>', methods=['GET'])
def status(uid, fileName):
    if not _can_user_access_file(uid, fileName, current_user):
        abort(403)
    r_conn = get_redis_connection()
    _status = r_conn.lrange("state_"+uid+"/"+fileName, 0, -1)

    if len(_status) > 0 and _status[0].startswith("OUTPUT_FILE_GENERATED"):
        return jsonify({'file':_status[0].split(":::")[-1], 'fileReady':True})
    else:
        return jsonify({'fileReady':False})