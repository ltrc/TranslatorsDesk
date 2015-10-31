# -*- coding: utf-8 -*-
'''Public section, including homepage and signup.'''
from flask import (Blueprint, request, render_template, flash, url_for,
                    redirect, session, jsonify, redirect, request, current_app,
                    abort)
from flask.ext.login import login_user, login_required, logout_user

from translatorsdesk.extensions import login_manager
from translatorsdesk.user.models import User
from translatorsdesk.public.forms import LoginForm
from translatorsdesk.user.forms import RegisterForm
from translatorsdesk.utils import flash_errors
from translatorsdesk.database import db
import translatorsdesk.worker_functions as worker_functions

import polib

import datetime, uuid, os

blueprint = Blueprint('public', __name__, static_folder="../static")

from rq import Queue
from redis import Redis

#TO-DO : Change this to a redis pool
redis_conn = Redis()
q = Queue(connection=redis_conn)


@login_manager.user_loader
def load_user(id):
    return User.get_by_id(int(id))


@blueprint.route("/", methods=["GET", "POST"])
def home():
    form = LoginForm(request.form)
    # Handle logging in
    if request.method == 'POST':
        if form.validate_on_submit():
            login_user(form.user)
            flash("You are logged in.", 'success')
            redirect_url = request.args.get("next") or url_for("user.members")
            return redirect(redirect_url)
        else:
            flash_errors(form)
    return render_template("public/home.html", form=form)

@blueprint.route('/logout/')
@login_required
def logout():
    logout_user()
    flash('You are logged out.', 'info')
    return redirect(url_for('public.home'))

@blueprint.route("/register/", methods=['GET', 'POST'])
def register():
    form = RegisterForm(request.form, csrf_enabled=False)
    if form.validate_on_submit():
        new_user = User.create(username=form.username.data,
                        email=form.email.data,
                        password=form.password.data,
                        active=True)
        flash("Thank you for registering. You can now log in.", 'success')
        return redirect(url_for('public.home'))
    else:
        flash_errors(form)
    return render_template('public/register.html', form=form)

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
        file = request.files.get('file', None)
        raw_text = request.values.get("raw_text", None)
        print file
        print raw_text
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
            print "I am in raw_text"
            _uuid = str(uuid.uuid4())
            secure_filename = "raw_text.txt"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'],  _uuid, secure_filename)
            if not os.path.exists(os.path.dirname(filepath)):
                os.makedirs(os.path.dirname(filepath))
            print "Made dir"
            f = open(filepath, 'w')
            f.write(raw_text)
            f.close()
            print "made file"
        
        if file or raw_text:
            ## Add Job to Queue
            src = request.values.get("src", None)
            tgt = request.values.get("tgt", None)
            print src, tgt
            if not (src and tgt):
                return jsonify({"success": False, "message": "Source and Target Languages not specified!!"})
            #CLEAN SRC AND TGT VAR
            src = src.strip('\n').strip('\r').strip()
            tgt = tgt.strip('\n').strip('\r').strip()

            job = q.enqueue_call(func=worker_functions.process_input_file, args=(filepath, src, tgt))

            return jsonify({"success":True, "filename":secure_filename, "uuid": _uuid })       
        else:
            return jsonify({"success": False, "message": "Corrupt File"})


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1] in current_app.config['ALLOWED_FILE_EXTENSIONS']


"""
    Helper functions for Translate
"""

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


"""
    Handles Computer Assisted Translation of a particular xliff file
"""
@blueprint.route('/translate/<uid>/<fileName>/', methods=['GET'])
def translate(uid, fileName):
    ##Check if the uid and filename exists
    r_conn = get_redis_connection()
    _status = r_conn.lrange("state_"+uid+"/"+fileName, 0, -1)

    if len(_status) >0 and (_status[0]=="GENERATING_TRANSLATED_PO_FILE:::COMPLETE" or _status[0].startswith("OUTPUT_FILE_GENERATED") ) :
        if fileExists(uid, fileName):
            if(fileExists(uid, fileName+".po")):

                po = polib.pofile(os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName+".po"))
                valid_entries = [e for e in po if not e.obsolete]
                d = []
                for entry in valid_entries:
                    if entry.msgid.strip() != "":
                        d.append({"src":entry.msgid,"tgt":entry.msgstr})

                r_conn = get_redis_connection()
                _status = r_conn.lrange("state_"+uid+"/"+fileName, 0, -1)

                
                return render_template('public/translate.html',\
                                    fileName=fileName,
                                    uid=uid,
                                    status = _status,
                                    PO = {'po':True, 'data':d}
                                    )        
            else:
                return abort(404)
        else:
            return abort(404)
    else:
        r_conn = get_redis_connection()
        _status = r_conn.lrange("state_"+uid+"/"+fileName, 0, -1)

        return render_template('public/translate.html',\
                            fileName=fileName,
                            uid=uid,
                            status=_status,
                            PO = False
                            )

import subprocess

@blueprint.route('/preview', methods=['POST'])
def preview():
    data = request.json
    fileName = data['fileName']
    uid = data['uid']

    po = polib.POFile()
    for _d in data['data']:
        _msgid = _d['src'].strip()
        _msgstr = _d['tgt'].strip()

        entry = polib.POEntry(
            msgid=unicode(_msgid),
            msgstr=unicode(_msgstr),
        )
        po.append(entry)
    print data
    po.save(os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName+".updated.po"))

    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName)
    job = q.enqueue_call(func=worker_functions.generateOutputFile, args=(filepath,))

    return "#";


@blueprint.route('/status/<uid>/<fileName>', methods=['GET'])
def status(uid, fileName):
    r_conn = get_redis_connection()
    _status = r_conn.lrange("state_"+uid+"/"+fileName, 0, -1)

    if len(_status) > 0 and _status[0].startswith("OUTPUT_FILE_GENERATED"):
        return jsonify({'file':_status[0].split(":::")[-1], 'fileReady':True})
    else:
        return jsonify({'fileReady':False})
