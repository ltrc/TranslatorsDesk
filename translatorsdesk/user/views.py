# -*- coding: utf-8 -*-
from flask import Blueprint, render_template
from flask.ext.login import login_required

blueprint = Blueprint("user", __name__, url_prefix='/users', static_folder="../static")


@blueprint.route("/account/", methods=['GET'])
@login_required
def account():
    return render_template("users/account.html")