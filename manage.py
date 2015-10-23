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
import random, hashlib, json, base64
import urllib, urllib2
import json
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

@socketio.on('translators_desk_get_translation_query', namespace='/td')
def translators_desk_get_translation_query(message):
    print message
    url = 'http://pipeline.ilmt.iiit.ac.in/hin/pan/'+str(message["start"])+'/'+str(message["end"])+'/' # TODO: Hardcoded languages. Fix either the values in ILMT pipeline or the values in Translators Desk.
    values = {'input' : message["data"].encode('utf-8')}
    data = urllib.urlencode(values)
    req = urllib2.Request(url, data)
    response = urllib2.urlopen(req)
    the_page = response.read()
    result = {"type": message["type"], "sentence_id": message["sentence_id"], "result": the_page}
    emit('translators_desk_get_translation_response', json.dumps(result))

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

@socketio.on('spell_check_cache_query', namespace='/td')
def spell_check_cache_query(message):
    word_list = message['data']
    lang = message['lang']
    word_list = json.loads(word_list)
    error_list = []
    for word in word_list:
        word = word.encode('utf-8')
        word = word.strip()
        if not spellcheckers[lang].check(word):
            error_list.append(word)
    emit("spell_check_cache_query_response", json.dumps(error_list));

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
    socketio.run(app, host="0.0.0.0", port=6000, use_reloader=True)

manager.add_command('shell', Shell(make_context=_make_context))
manager.add_command('db', MigrateCommand)

if __name__ == '__main__':
    manager.run()
