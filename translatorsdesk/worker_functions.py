import subprocess
from rq import Queue
from redis import Redis

import urllib, urllib2
import sys
import json
import re
import polib

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

def translate(sentence, src, target, module_start, module_end, last_module):
  SERVER="http://pipeline.ilmt.iiit.ac.in"
  URI=SERVER+"/"+src+"/"+target+"/"+module_start+"/"+module_end+"/"
  values = {'input' : sentence.encode('utf-8'), 'params': {}}
  data = urllib.urlencode(values)
  req = urllib2.Request(URI, data)
  response = urllib2.urlopen(req)
  the_page = response.read()

  d = json.loads(the_page)
  sentence = []
  for l in d[last_module].split("\n"):
    _l = l.split("\t")
    try:
      if re.match('\d+.\d+', _l[0]):
        sentence.append(_l[1])
    except:
      pass 
  return " ".join(sentence)

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
        _entry['tgt'] = translate(_entry['src'],"hin","pan", "1", "23", "wordgenerator-23")
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

def process_input_file(file):
    extract_xliff(file, "hi", "pa")
    extract_po(file)
    translate_po(file, "hin", "pan")



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
