from http.server import BaseHTTPRequestHandler
import json
import yt_dlp
import os
import tempfile
from urllib.parse import urlparse, parse_qs

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse query parameters
        query = parse_qs(urlparse(self.path).query)
        video_url = query.get('url', [None])[0]

        if not video_url:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Missing url parameter'}).encode('utf-8'))
            return

        try:
            # Configure yt-dlp
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
                'writeautomaticsub': True,
                'writesubtitles': True,
                'subtitleslangs': ['en', 'en-US', 'en-orig'],
                # Use /tmp for writable directory in Vercel lambda
                'outtmpl': os.path.join('/tmp', 'transcript-%(id)s'),
            }

            transcript_content = None

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                video_id = info['id']
                
                # We need to actually run the download to get the sub file
                # But 'skip_download' prevents video download
                ydl.download([video_url])
                
                # Check for generated VTT files in /tmp
                # yt-dlp appends language code, e.g. .en.vtt
                base_path = os.path.join('/tmp', f'transcript-{video_id}')
                
                potential_files = [
                    f"{base_path}.en.vtt",
                    f"{base_path}.en-US.vtt",
                    f"{base_path}.en-orig.vtt"
                ]
                
                # Also check just listing the dir in case of variations
                try:
                    all_files = os.listdir('/tmp')
                    # simple match for id
                    for f in all_files:
                        if f.startswith(f'transcript-{video_id}') and f.endswith('.vtt'):
                            potential_files.append(os.path.join('/tmp', f))
                except Exception as e:
                    print(f"Error listing /tmp: {e}")

                final_file = None
                for p in potential_files:
                    if os.path.exists(p):
                        final_file = p
                        break
                
                if final_file:
                    with open(final_file, 'r', encoding='utf-8') as f:
                        transcript_content = f.read()
                    # Clean up
                    try:
                        os.remove(final_file)
                    except:
                        pass
                else:
                    # Provide info about what happened
                    self.send_response(404)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'No transcript found for this video', 'video_id': video_id}).encode('utf-8'))
                    return

            if transcript_content:
                # Basic cleanup of VTT
                lines = transcript_content.split('\n')
                cleaned_lines = []
                unique_lines = set()
                
                for line in lines:
                    line = line.strip()
                    if (not line.startswith('WEBVTT') and 
                        not line.startswith('NOTE') and 
                        '-->' not in line and 
                        line != '' and 
                        not line.isdigit()):
                        
                        if line not in unique_lines:
                            unique_lines.add(line)
                            cleaned_lines.append(line)

                text_content = ' '.join(cleaned_lines)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'transcript': text_content[:15000]}).encode('utf-8'))
            else:
                 self.send_response(404)
                 self.send_header('Content-type', 'application/json')
                 self.end_headers()
                 self.wfile.write(json.dumps({'error': 'Failed to process transcript file'}).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
