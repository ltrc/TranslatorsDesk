import subprocess

def export(file):
	cmd = ["lib/okapi/tikal.sh", "-x", file]
	p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
							stderr=subprocess.PIPE,
							stdin=subprocess.PIPE)
	out, err = p.communicate()
	return out

def merge(xliff_file):
	cmd = ["lib/okapi/tikal.sh", "-m", xliff_file]
	p = subprocess.Popen(cmd, stdout = subprocess.PIPE,
							stderr=subprocess.PIPE,
							stdin=subprocess.PIPE)
	out, err = p.communicate()
	return out