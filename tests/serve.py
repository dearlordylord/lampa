"""Local-only static preview: python3 tests/serve.py (Ctrl-C to stop)."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def translate_path(self, path):
        if path.startswith('/lampa/'):
            path = path[len('/lampa'):]
        return super().translate_path(path)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
