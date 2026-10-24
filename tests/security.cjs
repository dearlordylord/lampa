const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('app.min.js');
const calls = [];
class XHR {
  open(method, url) { calls.push({ method, url }); }
  setRequestHeader(name, value) { calls[calls.length - 1][name] = value; }
}
const values = new Map([['kp_token', 'test-token'], ['plugins', '["https://evil.test/plugin.js"]']]);
const window = { location: new URL('https://dearlordylord.github.io/lampa/'), XMLHttpRequest: XHR,
  fetch: async (url, init) => { calls.push({ url, init }); return 'ok'; }, navigator: {},
  localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) } };
vm.runInNewContext(read('personal/bootstrap.js'), { window, URL, Headers, Promise });
for (const url of ['https://evil.test/', 'https://api.service-kp.com.evil.test/',
  'http://api.service-kp.com/', 'https://cub.best/api/', 'https://kinopub.fastcdn.pics/health',
  'https://user:pass@api.service-kp.com/', 'https://api.service-kp.com:8443/',
  'https://dearlordylord.github.io/unrelated/plugin.js']) {
  assert.throws(() => new XHR().open('GET', url), /blocked/);
}
assert.equal(calls.length, 0, 'unapproved requests must not reach the transport');
const api = new XHR(); api.open('GET', 'https://api.service-kp.com/v1/user');
api.setRequestHeader('Authorization', 'Bearer test-token');
assert.equal(calls[0].Authorization, 'Bearer test-token');
const cdn = new XHR(); cdn.open('GET', 'https://a.cdntogo.net/master.m3u8');
assert.throws(() => cdn.setRequestHeader('Authorization', 'Bearer test-token'), /blocked/);
new XHR().open('GET', 'https://api.themoviedb.org/3/search/movie');
assert.equal(values.get('kp_token'), 'test-token', 'bootstrap must preserve account token');
assert.equal(values.get('source'), 'tmdb');
assert.throws(() => new window.WebSocket('wss://cub.best'), /disabled/);
assert.equal(window.lampa_settings.account_use, false);
assert.equal(window.lampa_settings.disable_features.remote_configuration, true);

const socket = source.slice(source.indexOf('  var localSocketId'), source.indexOf('\n  var timer$4;'));
const sockContext = { Utils$1: { uid: () => 'local' }, Subscribe$2: () => ({}), WebSocket() { throw new Error('transport constructed'); } };
vm.runInNewContext(socket, sockContext);
sockContext.Socket.init(); sockContext.Socket.send('terminal_eval', { code: '', eval: 'malicious' });
assert.equal(sockContext.Socket.terminalAccess(), false);
assert.equal(/terminal_eval|terminal_activate|new WebSocket|\beval\(/.test(source), false, 'remote execution removed from delivered artifact');
const plugStart = source.indexOf('  var localPluginsLoaded');
const plugEnd = source.indexOf('\n  /**', plugStart);
const loaded = [];
const plugContext = { Utils$1: { putScriptAsync(urls, done, error, success) { loaded.push(...urls); success(); done(); } }, Noty: { show() {} } };
vm.runInNewContext(source.slice(plugStart, plugEnd), plugContext);
plugContext.Plugins.add({ url: 'https://evil.test/steal.js', status: 1 });
plugContext.Plugins.push({ url: 'https://evil.test/steal.js' });
plugContext.Plugins.task(() => {}); plugContext.Plugins.load(() => {});
assert.deepEqual(loaded, ['./plugins/kinopub.js?v=personal-6']);
assert.equal(plugContext.Plugins.loaded()[0], 'kinopub');
const html = read('index.html');
assert.ok(html.includes('Content-Security-Policy'));
assert.ok(!html.includes("'unsafe-eval'") && !html.includes("script-src 'self' 'unsafe-inline'"));
assert.ok(!/<script[^>]*src=["']https?:/i.test(html));
assert.ok(read('vender/jquery/jquery.js').includes('jQuery JavaScript Library v3.7.1'));
const provenance = JSON.parse(read('personal/provenance.json'));
for (const [file, expected] of Object.entries(provenance.sha256)) {
  assert.equal(crypto.createHash('sha256').update(read(file)).digest('hex'), expected, 'pinned asset hash: ' + file);
}
(async () => {
  await assert.rejects(window.fetch('https://evil.test/'), /blocked/);
  await assert.rejects(window.fetch('https://cdn2cdn.com/key', { headers: { Authorization: 'Bearer secret' } }), /blocked/);
  assert.equal(await window.fetch('https://cdn2cdn.com/master.m3u8'), 'ok');
  console.log('Security checks passed: network allowlist, credential destinations, no socket/remote eval, one local plugin, CSP and pinned dependency.');
})().catch(error => { console.error(error); process.exitCode = 1; });
