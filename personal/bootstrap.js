/* Personal build: fixed local code, HTTPS services and no remote control. ES5. */
(function (w) {
  'use strict';
  var allowed = ['api.service-kp.com', 'api.themoviedb.org', 'image.tmdb.org',
    'cdn2cdn.com', 'cdn2site.com', 'digital-cdn.net', 'cdntogo.net'];
  function parsed(input) { return new URL(String(input), w.location.href); }
  function permitted(input) {
    var u = parsed(input);
    if (u.username || u.password) return false;
    if (u.origin === w.location.origin) return u.pathname.indexOf('/lampa/') === 0;
    if (u.protocol !== 'https:' || (u.port && u.port !== '443')) return false;
    return allowed.some(function (host) {
      return u.hostname === host || u.hostname.slice(-(host.length + 1)) === '.' + host;
    });
  }
  var originalOpen = w.XMLHttpRequest.prototype.open;
  var originalHeader = w.XMLHttpRequest.prototype.setRequestHeader;
  w.XMLHttpRequest.prototype.open = function (method, url) {
    var diagnostic = parsed(url).href === 'https://lens-information-art-tactics.trycloudflare.com/report';
    if (diagnostic && (String(method).toUpperCase() !== 'POST' || !w.KpAudioDiagnostics || !w.KpAudioDiagnostics.isActive())) throw new Error('Audio diagnostics are not enabled');
    if (!diagnostic && !permitted(url)) throw new Error('Personal build blocked an unapproved network host');
    this._personalHost = parsed(url).hostname;
    return originalOpen.apply(this, arguments);
  };
  w.XMLHttpRequest.prototype.setRequestHeader = function (name) {
    if (/^authorization$/i.test(name) && this._personalHost !== 'api.service-kp.com') {
      throw new Error('Personal build blocked credentials to an unapproved service');
    }
    return originalHeader.apply(this, arguments);
  };
  if (w.fetch) {
    var originalFetch = w.fetch;
    w.fetch = function (input, init) {
      var url = typeof input === 'string' || input instanceof URL ? input : input.url;
      if (!permitted(url)) return Promise.reject(new Error('Personal build blocked an unapproved network host'));
      // hls.js uses fetch for media. Account API uses guarded XMLHttpRequest.
      var headers = new Headers(init && init.headers || input && input.headers || {});
      if (headers.has('Authorization') && parsed(url).hostname !== 'api.service-kp.com') {
        return Promise.reject(new Error('Personal build blocked credentials to an unapproved service'));
      }
      return originalFetch.call(w, input, init);
    };
  }
  w.WebSocket = function () { throw new Error('Remote connections are disabled in this build'); };
  if (w.navigator.sendBeacon) w.navigator.sendBeacon = function () { return false; };
  // Keep existing login/history, but don't inherit cloud/source/plugin settings.
  w.localStorage.setItem('source', 'tmdb');
  w.localStorage.setItem('protocol', 'https');
  if (!w.localStorage.getItem('language')) w.localStorage.setItem('language', 'ru');
  if (!w.localStorage.getItem('tmdb_lang')) w.localStorage.setItem('tmdb_lang', 'ru');
  w.localStorage.setItem('proxy_tmdb', 'false');
  w.lampa_settings = { socket_use: false, socket_methods: false, account_use: false,
    account_sync: false, plugins_use: false, plugins_store: false, services: false,
    youtube: false, geo: false, mirrors: false, lang_use: false, torrents_use: false,
    feed: false, disable_features: { dmca: true, lgbt: true, reactions: true,
      discuss: true, ai: true, subscribe: true, blacklist: true, persons: true,
      ads: true, trailers: true, install_proxy: true, remote_configuration: true } };
  w.youtube_lazy_load = true;
})(window);
