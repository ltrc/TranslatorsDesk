# -*- coding: utf-8 -*-
import os
import translatorsdesk.worker_functions as worker_functions

from flask import Blueprint, render_template, current_app, abort, request, jsonify
from flask.ext.login import login_required, current_user
from sqlalchemy import desc
from redis import Redis
from rq import Queue

from translatorsdesk.user.models import User, File

#TO-DO : Change this to a redis pool
redis_conn = Redis()
q = Queue(connection=redis_conn, default_timeout=300)

blueprint = Blueprint("user", __name__, url_prefix='/users', static_folder="../static")

def _can_user_access_file(uid, fileName, current_user):
    file = File.query.filter_by(uuid = uid, name = fileName).first()
    if not current_user.is_authenticated():
        return False
    else:
        if file.user_id != current_user.id:
            return False
    return True

@blueprint.route("/account/", methods=['GET'])
@login_required
def account():
	user_files = File.query.order_by(desc(File.created_at)).filter_by(user_id=current_user.id).all()
	files = []
	r_conn = Redis()
	for each in user_files:
		key = "state_"+each.uuid+"/"+each.name
		status = r_conn.lrange(key, 0, -1)
		if status < 0 or len(status) == 0:
			status = "Missing from Redis"
		else:
			status = status[0]
		files.append( (each.uuid, each.name, each.shareable, status, each.created_at.strftime("%I:%M%p &bull; %-d %B %Y")) )
	print files
	return render_template("users/account.html", files = files)


@blueprint.route("/file/delete", methods=['POST'])
@login_required
def delete_file():
	data = request.values
	uuid = data.get('uid', None)
	name = data.get('fileName', None)

	if not name or not uuid:
		return jsonify({"success": False, "message": "Data Missing"})

	if not _can_user_access_file(uuid, name, current_user):
		abort(403)

	file = File.query.filter_by(uuid = uuid, name = name).first()
	folder_path = os.path.join(current_app.config['UPLOAD_FOLDER'],  uuid)

	#REMOVE FROM REDIS DICT
	r_conn = Redis()
	state_key = "state_"+uuid+"/"+name
	sent_key = uuid+"/"+name+"_sents"
	if r_conn.exists(state_key):
		r_conn.delete(state_key)
	if r_conn.exists(sent_key):
		r_conn.delete(sent_key)

	#REMOVE FROM THE SERVER
	job = q.enqueue_call(func=worker_functions.delete_folder, args=(folder_path,) )

	#REMOVE FROM THE DB
	file.delete()
	return jsonify({"success": True, "message": name + " has been deleted"})


@blueprint.route("/file/share", methods=['POST'])
@login_required
def share_file():
	print request.values.get
	data = request.values
	uuid = data.get('uid', None)
	name = data.get('fileName', None)

	if not name or not uuid:
		return jsonify({"success": False, "message": "Data Missing"})

	if not _can_user_access_file(uuid, name, current_user):
		abort(403)

	file = File.query.filter_by(uuid = uuid, name = name).first()
	if file.shareable:
		file.update(shareable = False)
		return jsonify({"success": True, "message": name + " has been made private"})
	else:
		file.update(shareable = True)
		return jsonify({"success": True, "message": name + " has been made shareable"})
