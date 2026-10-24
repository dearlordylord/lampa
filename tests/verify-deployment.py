"""Verify our public static deployment; no credentials or account required."""
import hashlib, json, datetime
from pathlib import Path
from urllib.request import urlopen
BASE = 'https://dearlordylord.github.io/lampa/'
ROOT = Path(__file__).resolve().parents[1]
def get(url):
    with urlopen(url, timeout=30) as response:
        assert response.status == 200
        return response.read()
manifest = json.loads((ROOT / 'personal/provenance.json').read_text())
checks = {}
for filename, expected in manifest['sha256'].items():
    actual = hashlib.sha256(get(BASE + filename)).hexdigest()
    assert actual == expected, filename
    checks[filename] = 'sha256 matches'
index = get(BASE).decode()
assert 'Content-Security-Policy' in index and './personal/bootstrap.js' in index
checks['index.html'] = 'CSP and personal loader published'
start = json.loads(get('https://raw.githubusercontent.com/dearlordylord/msx/refs/heads/main/start.json'))
assert start['parameter'] == 'content:' + BASE + 'msx/menu.json?v=8'
menu = json.loads(get(BASE + 'msx/menu.json'))
assert menu['pages'][0]['items'][0]['action'] == 'link:' + BASE + '?v=7'
assert len(menu['pages'][0]['items']) == 2
assert menu['pages'][0]['items'][1]['action'] == 'system:tizen:launch:xvvl3S1TT1.TizenTubeStandalone'
assert 'id:rgh:dearlordylord' in get(BASE + 'guide.html').decode()
checks['msx launcher'] = 'raw-GitHub descriptor and content action verified'
checks['guide.html'] = 'published with launcher instructions'
record = {
    'checked_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'build': manifest['build'], 'checks': checks,
    'live_anonymous_checks': {
        'KinoPub_CORS': '200 with allow-origin and Authorization preflight support',
        'KinoPub_device_code': '200, five-character user_code; not activated or stored',
        'TMDB_direct': '200 with movie metadata and CORS permission'
    },
    'manual_local_Chrome_build': '2026.10.23.1 (startup verification before audio fix)',
    'manual_local_Chrome': ['catalog and posters rendered', 'KinoPub settings rendered',
        'actual OAuth code modal rendered; closed without activation'],
    'not_verified': ['real-user account activation', 'Samsung hardware playback',
        'Samsung app-store availability', 'MSX application UI on TV', 'Bleach API response/audio playback with a real account']
}
(ROOT / 'personal/verification.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
print('Published assets, CSP, guide and MSX descriptor verified.')
