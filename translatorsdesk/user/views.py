# -*- coding: utf-8 -*-
from flask import Blueprint, render_template
from flask.ext.login import login_required, current_user
from translatorsdesk.user.models import User, File
from redis import Redis

blueprint = Blueprint("user", __name__, url_prefix='/users', static_folder="../static")


@blueprint.route("/account/", methods=['GET'])
@login_required
def account():
	user_files = File.query.filter_by(user_id=current_user.id).all()
	files = []
	r_conn = Redis()
	for each in user_files:
		key = "state_"+each.uuid+"/"+each.name
		status = r_conn.lrange(key, 0, -1)
		if status < 0:
			status = "Missing from Redis"
		else:
			status = status[0]
		files.append( (each.uuid, each.name, each.shareable, status) )
	print files
	return render_template("users/account.html", files = files)