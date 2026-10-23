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
const window = { document: { querySelector: () => ({ currentTime: 10, volume: 1, muted: false, readyState: 4,
  webkitAudioDecodedByteCount: 123, currentSrc: 'SECRET-VIDEO-URL', error: { code: 3, message: 'SECRET-ERROR' } }) },
  clearInterval() {}, setInterval(cb) { tick = cb; return 1; },
  XMLHttpRequest: function () { this.open = (method, url) => { this.method = method; this.url = url; };
    this.setRequestHeader = () => {}; this.send = body => { requests.push({ method: this.method, url: this.url, body }); }; }
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
emit(player, 'start', { _kpVoice: { lang: 'jpn', codec: 'aac', index: 2, token: 'SECRET-TOKEN' }, url: 'https://cdn2cdn.com/SECRET-URL' });
now += 1000;
emit(events, 'tracks', { tracks: [{ lang: 'jpn', codec: 'aac', name: 'SECRET-NAME', url: 'SECRET-URL', selected: true }] });
const bodies = requests.filter(r => r.method === 'POST').map(r => r.body).join('\n');
assert.ok(bodies.includes('jpn') && bodies.includes('aac') && bodies.includes('123'));
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
