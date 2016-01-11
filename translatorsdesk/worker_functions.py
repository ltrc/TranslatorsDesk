import subprocess
from rq import Queue
from redis import Redis

import urllib, urllib2
import sys
from flask import json, jsonify
import re
import polib
import os
import ssfapi
from flask.ext.socketio import SocketIO, emit, join_room, leave_room, \
    close_room, disconnect
reload(sys)
sys.setdefaultencoding('utf8')


#TO-DO : Change this to a redis pool
redis_conn = Redis()
q = Queue(connection=redis_conn)

def get_redis_connection():
    return Redis()

def change_state(file, state):
    print "="*80, state

    r_conn = get_redis_connection()
    u_file = "/".join(file.split("/")[-2:])

    r_conn.lpush("state_"+u_file, state)


#=================================================================
# Process Input File

def save_text_file(file, data):
    change_state(file,"SAVING_TEXT_FILE")
    
    f = open(filepath, 'w')
    f.write(raw_text)
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


def tokenize(sentence, src, target):
  '''
    WARNING: THIS CHANGES THE INPUT FILE
    PARAGRAPHS ARE LOST!!!
    tokenize sentences using the first module
  '''
  SERVER="http://api.ilmt.iiit.ac.in"
  TOKENIZER_URI = SERVER+"/"+src+"/"+target+"/1/1/"
  values = {'input' : sentence.encode('utf-8'), 'params': {}}
  data = urllib.urlencode(values)
  req = urllib2.Request(TOKENIZER_URI, data)
  response = urllib2.urlopen(req)
  the_page = response.read()
  js = json.loads(the_page)
  ssf_data = ssfapi.Document(js['tokenizer-1'])
  sentences = []
  for tree in ssf_data.nodeList:
    sentences.append(tree.generateSentence())
  return sentences

def translate(sentence, src, target, module_start, module_end, last_module, chunker_module):

  print "TRANSLATE ENTERED"
  SERVER="http://api.ilmt.iiit.ac.in"
  URI=SERVER+"/"+src+"/"+target+"/"+module_start+"/"+module_end+"/"
  values = {'input' : sentence.encode('utf-8'), 'params': {}}

  data = urllib.urlencode(values)
  req = urllib2.Request(URI, data)
  response = urllib2.urlopen(req)
  the_page = response.read()

  d = json.loads(the_page)
  ssf_data = ssfapi.Document(d[last_module])
  sentence = ssf_data.nodeList[0].generateSentence()
  words = []
  for tree in ssf_data.nodeList:
    for chunk in tree.nodeList:
        for node in chunk.nodeList:
          if type(node) is ssfapi.Node:
            node.expand_af()
            words.append([node.getAttribute('name').replace('"', '\\"'), node.lex.replace('"', '\\"')])
          else:
            for n in node.nodeList:
              n.expand_af()
              words.append([n.getAttribute('name').replace('"', '\\"'), n.lex.replace('"', '\\"')])

  response = {}
  response['tgt'] = sentence.replace('"', '\\"')
  response['words'] = words

  return response



def get_call_api(url):
    response = urllib2.urlopen(url)
    return response.read()

def translate_po(file, src, target):

    #STORE META INFO
    meta = {}
    meta['src_lang'] = src
    meta['tgt_lang'] = target
    meta['entries'] = []

    po = polib.pofile(file+".po")
    valid_entries = [e for e in po if not e.obsolete]
    d = []
    for entry in valid_entries:
        if entry.msgid.strip() != "":
            d.append({"src":entry.msgid,"tgt":entry.msgstr})

    change_state(file, "TRANSLATING_PO_FILE")
    count = 1;
    for _entry in d:
        module_start = "1"
        SERVER="http://api.ilmt.iiit.ac.in"
        module_end = get_call_api(SERVER+"/"+src+"/"+target+"/")
        modules = get_call_api(SERVER+"/"+src+"/"+target+"/modules/")
        modules = modules.strip('[').strip(']').split(',')
        last_module = modules[-1].strip('"') + '-' + str(len(modules))
        chunker_index = modules.index("\"chunker\"")
        chunker_module = modules[chunker_index].strip('"')  + '-' + str(chunker_index+1)

        sents = tokenize(_entry['src'], src, target)
        para = []
        final = []
        for sent in sents:
          response = translate(sent, src, target, module_start, module_end, last_module, chunker_module)
          response['src'] = sent.replace('"', '\\"')
          para.append(response)
          final.append(response['tgt'])
        meta['entries'].append(para)
        _entry['tgt'] = ' '.join(final)
        
        change_state(file, "TRANSLATING_PO_FILE:::PROGRESS:::"+str(count)+"/"+str(len(d)))
        count += 1

    change_state(file, "TRANSLATING_PO_FILE:::COMPLETE")

    change_state(file, "GENERATING_TRANSLATED_PO_FILE")

    #SAVE META FILE
    meta_file = open(file+'.meta', 'w')
    meta_file.write(json.dumps(meta))
    meta_file.close()

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
    tgt_conv = src[:2]
    print "*"*80
    print src, tgt, src_conv, tgt_conv
    print "="*80

    extract_xliff(file, src_conv, tgt_conv)
    extract_po(file)
    translate_po(file, src, tgt)



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
    cmd = ["pomerge", "-i", file+".updated.po", "-t", file+".xlf", "-o", file+".xlf.new"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err	
    change_state(file,"MERGING_PO_WITH_XLIFF:::COMPLETE")    


def takeBackupOfOldXLFFile(file):
    change_state(file,"TAKING_BACKUP_OF_OLD_XLIFF")      
    #Move old xlf file to a new location and mark it as .old
    cmd = ["mv", file+".xlf", file+".xlf.old"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err
    change_state(file,"TAKING_BACKUP_OF_OLD_XLIFF:::COMPLETE")      


def moveNewXLFToCorrectLocation(file):
    change_state(file,"UPDATE_XLF")       
    #Move the newly generated xlf file to the expected location of xlf file
    cmd = ["mv", file+".xlf.new", file+".xlf"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err
    change_state(file,"UPDATE_XLF:::COMPLETE")           

def removeOldOutputFile(file):
    change_state(file,"REMOVE_OLD_OUTPUT")

    newPath = newFilePath(file)
    #Delete any old generated files, if present
    cmd = ["rm", newPath]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err     
    change_state(file,"REMOVE_OLD_OUTPUT:::COMPLETE")


def mergeTranslatedXLFFileWithDocument(file):
    change_state(file,"MERGE_TRANSLATED_XLIFF_FILE")

    #Merge translated xlf file with the doc
    cmd = ["lib/okapi/tikal.sh", "-m", file+".xlf"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err
    change_state(file,"MERGE_TRANSLATED_XLIFF_FILE:::COMPLETE")


def generateOutputFile(file, meta): 
	# file : fullpath of the file

    change_state(file, "BEGIN_PROCESSING_OF_FILE")

    f = open(file+'.meta', 'w')
    f.write(json.dumps(meta))
    f.close()
    
    mergePOFileWithXLF(file)
    takeBackupOfOldXLFFile(file)
    moveNewXLFToCorrectLocation(file)
    removeOldOutputFile(file)
    mergeTranslatedXLFFileWithDocument(file)

    newPath = newFilePath(file)
    publicly_accessible_path = "/" + "/".join(newPath.split("/")[1:])

    change_state(file, "OUTPUT_FILE_GENERATED:::"+publicly_accessible_path)
