'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
let now = Number(read('personal/diagnostics.js').match(/var expires = (\d+)/)[1]) - 3600000, button, tick;
const requests = [], events = {}, player = {};
const listen = store => ({ follow(name, cb) { (store[name] ||= []).push(cb); } });
const emit = (store, name, data) => (store[name] || []).forEach(cb => cb(data));
const window = { Hls: { ErrorDetails: { MANIFEST_LOAD_ERROR: 'manifestLoadError' } }, document: { querySelector: () => ({ currentTime: 10, volume: 1, muted: false, readyState: 4,
  webkitAudioDecodedByteCount: 123, currentSrc: 'SECRET-VIDEO-URL', error: { code: 3, message: 'SECRET-ERROR' } }) },
  clearInterval() {}, setInterval(cb) { tick = cb; return 1; },
  XMLHttpRequest: function () { this.open = (method, url) => { this.method = method; this.url = url; };
    this.setRequestHeader = () => {}; this.send = body => { requests.push({ method: this.method, url: this.url, body, xhr: this }); }; }
};
vm.runInNewContext(read('personal/diagnostics.js'), { window, Date: { now: () => now }, isFinite, JSON, Number, String });
window.KpAudioDiagnostics.attach({ SettingsApi: { addParam(value) { button = value; } }, Noty: { show() {} },
  Player: { listener: listen(player) }, PlayerVideo: { listener: listen(events) } });
emit(player, 'start', { _kpVoice: { lang: 'jpn', codec: 'aac' }, url: 'SECRET-VIDEO-URL' });
assert.equal(requests.length, 0, 'disabled by default, including manifest reads');
button.onChange();
assert.equal(window.KpAudioDiagnostics.isActive(), true);
assert.equal(requests.length, 1);
now += 1000;
const currentPlay = { _kpFormat: 'hls4', _kpVoice: { lang: 'jpn', codec: 'aac', index: 2, token: 'SECRET-TOKEN' }, url: 'https://cdn2cdn.com/SECRET-URL' };
emit(player, 'start', currentPlay);
now += 1000;
const manifestRequest = requests.find(r => r.method === 'GET').xhr;
manifestRequest.status = 200;
manifestRequest.responseText = '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="02. SECRET",LANGUAGE="jpn",URI="https://SECRET"\n#EXT-X-STREAM-INF:BANDWIDTH=100,CODECS="avc1.640028,mp4a.40.2"\nhttps://SECRET';
manifestRequest.onload();
now += 1000;
currentPlay._kpFormat = 'hls';
emit(events, 'error', { code: 4, fatal: true, error: 'details [manifestLoadError] fatal [true] SECRET' });
now += 1000;
emit(events, 'tracks', { tracks: [{ lang: 'jpn', codec: 'aac', name: 'SECRET-NAME', url: 'SECRET-URL', selected: true }] });
const bodies = requests.filter(r => r.method === 'POST').map(r => r.body).join('\n');
assert.ok(bodies.includes('jpn') && bodies.includes('aac') && bodies.includes('123'));
assert.ok(bodies.includes('manifestLoadError') && bodies.includes('hls4') && bodies.includes('\"streamFormat\":\"hls\"'));
assert.ok(bodies.includes('\"variantCount\":1') && bodies.includes('\"index\":2'));
assert.ok(!bodies.includes('SECRET'), 'no URL, token, track name or error message in telemetry');
now += 16 * 60 * 1000;
const before = requests.length;
tick();
assert.equal(window.KpAudioDiagnostics.isActive(), false);
assert.equal(requests.length, before, 'upload stops after 15 minutes');

const opened = [], values = new Map();
function XHR() {}
XHR.prototype.open = function (method, url) { opened.push({ method, url }); };
XHR.prototype.setRequestHeader = function () {};
const guarded = { location: new URL('https://dearlordylord.github.io/lampa/'), XMLHttpRequest: XHR, navigator: {},
  localStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) } };
vm.runInNewContext(read('personal/bootstrap.js'), { window: guarded, URL });
const endpoint = requests[0].url;
assert.throws(() => new XHR().open('POST', endpoint), /not enabled/);
guarded.KpAudioDiagnostics = { isActive: () => true };
assert.throws(() => new XHR().open('GET', endpoint), /not enabled/);
new XHR().open('POST', endpoint);
assert.throws(() => new XHR().setRequestHeader('Authorization', 'Bearer SECRET'), /blocked/);
assert.throws(() => new XHR().open('POST', endpoint + '/commands'), /blocked/);
assert.equal(opened.length, 1);
console.log('Audio telemetry: opt-in, bounded lifetime, real codec/counters, no secrets; exact POST-only destination.');

// Preserve the media error code before Lampa's existing fallback listener
// destroys the failed element and removes its error property.
const app = read('app.min.js');
const bind = app.indexOf('  function bind$3()');
const errorStart = app.indexOf("    _video.addEventListener('error', function (e) {", bind);
const errorEnd = app.indexOf('    }); // прогресс буферизации', errorStart);
const callback = app.slice(errorStart, errorEnd).slice(app.slice(errorStart).indexOf('function (e)'));
let delivered;
const failedVideo = { error: { code: 4, message: '' } };
vm.runInNewContext('(' + callback + '})({})', { _video: failedVideo,
  Lang: { translate: name => name }, listener$c: { send(name, data) { delivered = data; failedVideo.error = null; } } });
assert.equal(delivered.code, 4);
assert.equal(delivered.fatal, true);
console.log('Native error code survives fallback cleanup; HLS reason is limited to known enum values.');
