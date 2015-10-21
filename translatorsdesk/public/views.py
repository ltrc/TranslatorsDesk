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
import translatorsdesk.tikal_driver as tikal_driver

import polib

import datetime, uuid, os

blueprint = Blueprint('public', __name__, static_folder="../static")

from rq import Queue
from redis import Redis
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
        file = request.files['file']
        if file:
            if _allowed_file(file.filename):
                _uuid = str(uuid.uuid4())
                secure_filename = file.filename.replace('/', "_").replace('\\', '_')
                filepath = os.path.join(current_app.config['UPLOAD_FOLDER'],  _uuid, secure_filename)
                
                if not os.path.exists(os.path.dirname(filepath)):
                    os.makedirs(os.path.dirname(filepath))
                file.save(filepath)
                ## Add Job to Queue
                job = q.enqueue_call(func=tikal_driver.export, args=(filepath,))
                ## Maybe mark job state in a redis-hash

                return jsonify({"success":True, "filename":file.filename, "uuid": _uuid })
            else:
                return jsonify({"success": False, "message": "File Type not supported yet!!"})
        else:
            return jsonify({"success": False, "message": "Corrupt File :( "})


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


"""
    Handles Computer Assisted Translation of a particular xliff file
"""
@blueprint.route('/translate/<uid>/<fileName>/', methods=['GET'])
def translate(uid, fileName):
    ##Check if the uid and filename exists
    if fileExists(uid, fileName):
        if(fileExists(uid, fileName+".po")):

            po = polib.pofile(os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName+".po"))
            valid_entries = [e for e in po if not e.obsolete]
            d = []
            for entry in valid_entries:
                if entry.msgid.strip() != "":
                    d.append({"src":entry.msgid,"tgt":entry.msgstr})

            return render_template('public/translate.html',\
                                fileName=fileName,
                                uid=uid,
                                PO = {'po':True, 'data':d}
                                )        
        else:
            return render_template('public/translate.html',\
                                fileName=fileName,
                                uid=uid,
                                PO = False
                                )
    else:
        return abort(404)


import subprocess

@blueprint.route('/preview', methods=['POST'])
def preview():
    data = request.json
    fileName = data['fileName']
    uid = data['uid']

    po = polib.POFile()
    for _d in data['data']:
        _msgid = _d['src']
        _msgstr = _d['tgt']

        entry = polib.POEntry(
            msgid=unicode(_msgid),
            msgstr=unicode(_msgstr),
        )
        po.append(entry)

    po.save(os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName+".po"))

    def returnFullPath(fileName):
        return os.path.join(current_app.config['UPLOAD_FOLDER'],  uid, fileName)

    ##ConvertFile :: TO-DO : Move this to tinkal-driver 
    cmd = ["pomerge", "-i", returnFullPath(fileName)+".po", "-t", returnFullPath(fileName)+".xlf", "-o", returnFullPath(fileName)+".xlf.new"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err

    cmd = ["mv", returnFullPath(fileName)+".xlf", returnFullPath(fileName)+".xlf.old"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err

    cmd = ["mv", returnFullPath(fileName)+".xlf.new", returnFullPath(fileName)+".xlf"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err


    newFileName = fileName.split(".")
    extension = newFileName.pop(-1)
    newFileName.append("out")
    newFileName.append(extension)
    newFileName = ".".join(newFileName)

    newPath = returnFullPath(fileName)
    newPath = newPath.split("/")[:-1]
    newPath.append(newFileName)
    newPath = "/".join(newPath)

    cmd = ["rm", newPath]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err  

    cmd = ["lib/okapi/tikal.sh", "-m", returnFullPath(fileName)+".xlf"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err
    newPath = "/" + "/".join(newPath.split("/")[1:])
    return newPath;