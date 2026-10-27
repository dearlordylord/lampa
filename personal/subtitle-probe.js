(function () {
  'use strict';
  var EXPIRES = 1793116665321;
  var endpoint = 'https://tires-biz-encounter-either.trycloudflare.com/report';
  var api = 'https://api.service-kp.com/v1';
  var returnUrl = 'https://dearlordylord.github.io/lampa/?v=7';
  var allowed = ['cdn2cdn.com', 'cdn2site.com', 'digital-cdn.net', 'cdntogo.net'];
  var token = '', stopped = false, requests = [], deadline;
  var label = document.getElementById('status');

  function numeric(value) {
    var number = Number(value);
    return isFinite(number) && number >= 0 && number <= 1000000000 ? number : 0;
  }
  function episodeId(episode) {
    return numeric(episode.id || episode.media_id) || ({ 1: 1037581, 2: 1037632 })[episode.number] || 0;
  }
  function tag(value) {
    return typeof value === 'string' && /^[a-zA-Z0-9_.+ -]{1,48}$/.test(value) ? value : '';
  }
  function readStorage(name) {
    var value;
    try {
      value = window.localStorage.getItem(name);
      try { value = JSON.parse(value); } catch (ignore) {}
    } catch (ignore) {}
    return value;
  }
  function hostOf(value) {
    try {
      var host = new URL(value).hostname;
      return /^[a-zA-Z0-9.-]{1,253}$/.test(host) ? host : '';
    } catch (ignore) { return ''; }
  }
  function mediaUrl(value) {
    try {
      var url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return '';
      return allowed.some(function (host) {
        return url.hostname === host || url.hostname.slice(-(host.length + 1)) === '.' + host;
      }) ? url.href : '';
    } catch (ignore) { return ''; }
  }
  function summary(episode, subtitles) {
    var list = Array.isArray(subtitles) ? subtitles.slice(0, 1000) : [];
    var langs = [], hosts = [], urls = 0;
    list.forEach(function (entry) {
      entry = entry || {};
      var lang = tag(entry.lang), host = hostOf(entry.url);
      if (lang && langs.indexOf(lang) < 0 && langs.length < 32) langs.push(lang);
      if (host && hosts.indexOf(host) < 0 && hosts.length < 32) hosts.push(host);
      if (typeof entry.url === 'string' && entry.url) urls++;
    });
    return { episode: numeric(episode.number), mediaId: episodeId(episode), count: list.length, urlCount: urls, langs: langs, hosts: hosts };
  }
  function report(payload, callback) {
    if (Date.now() > EXPIRES) { if (callback) callback(); return; }
    var xhr = new XMLHttpRequest(), answered = false;
    function done() { if (!answered) { answered = true; if (callback) callback(); } }
    xhr.open('POST', endpoint, true);
    xhr.withCredentials = false;
    xhr.timeout = 5000;
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = xhr.onerror = xhr.ontimeout = done;
    try { xhr.send(JSON.stringify(payload)); } catch (ignore) { done(); }
  }
  function finish(event, status) {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(deadline);
    requests.forEach(function (xhr) { try { xhr.abort(); } catch (ignore) {} });
    token = '';
    label.textContent = 'Проверка завершена. Возвращаю KinoPub…';
    var timer = window.setTimeout(function () { window.location.replace(returnUrl); }, 500);
    report({ event: event, status: numeric(status) }, function () {
      window.clearTimeout(timer);
      window.location.replace(returnUrl);
    });
  }
  function get(url, authenticated, callback) {
    if (stopped) return;
    var xhr = new XMLHttpRequest(), answered = false;
    requests.push(xhr);
    function done(status, text) {
      if (answered || stopped) return;
      answered = true;
      callback(status, text);
    }
    xhr.open('GET', url, true);
    xhr.withCredentials = false;
    xhr.timeout = 5000;
    if (authenticated) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.onload = function () { done(xhr.status, xhr.responseText); };
    xhr.onerror = xhr.ontimeout = function () { done(0, ''); };
    try { xhr.send(); } catch (ignore) { done(0, ''); }
  }
  function vtt(episode, entries, callback) {
    var candidates = (Array.isArray(entries) ? entries : []).filter(function (entry) {
      return entry && /^(eng|en|english)$/i.test(entry.lang || '') && mediaUrl(entry.url);
    }).slice(0, 2);
    var index = 0;
    function next() {
      if (stopped) return;
      if (index === candidates.length) { callback(); return; }
      var entry = candidates[index++], url = mediaUrl(entry.url);
      get(url, false, function (status, text) {
        report({ event: 'vtt', episode: numeric(episode.number), mediaId: episodeId(episode), status: numeric(status), length: Math.min(text.length, 1000000000), isWebVtt: /^\uFEFF?WEBVTT(?:\s|$)/.test(text), langs: [tag(entry.lang)], hosts: [hostOf(url)] }, next);
      });
    }
    next();
  }
  function inspectEpisodes(episodes) {
    var index = 0;
    function next() {
      if (stopped) return;
      if (index === episodes.length) { finish('done', 200); return; }
      var episode = episodes[index++], id = episodeId(episode);
      if (!id) { report({ event: 'media', episode: numeric(episode.number), status: 0 }, next); return; }
      get(api + '/items/media-links?mid=' + id, true, function (status, text) {
        var media;
        try { media = JSON.parse(text); media = media.media || media; } catch (ignore) {}
        if (status !== 200 || !media || typeof media !== 'object') {
          report({ event: 'media', episode: numeric(episode.number), mediaId: id, status: numeric(status) }, next);
          return;
        }
        report({ event: 'media', status: 200, episodes: [summary(episode, media.subtitles)] }, function () {
          vtt(episode, media.subtitles, next);
        });
      });
    }
    next();
  }

  var stored = readStorage('kp_token');
  if (typeof stored === 'string') token = stored;
  if (!EXPIRES || Date.now() > EXPIRES) { window.location.replace(returnUrl); return; }
  deadline = window.setTimeout(function () { finish('error', 408); }, 39500);
  report({ event: 'storage', tokenPresent: !!token, subsEnabled: readStorage('kp_subtitles_enabled') === true }, function () {
    if (!token) { finish('error', 401); return; }
    get(api + '/items/104896', true, function (status, text) {
    var item, season, episodes;
    try {
      item = JSON.parse(text).item;
      season = item.seasons.filter(function (entry) { return Number(entry.number) === 1; })[0];
      episodes = season.episodes.slice(0, 2).map(function (episode, index) {
        return { number: numeric(episode.number) || index + 1, id: episode.id, media_id: episode.media_id, subtitles: episode.subtitles };
      });
    } catch (ignore) { finish('error', status); return; }
    if (status !== 200 || episodes.length !== 2) { finish('error', status); return; }
    report({ event: 'item', status: 200, episodes: episodes.map(function (episode) { return summary(episode, episode.subtitles); }) }, function () {
      inspectEpisodes(episodes);
    });
    });
  });
})();
