import subprocess

from redis import Redis
redis_conn = Redis()	

def export(file):
	redis_conn.set(file, "start")

	cmd = ["lib/okapi/tikal.sh", "-x", file]
	p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
							stderr=subprocess.PIPE,
							stdin=subprocess.PIPE)
	out, err = p.communicate()

	cmd = ["xliff2po", "-i", file+".xlf", "-o", file+".po"]
	p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
							stderr=subprocess.PIPE,
							stdin=subprocess.PIPE)
	out, err = p.communicate()

	redis_conn.set(file, "done")
	return out

def merge(xliff_file):
	cmd = ["lib/okapi/tikal.sh", "-m", xliff_file]
	p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
							stderr=subprocess.PIPE,
							stdin=subprocess.PIPE)
	out, err = p.communicate()
	return out