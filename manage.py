#!/usr/bin/env python
# -*- coding: utf-8 -*-

from translatorsdesk.database import db as _db
from flask_wtf.csrf import CsrfProtect
from flask.ext.login import current_user

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
from translatorsdesk.user.models import User, File
from translatorsdesk.settings import DevConfig, ProdConfig
from translatorsdesk.database import db

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

from BigramSpellSuggestions import BigramSpellSuggestion


"""
    Handles Socket.IO events 
    TODO : Move this block of code to a more appropriate location
"""

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


@socketio.on('translators_desk_check_file_state', namespace='/td')
def translators_desk_check_file_state(message):
    r_conn = Redis()
    uid = message["uid"]
    fileName = message["fileName"]
    
    file = File.query.filter_by(uuid = uid, name = fileName).first()
    if not file.shareable:
        if not current_user.is_authenticated():
            emit('translators_desk_file_state_change', 'Not Authorized')
            return
        else:
            if file.user_id != current_user.id:
                emit('translators_desk_file_state_change', 'Not Authorized')
                return

    key = "state_"+uid+"/"+fileName
    _status = r_conn.lrange(key, 0, -1)
    # if _status > 0:
    emit('translators_desk_file_state_change', _status)


@socketio.on('translators_desk_get_translation_data', namespace='/td')
def translators_desk_get_translation_data(message):
    r_conn = Redis()
    uid = message["uid"]
    fileName = message["fileName"]

    file = File.query.filter_by(uuid = uid, name = fileName).first()
    if not file.shareable:
        if not current_user.is_authenticated():
            emit('translators_desk_file_state_change', 'Not Authorized')
            return
        else:
            if file.user_id != current_user.id:
                emit('translators_desk_file_state_change', 'Not Authorized')
                return

    key = uid+"/"+fileName+"_sents"
    _status = r_conn.lrange(key, 0, -1)
    if _status > 0:
        print _status
        r_conn.delete(key)
        emit('translators_desk_get_translation_data_response', json.dumps(_status))


@socketio.on('translators_desk_get_word_suggestion', namespace='/td')
def translators_desk_get_word_suggestion(message):
    print "REQUEST FOR SUGGESTION"
    bigram = [word.strip() for word in message['data']]
    word = bigram[-1]
    lang = message['lang']
    print bigram, lang
    if lang in ['hi', 'ur', 'en', 'te', 'ta', 'pa']:
        suggestions = { 'spellings' : [], 'synonyms' : [] }
        if lang != 'ur':
            if lang == 'hi':
                suggestions['spellings'] = context_suggestions['hi'].find_candidate_word_for_word_prediction(bigram)
            suggestions['spellings'].extend(spellcheckers[lang].suggest(word.encode('utf-8')))
        lang_dict = dictionaries[lang]
        id = lang_dict['words'].get(word, None)
        if id:
            suggestions['synonyms'] = lang_dict['ids'][id]
        print suggestions
        emit("translators_desk_get_word_suggestion_" \
            + hashlib.md5(word.lower()).hexdigest(), \
            json.dumps(suggestions))


@socketio.on('translators_desk_get_word_details', namespace='/td')
def translators_desk_get_word_details(message):
    print "REQUEST FOR DETAILS", message
    word = message['data'].strip()
    src = message['src']
    tgt = message['tgt']
    print word, src
    if src in ['hin', 'urd', 'pan']:
        details = { 'word': word, 'cat' : '', 'meaning' : '', 'example' : '', 'alternate' : []}
        lang_dict = dictionaries[src[:-1]]
        id = lang_dict['words'].get(word, None)
        synonyms = []
        if id:
            details['word'] = word
            details['cat'] = lang_dict['cat'][id]
            details['meaning'] = lang_dict['meaning'][id]
            details['example'] = lang_dict['example'][id]
            synonyms = lang_dict['ids'][id]

        #print parallel[src[:-1]][tgt[:-1]][ 'एक'.decode('utf-8') ]
        alternate = set()
        p = parallel[src[:-1]][tgt[:-1]].get(word.decode('utf-8'), None)
        print p
        if p:
            alternate.add(p)
        for each in synonyms:
            p = parallel[src[:-1]][tgt[:-1]].get(each.decode('utf-8'), None)
            if p:
                alternate.add(p)

        tgt_lang_dict = dictionaries[tgt[:-1]]
        for alt in alternate:
            id = tgt_lang_dict['words'].get(alt, None)
            if id:
                alternate = alternate.union(set(tgt_lang_dict['ids'][id]))

        details['alternate'] = list(alternate)

        print details
        emit("translators_desk_get_word_details_" \
            + hashlib.md5(word.lower()).hexdigest(), \
            json.dumps(details))


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

    synonyms = {}
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

    synonyms['hi'] = hindi
    synonyms['ur'] = urdu
    synonyms['pa'] = pan

    context_suggestions = {}
    context_suggestions['hi'] = BigramSpellSuggestion()

    f = open('translatorsdesk/static/dictionaries/hin_urd.parallel', 'r')
    parallel ={ 'hi' : {}, 'ur' : {} }
    parallel['hi']['ur'], parallel['ur']['hi'] = json.loads(f.read())
    # print parallel['hi']['ur']['बेहयाई'.decode('utf-8')]
    # for each in parallel['hi']['ur']:
    #     print each, parallel['hi']['ur'][each]

    return (dictionaries, synonyms, context_suggestions, parallel)

spellcheckers, dictionaries, context_suggestions, parallel = load_dictionaries()
print "DICTIONARIES LOADED"
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
