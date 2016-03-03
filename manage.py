#!/usr/bin/env python
# -*- coding: utf-8 -*-

from translatorsdesk.database import db as _db
from flask_wtf.csrf import CsrfProtect

from gevent import monkey
monkey.patch_all()
import os
import aspell
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
# from translatorsdesk.spellchecker import dictionaries as spellcheckers
import random, hashlib, json, base64
import urllib, urllib2
import json
import logging
logging.basicConfig()
from rq import Queue
from redis import Redis

if os.environ.get("TRANSLATORSDESK_ENV") == 'prod':
    app = create_app(ProdConfig)
else:
    app = create_app(DevConfig)

csrf = CsrfProtect(app)

app.debug = True
socketio = SocketIO(app)
HERE = os.path.abspath(os.path.dirname(__file__))
TEST_PATH = os.path.join(HERE, 'tests')
spellcheckers = {}



"""
    Handles Socket.IO events 
    TODO : Move this block of code to a more appropriate location
"""

@socketio.on('translators_desk_check_file_state', namespace='/td')
def translators_desk_check_file_state(message):
    r_conn = Redis()
    uid = message["uid"]
    fileName = message["fileName"]
    key = "state_"+uid+"/"+fileName
    _status = r_conn.lrange(key, 0, -1)
    # if _status > 0:
    emit('translators_desk_file_state_change', _status)

@socketio.on('translators_desk_get_lang_pairs', namespace='/td')
def translators_desk_get_lang_pairs():
    r_conn = Redis()
    url = 'http://api.ilmt.iiit.ac.in/langpairs'
    req = urllib2.Request(url)
    response = urllib2.urlopen(req)
    result = response.read()
    print result
    r_conn.set( "language_pairs", result)
    emit('translators_desk_get_lang_pairs_response', result)

@socketio.on('translators_desk_get_translation_data', namespace='/td')
def translators_desk_get_translation_data(message):
    r_conn = Redis()
    uid = message["uid"]
    fileName = message["fileName"]
    key = uid+"/"+fileName+"_sents"
    _status = r_conn.lrange(key, 0, -1)
    if _status > 0:
        print _status
        r_conn.delete(key)
        emit('translators_desk_get_translation_data_response', json.dumps(_status))

@socketio.on('translators_desk_get_word_suggestion', namespace='/td')
def translators_desk_get_word_suggestion(message):
    print "REQUEST FOR SUGGESTION"
    word = message['data'].strip()
    lang = message['lang']
    print word, lang
    # Check if its a supported language
    print spellcheckers

    if lang in ['hi', 'ur', 'en', 'te', 'ta', 'pa']:
        suggestions = { 'spellings' : [], 'synonyms' : [] }
        if lang != 'ur':
            suggestions['spellings'] = spellcheckers[lang].suggest(word.encode('utf-8'))
        if lang == 'hi':
            id = hindi_dict['words'].get(word, None)
            if id:
                suggestions['synonyms'] = hindi_dict['ids'][id]
        elif lang == 'ur':
            id = urdu_dict['words'].get(word, None)
            if id:
                suggestions['synonyms'] = urdu_dict['ids'][id]
        elif lang == 'pa':
            id = pan_dict['words'].get(word, None)
            if id:
                suggestions['synonyms'] = pan_dict['ids'][id]

        # suggestions['synonyms'] = [synonym for synonym in suggestions['synonyms'] if synonym != word]
        print suggestions
        emit("translators_desk_get_word_suggestion_" \
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

def load_dictionaries():
    en = aspell.Speller(('lang', 'en'), ('encoding', 'utf-8'))
    hi = aspell.Speller(('lang', 'hi'), ('encoding', 'utf-8'))
    te = aspell.Speller(('lang', 'te'), ('encoding', 'utf-8'))
    ta = aspell.Speller(('lang', 'ta'), ('encoding', 'utf-8'))
    pa = aspell.Speller(('lang', 'pa'), ('encoding', 'utf-8'))
    # en = aspell.Speller('lang', 'en')
    # hi = aspell.Speller('lang', 'hi') #Removing aspell-hi temporarily because of some funny error on Ubuntu
    # te = aspell.Speller('lang', 'te')
    # ta = aspell.Speller('lang', 'ta')
    # pa = aspell.Speller('lang', 'pa')
    dictionaries = {}
    dictionaries['en'] = en
    dictionaries['hi'] = hi
    dictionaries['te'] = te
    dictionaries['ta'] = ta
    dictionaries['pa'] = pa

    f = open('translatorsdesk/static/dictionaries/hin.dict', 'r')
    hindi = {}
    hindi['words'], hindi['ids'], hindi['cat'], hindi['meaning'], hindi['example'] = json.loads(f.read())
    f.close()
    f = open('translatorsdesk/static/dictionaries/urd.dict', 'r')
    urdu = {}
    urdu['words'], urdu['ids'], urdu['cat'], urdu['meaning'], urdu['example'] = json.loads(f.read())
    f.close()
    f = open('translatorsdesk/static/dictionaries/pan.dict', 'r')
    pan = {}
    pan['words'], pan['ids'], pan['cat'], pan['meaning'], pan['example'] = json.loads(f.read())
    f.close()

    return (dictionaries, hindi, urdu, pan)

spellcheckers, hindi_dict, urdu_dict, pan_dict = load_dictionaries()
manager = Manager(app)

@manager.command
def test():
    """Run the tests."""
    import pytest
    exit_code = pytest.main([TEST_PATH, '--verbose'])
    return exit_code

@manager.command
def run():
    socketio.run(app, host="0.0.0.0", port=6001, use_reloader=True)

manager.add_command('shell', Shell(make_context=_make_context))
manager.add_command('db', MigrateCommand)

if __name__ == '__main__':
    _db.app = app
    with app.app_context():
        _db.create_all()
    manager.run()
