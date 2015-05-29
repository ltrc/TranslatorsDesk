#!/usr/bin/env python
# -*- coding: utf-8 -*-

from gevent import monkey
monkey.patch_all()
import os
import sys
import subprocess
from flask import Flask, render_template, session, request
from flask.ext.script import Manager, Shell, Server
from flask_migrate import MigrateCommand

from flask.ext.socketio import SocketIO, emit, join_room, leave_room, \
    close_room, disconnect
from translatorsdesk.app import create_app
from translatorsdesk.user.models import User
from translatorsdesk.settings import DevConfig, ProdConfig
from translatorsdesk.database import db
from translatorsdesk.spellchecker import dictionaries as spellcheckers
import random, hashlib, json

import logging
logging.basicConfig()

if os.environ.get("TRANSLATORSDESK_ENV") == 'prod':
    app = create_app(ProdConfig)
else:
    app = create_app(DevConfig)
app.debug = True
socketio = SocketIO(app)
HERE = os.path.abspath(os.path.dirname(__file__))
TEST_PATH = os.path.join(HERE, 'tests')

"""
    Handles Socket.IO events 
    TODO : Move this block of code to a more appropriate location
"""
@socketio.on('translanslators_desk_echo', namespace='/td')
def test_message(message):
    emit('translanslators_desk_echo_response', message)

@socketio.on('translanslators_desk_get_word_suggesstion', namespace='/td')
def translanslators_desk_get_word_suggesstion(message):
    word = message['data'].encode('utf-8')
    lang = message['lang']
    # Check if its a supported language
    if lang in ['hi', 'en', 'te', 'ta', 'pa']:
        suggestions = spellcheckers[lang].suggest(word)
        emit("translanslators_desk_get_word_suggesstion_" \
            + hashlib.md5(word.lower()).hexdigest(), \
            json.dumps(suggestions))


@socketio.on('connect', namespace='/td')
def test_connect():
    emit('my response', {'data': 'Connected', 'count': 0})


@socketio.on('disconnect', namespace='/td')
def test_disconnect():
    print('Client disconnected')

def _make_context():
    """Return context dict for a shell session so you can access
    app, db, and the User model by default.
    """
    return {'app': app, 'db': db, 'User': User}    

manager = Manager(app)

@manager.command
def test():
    """Run the tests."""
    import pytest
    exit_code = pytest.main([TEST_PATH, '--verbose'])
    return exit_code

@manager.command
def run():
    socketio.run(app, use_reloader=True)

manager.add_command('shell', Shell(make_context=_make_context))
manager.add_command('db', MigrateCommand)

if __name__ == '__main__':
    manager.run()