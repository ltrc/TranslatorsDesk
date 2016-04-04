import subprocess
from rq import Queue
from redis import Redis
from flask import json, jsonify
import urllib, urllib2
import sys
import re
import polib
import os
import shutil
import threading
import ssfapi

from flask.ext.socketio import SocketIO, emit, join_room, leave_room, close_room, disconnect

from time import time

reload(sys)
sys.setdefaultencoding('utf8')

NO_OF_THREADS = 5

#TO-DO : Change this to a redis pool
redis_conn = Redis()
q = Queue(connection=redis_conn)

def get_redis_connection():
    return Redis()

def change_state(file, state):
    print "="*80, state
    r_conn = get_redis_connection()
    key = "state_" + "/".join(file.split("/")[-2:])
    _status = r_conn.lrange(key, 0, -1)
    if _status < 0 or len(_status) == 0:
        r_conn.lpush(key, state)
    elif _status[0] == state:
        return
    r_conn.lpush(key, state)

def add_sentence_to_file(file, sent):
    r_conn = get_redis_connection()
    key = "/".join(file.split("/")[-2:]) + "_sents"
    r_conn.lpush(key, sent)

def remove_file_sents(file):
    r_conn = get_redis_connection()
    key = "/".join(file.split("/")[-2:]) + "_sents"
    r_conn.expire(key, 60*60*24)

#=================================================================
# Process Input File

def save_text_file(file, data):
    change_state(file,"SAVING_TEXT_FILE")
    f = open(file, 'w')
    f.write(data)
    f.close()
    change_state(file,"SAVING_TEXT_FILE:::COMPLETE")

def extract_xliff(file, src, target):
    change_state(file,"EXTRACTING_XLIFF")

    cmd = ["lib/okapi/tikal.sh", "-x", file, "-sl", src, "-tl", target]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
							stderr=subprocess.PIPE,
							stdin=subprocess.PIPE)
    out, err = p.communicate()
    change_state(file,"EXTRACTING_XLIFF:::COMPLETE")


def extract_po(file):
    change_state(file,"EXTRACTING_PO")

    cmd = ["xliff2po", "-i", file+".xlf", "-o", file+".po"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
							stderr=subprocess.PIPE,
							stdin=subprocess.PIPE)
    out, err = p.communicate()	
    change_state(file,"EXTRACTING_PO:::COMPLETE")    

def delete_folder(path):
    shutil.rmtree(path)

def tokenize(sentence, src, target):
  SERVER="http://pipeline.ilmt.iiit.ac.in"
  TOKENIZER_URI = SERVER+"/"+src+"/"+target+"/1/1/"
  values = {'input' : sentence.encode('utf-8'), 'params': {}}
  data = urllib.urlencode(values)
  req = urllib2.Request(TOKENIZER_URI, data)
  the_page = get_call_api(req)
  if not the_page:
    return False
  js = json.loads(the_page)
  ssf_data = ssfapi.Document(js['tokenizer-1'])
  sentences = []
  for tree in ssf_data.nodeList:
    sentences.append(tree.generateSentence())
  return sentences

def translate(sentence, src, target, module_start, module_end, last_module, chunker_module):
  SERVER="http://pipeline.ilmt.iiit.ac.in"
  URI=SERVER+"/"+src+"/"+target+"/"+module_start+"/"+module_end+"/"
  values = {'input' : sentence.encode('utf-8'), 'params': {}}

  response = { 'tgt': '', 'words': [] }

  data = urllib.urlencode(values)
  req = urllib2.Request(URI, data)
  the_page = get_call_api(req)

  if not the_page:
    return response

  d = json.loads(the_page)
  print "TRANSLATE ENTERED"
  try:
    ssf_data = ssfapi.Document(d[last_module])
    sentence = ssf_data.nodeList[0].generateSentence()
  except:
    print "*****SSF ERROR*****"
    print d[last_module]
    return response
    
  words = []
  for tree in ssf_data.nodeList:
    for chunk in tree.nodeList:
        for node in chunk.nodeList:
          if type(node) is ssfapi.Node:
            node.expand_af()
            words.append([node.getAttribute('name').replace('\\', '\\\\').replace('"', '\\"'), node.lex.replace('\\', '\\\\').replace('"', '\\"')])
          else:
            for n in node.nodeList:
              n.expand_af()
              words.append([n.getAttribute('name').replace('\\', '\\\\').replace('"', '\\"'), n.lex.replace('\\', '\\\\').replace('"', '\\"')])

  response['tgt'] = sentence.replace('"', '\\"')
  response['words'] = words
  return response

#CHANGE FILE STATE WHEN PIPELINE IS DOWN ASK USER USER TO RETRY
def get_call_api(url):
    tries = 5
    error = None
    while(tries > 0):
        try:    
            response = urllib2.urlopen(url, timeout = 5)
            return response.read()
        except Exception as e:
            print e
            tries -= 1
            error = e
    return False


def translate_po(file, src='', target=''):

    #STORE META INFO
    META_EXISTS = False
    if os.path.exists(file+'.meta'):
        meta_file = open(file+'.meta', 'r')
        meta = json.loads(meta_file.read())
        meta_file.close()
        src = meta['src_lang']
        target = meta['tgt_lang']
        if meta['entries']:
            META_EXISTS = True
    else:
        meta = {}
        meta['src_lang'] = src
        meta['tgt_lang'] = target
        meta['entries'] = []
        meta_file = open(file+'.meta', 'w')
        meta_file.write(json.dumps(meta))
        meta_file.close()

    po = polib.pofile(file+".po")
    valid_entries = [e for e in po if not e.obsolete]
    d = []
    for entry in valid_entries:
        if entry.msgid.strip() != "":
            d.append({"src":entry.msgid,"tgt":entry.msgstr})

    count = 1;
    module_start = "1"

    SERVER="http://api.ilmt.iiit.ac.in"
    module_end = get_call_api(SERVER+"/"+src+"/"+target+"/")
    if not module_end:
        change_state(file, "PIPELINE_ERROR")
        return False
    modules = get_call_api(SERVER+"/"+src+"/"+target+"/modules/")
    if not modules:
        change_state(file, "PIPELINE_ERROR")
        return False
    modules = modules.strip('[').strip(']').split(',')
    last_module = modules[-1].strip('"') + '-' + str(len(modules))
    chunker_index = modules.index("\"chunker\"")
    chunker_module = modules[chunker_index].strip('"')  + '-' + str(chunker_index+1)

    #DIVIDE THE LOAD ACCROSS THREADS
    THREAD_DATA = []
    for x in xrange(0, NO_OF_THREADS):
        THREAD_DATA.append([])
    sent_count = 0
    para_count = 0
    for _entry in d:
        sents = tokenize(_entry['src'], src, target)
        if not sents:
            change_state(file, "PIPELINE_ERROR")
            return False
        if not META_EXISTS:
            meta['entries'].append({})
        for sent in sents:
            if META_EXISTS and meta['entries'][para_count][str(sent_count)]['tgt']:
                sent_count += 1
                continue
            index = sent_count%NO_OF_THREADS
            THREAD_DATA[index].append( (sent, para_count, str(sent_count)) )
            if not META_EXISTS:
                meta['entries'][para_count][str(sent_count)] = {'src': sent.replace('"', '\\"'), 'tgt': '', 'words': []}
            sent_count += 1
        para_count += 1

    #SAVE META FILE BEFORE TRANSLATION
    if not META_EXISTS:
        meta_file = open(file+'.meta', 'w')
        meta_file.write(json.dumps(meta))
        meta_file.close()
    change_state(file, "TRANSLATING_PO_FILE:::BEGIN")

    #EXECUTE THREADS
    FAILURE = [False]
    def worker(sentences, FAILURE):
        for sent in sentences:
            response = translate(sent[0], src, target, module_start, module_end, last_module, chunker_module)
            if not response['tgt']:
                change_state(file, "PIPELINE_ERROR")
                print "FAILED"
                FAILURE[0] = True
            else:
                add_sentence_to_file(file, json.dumps([sent[1], sent[2], response['words']]))
            print "SRC:", sent[0]
            print "TGT:", response['tgt']
            meta['entries'][sent[1]][sent[2]]['tgt'] = response['tgt']
            meta['entries'][sent[1]][sent[2]]['words'] = response['words']

    THREADS = []
    for i in xrange(NO_OF_THREADS):
        t = threading.Thread(target = worker, args = (THREAD_DATA[i], FAILURE) )
        THREADS.append(t)
        t.start()

    #JOIN THREADS
    for t in THREADS:
        t.join()

    for para_no in xrange(len(meta['entries'])):
        d[para_no]['tgt'] = ' '.join( [each[1]['tgt'] for each in sorted(meta['entries'][para_no].items(), key=lambda x: int(x[0])) ] )

    #SAVE META FILE AFTER TRANSLATION
    meta_file = open(file+'.meta', 'w')
    meta_file.write(json.dumps(meta))
    meta_file.close()

    #EXPIRE FILE_SENTS KEY IN 24 HOURS
    remove_file_sents(file)

    if not FAILURE[0]:
        change_state(file, "TRANSLATING_PO_FILE:::COMPLETE")
        change_state(file, "GENERATING_TRANSLATED_PO_FILE:::BEGIN")

        po = polib.POFile()
        for _d in d:
            _msgid = _d['src']
            _msgstr = _d['tgt']

            entry = polib.POEntry(
                msgid=unicode(_msgid),
                msgstr=unicode(_msgstr),
            )
            po.append(entry)

        po.save(file+".po")
        change_state(file, "GENERATING_TRANSLATED_PO_FILE:::COMPLETE")    

def process_input_file(file, src, tgt):
    #convert_html_namespace = {'Hindi' : 'hin', 'Panjabi' : 'pan', 'Urdu' : 'urd'}
    src = src[:3].lower()
    tgt = tgt[:3].lower()
    #convert_api_namespace = {'hin' : 'hi', 'pan' : 'pa', 'urd' : 'ur'}
    src_conv = src[:2]
    tgt_conv = tgt[:2]
    print "*"*80
    print src, tgt, src_conv, tgt_conv
    print "="*80
    starttime = time()
    extract_xliff(file, src_conv, tgt_conv)
    extract_po(file)
    translate_po(file, src, tgt)
    endtime = time()
    print "TOTAL TIME TAKEN : ", endtime-starttime



#=================================================================

#Generate Output file

def newFilePath(fileName):
    newFileName = fileName.split(".")
    extension = newFileName.pop(-1)
    newFileName.append("out")
    newFileName.append(extension)
    newFileName = ".".join(newFileName)

    newPath = fileName
    newPath = newPath.split("/")[:-1]
    newPath.append(newFileName.split("/")[-1])
    newPath = "/".join(newPath)

    return newPath

def mergePOFileWithXLF(file):
    change_state(file,"MERGING_PO_WITH_XLIFF")    
	#Merge PO file onto XLIFF File
    cmd = ["pomerge", "-i"+file+".updated.po", "-t"+file+".xlf", "-o"+file+".xlf.new"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err	
    #change_state(file,"MERGING_PO_WITH_XLIFF:::COMPLETE")    


def takeBackupOfOldXLFFile(file):
    change_state(file,"TAKING_BACKUP_OF_OLD_XLIFF")      
    #Move old xlf file to a new location and mark it as .old
    cmd = ["mv", file+".xlf", file+".xlf.old"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    #print cmd, out, err
    #change_state(file,"TAKING_BACKUP_OF_OLD_XLIFF:::COMPLETE")      


def moveNewXLFToCorrectLocation(file):
    change_state(file,"UPDATE_XLF")       
    #Move the newly generated xlf file to the expected location of xlf file
    cmd = ["mv", file+".xlf.new", file+".xlf"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    #print cmd, out, err
    #change_state(file,"UPDATE_XLF:::COMPLETE")           

def removeOldOutputFile(file):
    change_state(file,"REMOVE_OLD_OUTPUT")

    newPath = newFilePath(file)
    #Delete any old generated files, if present
    cmd = ["rm", newPath]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    #print cmd, out, err     
    #change_state(file,"REMOVE_OLD_OUTPUT:::COMPLETE")


def mergeTranslatedXLFFileWithDocument(file):
    change_state(file,"MERGE_TRANSLATED_XLIFF_FILE")

    #Merge translated xlf file with the doc
    cmd = ["lib/okapi/tikal.sh", "-m", file+".xlf"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    #print cmd, out, err
    #change_state(file,"MERGE_TRANSLATED_XLIFF_FILE:::COMPLETE")

def saveTranslationChanges(file, corrections):
    #UPDATE META DATA
    print "SAVING META", corrections
    if not corrections:
        return False
    print "corrections:", corrections
    meta_file = open(file+".meta", 'r')
    meta = json.loads(meta_file.read())
    meta_file.close()
    print corrections
    for c in corrections:
        meta['entries'][int(c[0])][str(c[1])]['tgt'] = c[2]
    f = open(file+'.meta', 'w')
    f.write(json.dumps(meta))
    f.close()

def generateOutputFile(file, corrections): 
    # change_state(file, "BEGIN_PROCESSING_OF_FILE")
    #UPDATE META DATA
    saveTranslationChanges(file, corrections)
    meta_file = open(file+".meta", 'r')
    meta = json.loads(meta_file.read())
    meta_file.close()

    #UPDATE PO FILE
    po = polib.pofile(file+".po")
    valid_entries = [e for e in po if not e.obsolete]
    d = []
    for entry in valid_entries:
        if entry.msgid.strip() != "":
            d.append({"src":entry.msgid,"tgt":entry.msgstr})
    po = polib.POFile()
    i = 0
    while i in xrange(len(meta['entries'])):
        target = ' '.join([each[1]['tgt'] for each in sorted(meta['entries'][i].items())])
        print target
        
        _msgid = d[i]['src']
        _msgstr = target

        entry = polib.POEntry(
            msgid=unicode(_msgid),
            msgstr=unicode(_msgstr),
        )
        po.append(entry)
        i += 1
    po.save(file+".updated.po")

    mergePOFileWithXLF(file)
    takeBackupOfOldXLFFile(file)
    moveNewXLFToCorrectLocation(file)
    removeOldOutputFile(file)
    mergeTranslatedXLFFileWithDocument(file)

    newPath = newFilePath(file)
    publicly_accessible_path = "/" + "/".join(newPath.split("/")[1:])
    change_state(file, "OUTPUT_FILE_GENERATED:::"+publicly_accessible_path)
    print "OUTPUT_FILE_GENERATED:::"+publicly_accessible_path