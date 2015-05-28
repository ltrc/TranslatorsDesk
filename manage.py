#!/usr/bin/env python
# -*- coding: utf-8 -*-

from gevent import monkey
monkey.patch_all()
import os
import sys
import subprocess
from flask import Flask, render_template, session, request
from flask_script import Manager, Shell, Server
from flask_migrate import MigrateCommand
from flask.ext.socketio import SocketIO, emit, join_room, leave_room, \
    close_room, disconnect
from translatorsdesk.app import create_app
from translatorsdesk.user.models import User
from translatorsdesk.settings import DevConfig, ProdConfig
from translatorsdesk.database import db

import logging
logging.basicConfig()

if os.environ.get("TRANSLATORSDESK_ENV") == 'prod':
    app = create_app(ProdConfig)
else:
    app = create_app(DevConfig)

socketio = SocketIO(app)
HERE = os.path.abspath(os.path.dirname(__file__))


"""
    Handles Socket.IO events 
    TODO : Move this block of code to a more appropriate location
"""
@socketio.on('translanslators_desk_echo', namespace='/td')
def test_message(message):
    emit('translanslators_desk_echo_response', message)

@socketio.on('connect', namespace='/td')
def test_connect():
    emit('my response', {'data': 'Connected', 'count': 0})


@socketio.on('disconnect', namespace='/td')
def test_disconnect():
    print('Client disconnected')


if __name__ == '__main__':
    socketio.run(app, use_reloader=True)
