/* Optional, time-limited audio telemetry. No remote commands or script loading. */
(function (w) {
  'use strict';
  var endpoint = 'https://lens-information-art-tactics.trycloudflare.com/report';
  var expires = 1792897039430; // Set only for the temporary diagnostic deployment.
  var until = 0, attached = false, timer, L, requested = null, tracks = [], lastSent = 0;
  var manifestCodecs = [], manifestStatus = null, lastError = null;
  function number(value) { return typeof value === 'number' && isFinite(value) ? value : null; }
  function tag(value) { return typeof value === 'string' && /^[a-zA-Z0-9_.+ -]{1,48}$/.test(value) ? value : ''; }
  function audio(value) {
    value = value || {};
    var extra = value.extra || {};
    return { index: number(value.index), lang: tag(value.language || value.lang || extra.language),
      codec: tag(value.codec || extra.codec || extra.codec_name || extra.audio_codec || extra.fourCC),
      channels: number(value.channels || extra.channels || extra.audio_channel), sampleRate: number(value.sampleRate || extra.sample_rate || extra.audio_sample_rate),
      selected: value.selected === true };
  }
  function snapshot(event) {
    var report = { build: '2026.10.23.5', event: event, requested: requested,
      tracks: tracks.slice(0, 40).map(audio), nativeTracks: [], video: {},
      manifestCodecs: manifestCodecs, manifestStatus: manifestStatus, error: lastError };
    try {
      var av = w.webapis && w.webapis.avplay;
      if (av) {
        report.nativeState = tag(av.getState());
        report.nativeTracks = av.getCurrentStreamInfo().filter(function (t) { return t.type === 'AUDIO'; }).map(function (t) {
          var extra = {};
          try { extra = JSON.parse(t.extra_info); } catch (ignore) {}
          return audio({ index: t.index, extra: extra });
        }).slice(0, 40);
      }
    } catch (ignore) {}
    try {
      var video = w.document.querySelector('video');
      if (video) report.video = { time: number(video.currentTime), readyState: number(video.readyState),
        errorCode: video.error ? number(video.error.code) : null, muted: video.muted === true,
        volume: number(video.volume), decodedAudioBytes: number(video.webkitAudioDecodedByteCount) };
    } catch (ignore) {}
    return report;
  }
  function send(event) {
    var now = Date.now();
    if (!until || now > until || now > expires) { stop(); return; }
    if (now - lastSent < 500) return;
    lastSent = now;
    try {
      var xhr = new w.XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      xhr.withCredentials = false;
      xhr.timeout = 5000;
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function () {
        if (event === 'enabled') L.Noty.show(xhr.status === 204 ? 'Диагностика подключена на 15 минут' : 'Приёмник диагностики недоступен');
      };
      xhr.onerror = xhr.ontimeout = function () { if (event === 'enabled') L.Noty.show('Не удалось подключить диагностику'); };
      xhr.send(JSON.stringify(snapshot(event)));
    } catch (ignore) {
      if (event === 'enabled') L.Noty.show('Не удалось подключить диагностику');
    }
  }
  function stop() { until = 0; w.clearInterval(timer); timer = null; }
  function readManifest(url) {
    if (!until || Date.now() > until || Date.now() > expires || typeof url !== 'string') return;
    // Read only the existing stream's manifest. Never send its URL or body.
    try {
      var xhr = new w.XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 5000;
      xhr.onload = function () {
        manifestStatus = xhr.status;
        if (xhr.status === 200 && xhr.responseText.length < 262144) {
          var pattern = /(?:^|,)CODECS="([^"]+)"/g, match;
          while ((match = pattern.exec(xhr.responseText)) && manifestCodecs.length < 20) {
            match[1].split(',').forEach(function (codec) { if (tag(codec) && manifestCodecs.indexOf(codec) < 0) manifestCodecs.push(codec); });
          }
        }
        send('manifest');
      };
      xhr.onerror = function () { manifestStatus = 0; send('manifest'); };
      xhr.send();
    } catch (ignore) { manifestStatus = 0; }
  }
  function attach(lampa) {
    if (attached) return;
    attached = true;
    L = lampa;
    L.SettingsApi.addParam({ component: 'kp', param: { name: 'kp_audio_diagnostics', type: 'button' },
      field: { name: 'Диагностика звука · 15 минут', description: 'Кодеки, состояние звука и ошибки → временный приёмник на Mac. Без токенов и ссылок.' },
      onChange: function () {
        if (until) { stop(); L.Noty.show('Диагностика выключена'); return; }
        if (Date.now() > expires) { L.Noty.show('Сессия диагностики истекла'); return; }
        until = Date.now() + 15 * 60 * 1000;
        lastSent = 0;
        send('enabled');
        timer = w.setInterval(function () { send('sample'); }, 3000);
      }
    });
    L.Player.listener.follow('start', function (play) {
      requested = play && play._kpVoice ? audio(play._kpVoice) : null;
      tracks = [];
      manifestCodecs = []; manifestStatus = null; lastError = null;
      send('start');
      if (play) readManifest(play.url);
    });
    L.PlayerVideo.listener.follow('tracks', function (event) { tracks = event && event.tracks || []; send('tracks'); });
    ['error', 'canplay', 'loadeddata'].forEach(function (event) {
      L.PlayerVideo.listener.follow(event, function (data) {
        if (event === 'error') lastError = { code: number(data && data.code), fatal: !!(data && data.fatal) };
        send(event);
      });
    });
    L.Player.listener.follow('destroy', function () { send('destroy'); tracks = []; requested = null; });
  }
  w.KpAudioDiagnostics = { attach: attach, isActive: function () { return until > Date.now() && expires > Date.now(); } };
})(window);
