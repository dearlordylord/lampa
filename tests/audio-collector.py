"""Temporary write-only telemetry sink, bound to loopback. Never accepts commands."""
import argparse
import datetime
import json
import re
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ORIGIN = 'https://dearlordylord.github.io'

def numeric(value):
    return value if type(value) in (int, float) and -1e15 < value < 1e15 else None

def tag(value):
    return value if isinstance(value, str) and re.fullmatch(r'[a-zA-Z0-9_.+ -]{1,48}', value) else ''

def audio(value):
    if not isinstance(value, dict):
        return None
    return {**{k: numeric(value.get(k)) for k in ('index', 'channels', 'sampleRate')},
            **{k: tag(value.get(k)) for k in ('lang', 'codec')}, 'selected': value.get('selected') is True}

def sanitize(value):
    if not isinstance(value, dict) or value.get('event') not in ('enabled', 'start', 'tracks', 'error', 'canplay', 'loadeddata', 'sample', 'destroy', 'manifest'):
        raise ValueError('invalid report')
    result = {'received_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'event': value['event'], 'build': tag(value.get('build')),
              'requested': audio(value.get('requested')), 'nativeState': tag(value.get('nativeState'))}
    codecs = value.get('manifestCodecs', [])
    result['manifestCodecs'] = [tag(c) for c in codecs[:20]] if isinstance(codecs, list) else []
    result['manifestStatus'] = numeric(value.get('manifestStatus'))
    error = value.get('error', {})
    result['error'] = {'code': numeric(error.get('code')), 'fatal': error.get('fatal') is True} if isinstance(error, dict) else None
    for key in ('tracks', 'nativeTracks'):
        entries = value.get(key, [])
        result[key] = [audio(t) for t in entries[:40] if isinstance(t, dict)] if isinstance(entries, list) else []
    video = value.get('video', {})
    if not isinstance(video, dict):
        video = {}
    result['video'] = {k: numeric(video.get(k)) for k in ('time', 'readyState', 'errorCode', 'volume', 'decodedAudioBytes')}
    result['video']['muted'] = video.get('muted') is True
    return result

def handler_for(output, ttl=7200):
    deadline = time.monotonic() + ttl
    class Handler(BaseHTTPRequestHandler):
        count = 0
        def log_message(self, *_):
            pass
        def answer(self, status):
            self.send_response(status)
            self.send_header('Access-Control-Allow-Origin', ORIGIN)
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', '0')
            self.end_headers()
        def do_GET(self):
            self.answer(404)
        def do_OPTIONS(self):
            self.answer(204 if self.path == '/report' and self.headers.get('Origin') == ORIGIN else 403)
        def do_POST(self):
            if time.monotonic() > deadline:
                return self.answer(410)
            if self.path != '/report' or self.headers.get('Origin') != ORIGIN:
                return self.answer(403)
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.answer(415)
            try:
                length = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                return self.answer(400)
            if not 0 < length <= 16384:
                return self.answer(413)
            if Handler.count >= 900:
                return self.answer(429)
            self.connection.settimeout(5)
            try:
                report = sanitize(json.loads(self.rfile.read(length)))
            except (ValueError, OSError):
                return self.answer(400)
            Handler.count += 1
            with output.open('a', encoding='utf8') as stream:
                stream.write(json.dumps(report, ensure_ascii=False) + '\n')
            self.answer(204)
    return Handler

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=18765)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--ttl-seconds', type=int, default=7200)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler_for(args.output, ttl=args.ttl_seconds))
    print('Write-only audio collector listening on loopback; lifetime seconds: ' + str(args.ttl_seconds), flush=True)
    server.serve_forever()
