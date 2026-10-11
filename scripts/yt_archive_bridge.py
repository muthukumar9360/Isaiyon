"""
YouTube to Archive.org Bridge Script & Local Automation Server
---------------------------------------------------------------
Endpoints:
1. POST /api/extract-info
   - Fetches YouTube metadata without downloading.
   - Automatically extracts Movie Name, Song Title, Actors/Cast, Composer, Singers, Genre.
   - Returns editable fields to the frontend UI so you can preview & edit.

2. POST /api/upload-track
   - Takes the confirmed/edited metadata.
   - Downloads high-quality audio & thumbnail via yt-dlp (using node js runtime & android client).
   - Uploads to Archive.org in your exact folder structure:
       [project_identifier]/
         └── [Movie_Name]/
              └── [Song_Name]/
                   ├── [Song_Name].mp4
                   └── [Song_Name].jpg
   - Returns permanent streaming URL & Archive.org inspect link.
"""

import os
import sys
import json
import re
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
import yt_dlp
import internetarchive as ia

BASE_DIR = os.path.dirname(__file__)
DOWNLOADS_DIR = os.path.join(BASE_DIR, "downloads")
CONFIG_FILE = os.path.join(BASE_DIR, "ia_config.json")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

DEFAULT_PROJECT_IDENTIFIER = "muthuramalingam_a-vault"

def get_ia_credentials():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "access_key": "sftYc6GkCtNMjk7H",
        "secret_key": "lR6TOMtJUAnE7tZg",
        "project_identifier": DEFAULT_PROJECT_IDENTIFIER
    }

def slugify(text):
    if not text:
        return "soundtrack"
    clean = re.sub(r'[^\w\s\-]', '', text).strip()
    clean = re.sub(r'[-\s]+', '_', clean)
    return clean[:45] or "soundtrack"

def parse_rich_metadata(info):
    title = info.get('title', '')
    desc = info.get('description', '')
    uploader = info.get('uploader') or info.get('artist') or ''
    duration = info.get('duration') or 0
    thumbnail_url = info.get('thumbnail') or ''

    movie = info.get('album') or ''
    song = info.get('track') or ''
    actors = ''
    composer = info.get('composer') or ''
    singers = info.get('artist') or ''
    lyrics = ''
    genre = info.get('genre') or 'Soundtrack'

    # Description parsing for Movie
    movie_match = re.search(r'(?:Movie|Film|Album)\s*[:\-]\s*([^\n\r,\(]+)', desc, re.I)
    if movie_match:
        movie = movie_match.group(1).strip()
    elif not movie:
        split_patterns = [r'\|\s*([^\n\r\|]+)', r'-\s*([^\n\r\-]+)', r'From\s+["\']?([^"\',\n\r]+)["\']?']
        for pat in split_patterns:
            m = re.search(pat, title, re.I)
            if m:
                cand = m.group(1).strip()
                if not any(k in cand.lower() for k in ['video', 'audio', 'lyric', 'official', 'full song', 'tamil']):
                    movie = cand
                    break

    # Song title extraction
    song_match = re.search(r'(?:Song|Track)\s*[:\-]\s*([^\n\r,\(]+)', desc, re.I)
    if song_match:
        song = song_match.group(1).strip()
    elif not song:
        base_title = re.split(r'[\-\|\(\[]', title)[0].strip()
        song = base_title or title

    # Cast / Actors
    cast_match = re.search(r'(?:Starring|Cast|Actors?)\s*[:\-]\s*([^\n\r]+)', desc, re.I)
    if cast_match:
        actors = cast_match.group(1).strip()

    # Music Director / Composer
    music_match = re.search(r'(?:Music|Composer|Music Director)\s*[:\-]\s*([^\n\r,]+)', desc, re.I)
    if music_match:
        composer = music_match.group(1).strip()
    elif not composer or composer.lower() in ['music director', 'soundtrack', '']:
        known_composers = [
            (r'A\.?\s*R\.?\s*Rahman|AR\s*Rahman', 'A. R. Rahman'),
            (r'Harris\s*Jayaraj', 'Harris Jayaraj'),
            (r'Yuvan\s*Shankar\s*Raja|Yuvan', 'Yuvan Shankar Raja'),
            (r'Anirudh\s*Ravichander|Anirudh', 'Anirudh Ravichander'),
            (r'Ilaiyaraaja|Ilayaraja|Ilaiyaraja', 'Ilaiyaraaja'),
            (r'D\.?\s*Imman|Imman', 'D. Imman'),
            (r'Santhosh\s*Narayanan', 'Santhosh Narayanan'),
            (r'G\.?\s*V\.?\s*Prakash', 'G. V. Prakash Kumar'),
            (r'Deva', 'Deva'),
            (r'Vidyasagar', 'Vidyasagar'),
            (r'Sirpy', 'Sirpy')
        ]
        full_text = title + " " + desc
        for pat, cname in known_composers:
            if re.search(r'\b' + pat + r'\b', full_text, re.I):
                composer = cname
                break

    # Cast / Actors
    cast_match = re.search(r'(?:Starring|Cast|Actors?)\s*[:\-]\s*([^\n\r]+)', desc, re.I)
    if cast_match:
        actors = cast_match.group(1).strip()
    elif not actors or actors.lower() in ['featured stars', 'featured cast', '']:
        known_actors = [
            'Ajith Kumar', 'Ajith', 'Thalapathy Vijay', 'Vijay', 'Suriya', 'Dhanush',
            'Sivakarthikeyan', 'Vikram', 'Rajinikanth', 'Kamal Haasan', 'Tabu',
            'Aishwarya Rai', 'Nayanthara', 'Trisha', 'Samantha', 'Simran', 'Jyothika',
            'Sneha', 'Laila', 'Manisha Koirala', 'Raghuvaran', 'Prashanth', 'Madhavan'
        ]
        found_actors = []
        full_text = title + " " + desc
        for aname in known_actors:
            if re.search(r'\b' + re.escape(aname) + r'\b', full_text, re.I):
                # Avoid duplicate like Ajith and Ajith Kumar
                if not any(aname in f for f in found_actors):
                    found_actors.append(aname)
        if found_actors:
            actors = ", ".join(found_actors[:4])

    # Singers
    singers_match = re.search(r'(?:Singers?|Vocals?|Artist)\s*[:\-]\s*([^\n\r,]+)', desc, re.I)
    if singers_match:
        singers = singers_match.group(1).strip()
    elif not singers:
        singers = uploader

    # Lyrics
    lyrics_match = re.search(r'(?:Lyrics|Lyricist)\s*[:\-]\s*([^\n\r,]+)', desc, re.I)
    if lyrics_match:
        lyrics = lyrics_match.group(1).strip()

    # Genre / Mood
    genre_match = re.search(r'(?:Genre)\s*[:\-]\s*([^\n\r,]+)', desc, re.I)
    if genre_match:
        genre = genre_match.group(1).strip()

    # Auto detect mood
    mood = "Melody Hits"
    lower_text = (title + " " + desc).lower()
    if any(k in lower_text for k in ['sad', 'pain', 'failure', 'breakup', 'heartbreak', 'death', 'tear']):
        mood = "Love Failure"

    if not movie:
        movie = "Tamil Cinema Hits"

    return {
        'id': info.get('id', 'track'),
        'title': song,
        'movie': movie,
        'artist': singers or "Various Artists",
        'actors': actors or "Featured Stars",
        'composer': composer or "Music Director",
        'lyricist': lyrics,
        'genre': genre,
        'mood': mood,
        'duration': duration,
        'thumbnailUrl': thumbnail_url,
        'videoUrl': info.get('webpage_url') or f"https://www.youtube.com/watch?v={info.get('id')}"
    }

def extract_info_only(youtube_url):
    ydl_opts = {'quiet': True, 'extract_flat': False}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        return parse_rich_metadata(info)

def download_audio_and_thumb(youtube_url, vid_id):
    out_template = os.path.join(DOWNLOADS_DIR, f"{vid_id}.%(ext)s")
    
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--extractor-args", "youtube:player_client=android,web",
        "-f", "ba/b",
        "--write-thumbnail",
        "-o", out_template,
        youtube_url
    ]
    
    print(f"[*] Executing download: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)

    # Find audio
    audio_file = None
    for f in os.listdir(DOWNLOADS_DIR):
        if f.startswith(vid_id) and not f.endswith(('.jpg', '.webp', '.png', '.part')):
            audio_file = os.path.join(DOWNLOADS_DIR, f)
            break

    # Find thumb
    thumb_file = None
    for ext in ['.jpg', '.webp', '.png']:
        candidate = os.path.join(DOWNLOADS_DIR, f"{vid_id}{ext}")
        if os.path.exists(candidate):
            thumb_file = candidate
            break

    return audio_file, thumb_file

def upload_to_archive_nested(audio_path, thumb_path, movie_name, song_title, metadata_dict, project_identifier=None):
    creds = get_ia_credentials()
    proj_id = project_identifier or creds.get('project_identifier') or DEFAULT_PROJECT_IDENTIFIER

    movie_slug = slugify(movie_name)
    song_slug = slugify(song_title)

    ext_audio = os.path.splitext(audio_path)[1] or '.mp4'
    audio_remote_path = f"{movie_slug}/{song_slug}/{song_slug}{ext_audio}"
    
    files_map = {
        audio_remote_path: audio_path
    }

    if thumb_path and os.path.exists(thumb_path):
        ext_thumb = os.path.splitext(thumb_path)[1] or '.jpg'
        thumb_remote_path = f"{movie_slug}/{song_slug}/{song_slug}{ext_thumb}"
        files_map[thumb_remote_path] = thumb_path
    else:
        thumb_remote_path = None

    print(f"[*] Uploading to Archive.org Item: '{proj_id}'")
    print(f"[*] Remote nested paths: {list(files_map.keys())}")

    session = ia.get_session({
        's3': {
            'access': creds['access_key'],
            'secret': creds['secret_key']
        }
    })
    item = session.get_item(proj_id)

    archive_meta = {
        'title': f"Isaiyon Music Vault - {movie_name}",
        'mediatype': 'audio',
        'collection': 'opensource_audio',
        'creator': metadata_dict.get('composer') or metadata_dict.get('artist') or "Tamil Cinema",
        'description': f"Song: {song_title} | Movie: {movie_name} | Cast: {metadata_dict.get('actors')} | Music: {metadata_dict.get('composer')}"
    }

    item.upload(files_map, metadata=archive_meta, verbose=True)

    direct_audio_url = f"https://archive.org/download/{proj_id}/{audio_remote_path}"
    direct_thumb_url = f"https://archive.org/download/{proj_id}/{thumb_remote_path}" if thumb_remote_path else metadata_dict.get('thumbnailUrl')
    archive_details_url = f"https://archive.org/details/{proj_id}"

    return {
        'success': True,
        'identifier': proj_id,
        'audioUrl': direct_audio_url,
        'coverUrl': direct_thumb_url,
        'archiveDetailsUrl': archive_details_url,
        'remoteAudioPath': audio_remote_path
    }

class BridgeHTTPHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/status':
            creds = get_ia_credentials()
            self.send_response(200)
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'server': 'running',
                'hasCredentials': bool(creds.get('access_key')),
                'projectIdentifier': creds.get('project_identifier') or DEFAULT_PROJECT_IDENTIFIER
            }).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body) if body else {}
            except Exception as json_err:
                self.send_response(400)
                self._set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f'Invalid JSON payload: {str(json_err)}'}).encode('utf-8'))
                return

            # 1. Preview / Extract Info endpoint (fast, download=False)
            if self.path == '/api/extract-info':
                url = data.get('url')
                if not url:
                    self.send_response(400)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Missing YouTube URL'}).encode('utf-8'))
                    return
                try:
                    info = extract_info_only(url)
                    self.send_response(200)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': True, 'data': info}).encode('utf-8'))
                except Exception as e:
                    self.send_response(500)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

            # 2. Confirm & Upload endpoint
            elif self.path == '/api/upload-track':
                url = data.get('url')
                vid_id = data.get('id') or 'video'
                movie = data.get('movie') or 'Singles'
                title = data.get('title') or 'Unknown Title'
                proj_id = data.get('projectIdentifier') or DEFAULT_PROJECT_IDENTIFIER

                if not url:
                    self.send_response(400)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Missing URL'}).encode('utf-8'))
                    return

                try:
                    audio_file, thumb_file = download_audio_and_thumb(url, vid_id)
                    
                    # If custom thumbnail provided, override downloaded thumb
                    if data.get('customCoverBase64'):
                        import base64
                        c_b64 = data['customCoverBase64']
                        if ',' in c_b64:
                            c_b64 = c_b64.split(',', 1)[1]
                        custom_thumb = os.path.join(DOWNLOADS_DIR, f"{vid_id}_custom.jpg")
                        with open(custom_thumb, 'wb') as f:
                            f.write(base64.b64decode(c_b64))
                        thumb_file = custom_thumb

                    res = upload_to_archive_nested(audio_file, thumb_file, movie, title, data, proj_id)
                    
                    # Combine original edited metadata with uploaded URLs
                    full_result = {
                        **data,
                        **res
                    }

                    self.send_response(200)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(full_result).encode('utf-8'))
                except Exception as e:
                    self.send_response(500)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

            # 3. Update / Replace Cover Thumbnail in Archive.org
            elif self.path == '/api/update-cover':
                movie = data.get('movie') or 'Singles'
                title = data.get('title') or 'Unknown Title'
                image_base64 = data.get('imageBase64')
                custom_url = data.get('coverUrl')
                proj_id = data.get('projectIdentifier') or DEFAULT_PROJECT_IDENTIFIER

                movie_slug = slugify(movie)
                song_slug = slugify(title)
                remote_thumb_path = f"{movie_slug}/{song_slug}/{song_slug}.jpg"
                temp_thumb = os.path.join(DOWNLOADS_DIR, f"temp_{song_slug}_{int(time.time())}.jpg")

                if image_base64:
                    import base64
                    if ',' in image_base64:
                        image_base64 = image_base64.split(',', 1)[1]
                    img_bytes = base64.b64decode(image_base64)
                    with open(temp_thumb, 'wb') as f:
                        f.write(img_bytes)
                elif custom_url:
                    import urllib.request
                    urllib.request.urlretrieve(custom_url, temp_thumb)
                else:
                    self.send_response(400)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'No image provided'}).encode('utf-8'))
                    return

                try:
                    creds = get_ia_credentials()
                    session = ia.get_session({
                        's3': {
                            'access': creds['access_key'],
                            'secret': creds['secret_key']
                        }
                    })
                    item = session.get_item(proj_id)
                    item.upload({remote_thumb_path: temp_thumb}, verbose=True)

                    direct_thumb_url = f"https://archive.org/download/{proj_id}/{remote_thumb_path}?t={int(time.time())}"
                    
                    self.send_response(200)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'success': True,
                        'coverUrl': direct_thumb_url,
                        'remotePath': remote_thumb_path
                    }).encode('utf-8'))
                except Exception as e:
                    self.send_response(500)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                finally:
                    if os.path.exists(temp_thumb):
                        try:
                            os.remove(temp_thumb)
                        except Exception:
                            pass
            else:
                self.send_response(404)
                self.end_headers()
        except Exception as top_err:
            self.send_response(500)
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(top_err)}).encode('utf-8'))

if __name__ == "__main__":
    port = 5001
    server = HTTPServer(('127.0.0.1', port), BridgeHTTPHandler)
    print(f"[*] Local Bridge running on http://127.0.0.1:{port}")
    server.serve_forever()
