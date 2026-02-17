from http.server import BaseHTTPRequestHandler
import json
import sys
import os
import subprocess

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        info = {
            "python_version": sys.version,
            "cwd": os.getcwd(),
            "ls_tmp": [],
            "pip_freeze": []
        }
        
        try:
            info["ls_tmp"] = os.listdir('/tmp')
        except Exception as e:
            info["ls_tmp"] = str(e)
            
        try:
            # Check installed packages
            result = subprocess.run([sys.executable, "-m", "pip", "freeze"], capture_output=True, text=True)
            info["pip_freeze"] = result.stdout.split('\n')
        except Exception as e:
            info["pip_freeze"] = str(e)

        self.wfile.write(json.dumps(info, indent=2).encode('utf-8'))
