'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const requests = [];
let cleared;
const video = { currentTime: 0, readyState: 0, muted: false, volume: 1, load() {}, play() { return Promise.resolve(); }, addEventListener() {} };
const label = {}, button = { focus() {} };
const window = { location: { hash: '#access=TEST-PRIVATE&audio=2', pathname: '/lampa/personal/player-probe.html', search: '' },
  history: { replaceState(a, b, url) { cleared = url; } }, localStorage: { getItem() { return null; } }, setInterval() {} };
function XHR() { requests.push(this); }
XHR.prototype.open = function (method, url) { this.method = method; this.url = url; };
XHR.prototype.setRequestHeader = function (name, value) { (this.headers ||= {})[name] = value; };
XHR.prototype.send = function (body) { this.body = body; };
const document = { getElementById: id => ({ video, status: label, play: button })[id], addEventListener() {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../personal/player-probe.js'), 'utf8'), { window, document, XMLHttpRequest: XHR, URL, URLSearchParams, Date });
assert.equal(cleared, window.location.pathname, 'credential fragment is removed before any requests');
const api = requests.find(r => r.method === 'GET');
assert.equal(api.url, 'https://api.service-kp.com/v1/items/18009');
assert.equal(api.headers.Authorization, 'Bearer TEST-PRIVATE');
api.status = 200;
api.responseText = JSON.stringify({ item: { seasons: [{ episodes: [{ audios: [{ index: 2, lang: 'jpn', codec: 'aac', channels: 2 }],
  files: [{ quality: '720p', url: { hls: 'https://cdn2cdn.com/SECRET-PATH/master-v1a1.m3u8?token=SECRET' } }] }] }] } });
api.onload();
assert.equal(video.src, 'https://cdn2cdn.com/SECRET-PATH/master-v1a2.m3u8?token=SECRET');
assert.equal(video.muted, false);
for (const report of requests.filter(r => r.method === 'POST')) {
  assert.ok(!report.body.includes('TEST-PRIVATE') && !report.body.includes('SECRET'));
  assert.equal(report.headers.Authorization, undefined);
}
const last = JSON.parse(requests.filter(r => r.method === 'POST').at(-1).body);
assert.equal(last.requested.lang, 'jpn');
assert.equal(last.environment.urlAudioSelected, true);
console.log('Native probe: dedicated Japanese URL, credential fragment cleared, Bearer only to API, no credentials/URLs in reports.');
