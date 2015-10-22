import subprocess
from rq import Queue
from redis import Redis

#TO-DO : Change this to a redis pool
redis_conn = Redis()
q = Queue(connection=redis_conn)


#=================================================================
# Process Input File

def extract_xliff(file):
	cmd = ["lib/okapi/tikal.sh", "-x", file]
	p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
							stderr=subprocess.PIPE,
							stdin=subprocess.PIPE)
	out, err = p.communicate()

def extract_po(file):
	cmd = ["xliff2po", "-i", file+".xlf", "-o", file+".po"]
	p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
							stderr=subprocess.PIPE,
							stdin=subprocess.PIPE)
	out, err = p.communicate()	


def process_input_file(file):
	# redis_conn.set(file, "start")
	extract_xliff(file)
	extract_po(file)
	# redis_conn.set(file, "done")

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
    newPath.append(newFileName)
    newPath = "/".join(newPath)

    return newPath

def mergePOFileWithXLF(file):
		#Merge PO file onto XLIFF File
    cmd = ["pomerge", "-i", file+".po", "-t", file+".xlf", "-o", file+".xlf.new"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err	

def takeBackupOfOldXLFFile(file):
    #Move old xlf file to a new location and mark it as .old
    cmd = ["mv", file+".xlf", file+".xlf.old"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err

def moveNewXLFToCorrectLocation(file):
    #Move the newly generated xlf file to the expected location of xlf file
    cmd = ["mv", file+".xlf.new", file+".xlf"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err

def removeOldOutputFile(file):
    newPath = newFilePath(file)
    #Delete any old generated files, if present
    cmd = ["rm", newPath]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err     

def mergeTranslatedXLFFileWithDocument(file):
    #Merge translated xlf file with the doc
    cmd = ["lib/okapi/tikal.sh", "-m", file+".xlf"]
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            stdin=subprocess.PIPE)
    out, err = p.communicate()
    print cmd, out, err

def generateOutputFile(file):
		# file : fullpath of the file

		mergePOFileWithXLF(file)
		takeBackupOfOldXLFFile(file)
		moveNewXLFToCorrectLocation(file)
		removeOldOutputFile(file)
		mergeTranslatedXLFFileWithDocument(file)

		newPath = newFilePath(file)
		publicly_accessible_path = "/" + "/".join(newPath.split("/")[1:])
 

def merge(xliff_file):
	cmd = ["lib/okapi/tikal.sh", "-m", xliff_file]
	p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
							stderr=subprocess.PIPE,
							stdin=subprocess.PIPE)
	out, err = p.communicate()
