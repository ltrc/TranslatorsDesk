import subprocess
from rq import Queue
from redis import Redis

import urllib, urllib2
import sys
import json
import re
import polib

import ssfapi

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

def store_lang(file, tgt_lang):
    print "="*80, tgt_lang
    r_conn = get_redis_connection()
    u_file = "/".join(file.split("/")[-2:])

    r_conn.lpush("lang_"+u_file, tgt_lang)

#=================================================================
# Process Input File

def extract_xliff(file, src, target):
    change_state(file,"EXTRACTING_XLIFF")
    store_lang(file, target)
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
  SERVER="http://pipeline.ilmt.iiit.ac.in"
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
  tokenize(sentence, src, target)
  SERVER="http://pipeline.ilmt.iiit.ac.in"
  URI=SERVER+"/"+src+"/"+target+"/"+module_start+"/"+module_end+"/"
  values = {'input' : sentence.encode('utf-8'), 'params': {}}
  data = urllib.urlencode(values)
  req = urllib2.Request(URI, data)
  response = urllib2.urlopen(req)
  the_page = response.read()

  d = json.loads(the_page)
  ssf_data = ssfapi.Document(d[last_module])
  words_dict = {}
  sentence = []
  try:
      print ssf_data.nodeList
      for tree in ssf_data.nodeList:
        for chunk in tree.nodeList:
            for node in chunk.nodeList:
                words_dict[node.lex] = node.name
                sentence.append(node.lex)
      sentence = " ".join(sentence)
  except:
    sentence = []
    for l in d[last_module].split("\n"):
        _l = l.split("\t")
        try:
            if re.match('\d+.\d+', _l[0]):
                if _l[1]!='((':
                    sentence.append(_l[1])
                    print "APPENDING "+_l[1]
                    words_dict[_l[0]] = [_l[1]]
        except:
            pass 
    sentence = " ".join(sentence)
    print d.keys()
    for l in d[chunker_module].split("\n"):
        _l = l.split("\t")
        try:
            if re.match('\d+.\d+', _l[0]):
                words_dict[_l[0]].append(_l[1])
        except:
            pass
  print "THIS:" 
  print words_dict  
  words = {}

  for each in words_dict.keys():
    try:                # FIX THIS
        print each, words_dict[each]
        words[words_dict[each][0]] = words_dict[each][1]
    except:
        pass

  print words
  print "====="
  response = {}
  response['sentence'] = sentence
  response['words'] = words
  response = json.dumps(response)
  response = response.replace('"', '\\"')     # Wah. 
  print response
  return response



def get_call_api(url):
    response = urllib2.urlopen(url)
    return response.read()

def translate_po(file, src, target):
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
        print modules
        last_module = modules[-1].strip('"') + '-' + str(len(modules))
        chunker_index = modules.index("\"chunker\"")
        chunker_module = modules[chunker_index].strip('"')  + '-' + str(chunker_index+1)
        print last_module


        _entry['tgt'] = translate(_entry['src'], src, target, module_start, module_end, last_module, chunker_module)
        
        change_state(file, "TRANSLATING_PO_FILE:::PROGRESS:::"+str(count)+"/"+str(len(d)))
        count += 1
    change_state(file, "TRANSLATING_PO_FILE:::COMPLETE")

    change_state(file, "GENERATING_TRANSLATED_PO_FILE")

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
    convert_html_namespace = {'Hindi' : 'hin', 'Panjabi' : 'pan', 'Urdu' : 'urd'}
    src = convert_html_namespace[src]
    tgt = convert_html_namespace[tgt]
    convert_api_namespace = {'hin' : 'hi', 'pan' : 'pa', 'urd' : 'ur'}
    src_conv = convert_api_namespace[src]
    tgt_conv = convert_api_namespace[tgt]
    print "*"*80
    print src, tgt, src_conv, tgt_conv
    print "="*80

    #TOKENIZE FILE IF TXT
    if file.split('.')[-1] == 'txt':
        f = open(file, 'r')
        data = f.read()
        f.close()
        tokenized_data = '\n'.join(tokenize(data, src, tgt))
        f = open(file, 'w')
        f.write(tokenized_data)
        f.close()

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


def generateOutputFile(file): 
	# file : fullpath of the file

    change_state(file, "BEGIN_PROCESSING_OF_FILE")

    mergePOFileWithXLF(file)
    takeBackupOfOldXLFFile(file)
    moveNewXLFToCorrectLocation(file)
    removeOldOutputFile(file)
    mergeTranslatedXLFFileWithDocument(file)

    newPath = newFilePath(file)
    publicly_accessible_path = "/" + "/".join(newPath.split("/")[1:])

    change_state(file, "OUTPUT_FILE_GENERATED:::"+publicly_accessible_path)
