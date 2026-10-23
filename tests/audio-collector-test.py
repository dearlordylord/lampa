import importlib.util
import json
import tempfile
import threading
import urllib.error
import urllib.request
from pathlib import Path
from http.server import ThreadingHTTPServer

spec = importlib.util.spec_from_file_location('collector', Path(__file__).with_name('audio-collector.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

with tempfile.TemporaryDirectory() as folder:
    output = Path(folder) / 'reports.jsonl'
    server = ThreadingHTTPServer(('127.0.0.1', 0), collector.handler_for(output))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:' + str(server.server_port)
    def request(path, data=None, origin=collector.ORIGIN, method=None):
        req = urllib.request.Request(base + path, data=data, method=method,
              headers={'Origin': origin, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req) as response:
                assert response.read() == b''
                return response.status
        except urllib.error.HTTPError as error:
            return error.code
    payload = json.dumps({'event': 'sample', 'token': 'SECRET', 'url': 'SECRET',
        'requested': {'lang': 'jpn', 'codec': 'aac', 'token': 'SECRET'},
        'video': {'decodedAudioBytes': 1000, 'currentSrc': 'SECRET'}}).encode()
    assert request('/report', payload) == 204
    assert request('/report', payload, origin='https://evil.test') == 403
    assert request('/report', b'x' * 20000) == 413
    assert request('/report', b'{') == 400
    assert request('/report', b'{"event":"eval","code":"SECRET"}') == 400
    assert request('/report') == 404
    text = output.read_text()
    assert 'SECRET' not in text and 'jpn' in text and '1000' in text
    assert len(text.splitlines()) == 1
    server.shutdown()
    server.server_close()
print('Collector: write-only, origin-limited, bounded input; unknown fields and secrets discarded.')
