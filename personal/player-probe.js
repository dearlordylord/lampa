/* Fixed, account-local playback probe. No remote commands or uploaded URLs. */
(function () {
  'use strict';
  var target = 'https://lens-information-art-tactics.trycloudflare.com/report';
  var hash = new URLSearchParams(window.location.hash.slice(1));
  var token = hash.get('access') || '';
  var audioIndex = Number(hash.get('audio') || 2);
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  if (!token) {
    var stored = window.localStorage.getItem('kp_token');
    try { stored = JSON.parse(stored); } catch (ignore) {}
    if (typeof stored === 'string') token = stored;
  }
  var video = document.getElementById('video');
  var label = document.getElementById('status');
  var requested = null, expires = Date.now() + 10 * 60 * 1000, apiStatus = null, matched = false;
  function report(event) {
    if (Date.now() > expires) return;
    var environment = { tokenPresent: !!token, nativeApiPresent: !!(window.webapis && window.webapis.avplay),
      mediaSourceSupported: !!window.MediaSource, urlAudioSelected: matched, apiStatus: apiStatus };
    var payload = { build: 'native-probe-1', event: event, requested: requested, environment: environment,
      video: { time: video.currentTime, readyState: video.readyState, errorCode: video.error ? video.error.code : null,
        muted: video.muted, volume: video.volume, decodedAudioBytes: video.webkitAudioDecodedByteCount } };
    var xhr = new XMLHttpRequest();
    xhr.open('POST', target, true); xhr.timeout = 5000;
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(payload));
  }
  function start() {
    video.muted = false;
    video.volume = 1;
    var result = video.play();
    if (result && result.catch) result.catch(function () { label.textContent = 'Нажми OK для воспроизведения'; report('error'); });
  }
  document.getElementById('play').onclick = start;
  document.getElementById('play').focus();
  document.addEventListener('keydown', function (event) { if (event.keyCode === 13) { event.preventDefault(); start(); } });
  ['loadeddata', 'canplay', 'error'].forEach(function (event) {
    video.addEventListener(event, function () { report(event); });
  });
  window.setInterval(function () { report('sample'); }, 3000);
  report('enabled');
  if (!token) { label.textContent = 'Тестовая сессия ещё не подключена'; return; }
  var request = new XMLHttpRequest();
  request.open('GET', 'https://api.service-kp.com/v1/items/18009', true);
  request.setRequestHeader('Authorization', 'Bearer ' + token);
  request.timeout = 15000;
  request.onload = function () {
    apiStatus = request.status;
    if (request.status !== 200) { label.textContent = 'Не удалось получить серию'; report('error'); return; }
    try {
      var item = JSON.parse(request.responseText).item;
      var episode = item.seasons[0].episodes[0];
      var audio = episode.audios.filter(function (entry) { return Number(entry.index) === audioIndex; })[0];
      requested = audio ? { index: audio.index, lang: audio.lang, codec: audio.codec, channels: audio.channels } : null;
      var files = episode.files.filter(function (file) { return file.url && file.url.hls; });
      files.sort(function (a, b) { return parseInt(a.quality, 10) - parseInt(b.quality, 10); });
      var file = files.filter(function (entry) { return parseInt(entry.quality, 10) === 720; })[0] || files[0];
      var url = file.url.hls;
      var suffixAt = url.search(/[?#]/), path = suffixAt < 0 ? url : url.slice(0, suffixAt), suffix = suffixAt < 0 ? '' : url.slice(suffixAt);
      var changed = path.replace(/(^|\/)master-v1a\d+(?=\.m3u8$|$)/, '$1master-v1a' + audioIndex);
      matched = /(^|\/)master-v1a\d+(?=\.m3u8$|$)/.test(path);
      var src = new URL(changed + suffix);
      var allowed = ['cdn2cdn.com', 'cdn2site.com', 'digital-cdn.net', 'cdntogo.net'];
      if (src.protocol !== 'https:' || !allowed.some(function (host) { return src.hostname === host || src.hostname.slice(-(host.length + 1)) === '.' + host; })) throw new Error('unapproved CDN');
      video.src = src.href;
      label.textContent = 'Bleach · ' + (audio ? audio.lang.toUpperCase() : 'озвучка') + ' · проверка';
      report('start'); video.load(); start();
    } catch (ignore) { label.textContent = 'Не удалось подготовить поток'; report('error'); }
  };
  request.onerror = function () { apiStatus = 0; report('error'); };
  request.send();
})();
