# Personal build: security changes and verification

Build 2026.10.23.1, for a Samsung The Frame QN55LS03BAFXZC (2022).

## Changes

- Forked the fixed upstream **web artifact** `yumata/lampa@02df3448ec9139b77ff1f5603785591fe6b4419b`.
  This repository distributes a readable compiled app.min.js; edits are made directly
  to that artifact. This is not a fresh build of yumata/lampa-source and no source/build
  equivalence or complete dependency audit is claimed. Original GPL license is retained.
- Removed the entire socket transport and remote eval handlers from the artifact,
  retaining harmless no-op Socket methods for callers. WebSocket is also disabled in
  the bootstrap. No terminal access code can re-enable this implementation.
- Replaced dynamic extensions/CUB/storage/cache loading with a single reviewed local
  `plugins/kinopub.js` snapshot. Existing extension URLs and cached code are ignored.
- Removed automatic external sport/shots/engineer scripts; local HLS, DASH and QR libraries
  remain. Removed downloaded-translation eval; built-in Russian/English remain.
- Disabled CUB account/bootstrap, mirrors, geolocation, automatic proxy installation,
  remote configuration, logging, advertisements, watched-metrics and developer entrypoint.
- Direct TMDB APIs/images, regardless of previously saved proxy preferences.
- Added CSP (no remote scripts, inline JavaScript, eval, embedded frames or objects) and
  an HTTPS request allowlist for the required API/CDN families. Account Authorization
  headers are allowed only to the exact KinoPub API hostname. No permissive CORS proxy.
- Updated the delivered jQuery from 3.2.1 to the compatible **3.7.1** official distribution
  to include the known 3.5 HTML security fixes; no claim that every dependency is current.
- Embedded our plugin fork with no author VPS, remote logs, voice sync, CUB registration
  or configurable API proxy. Defaults: 1080p/HLS2, subtitles off. Removed the unsuitable
  CIS-CDN selection shortcut; no automatic device server-region changes.
- No automatic upstream updates. See `personal/provenance.json` for exact asset hashes
  and plugin revision. Pushing code to our Pages branch does update this deployment.

## Checks

- `node tests/security.cjs`: network rejections, credential destinations, preserved token,
  disabled socket facade, removal of eval handlers, fixed local-only extension loader,
  CSP, vendored dependency and recorded asset hashes. Transport is mocked, no account used.
- `node smoke-test.js` in the plugin fork: 25 startup/privacy checks, including malicious
  voice label, saved log/proxy addresses and card opening. Upstream fails these checks.
- JS syntax checks and deliberate allowlist mutation: removing the allowlist guard must
  fail the test; restoration must pass.
- Anonymous real-service checks: KinoPub API CORS/preflight passed; the embedded shared
  xbmc client obtained a five-character unactivated device code; direct TMDB returned
  a movie and CORS permission. No account activated and no credentials copied from a user.
- Local Chrome UI: catalog/posters, settings/KinoPub and actual code prompt loaded.
  The code was not activated; cancelling the prompt stopped polling.
- Deployment/startup-file verification is recorded in `personal/verification.json`.

## Boundaries

This is risk reduction for a controlled personal setup, not a malware-free certification.
No real-user playback, Samsung native decoder/remote, region-specific Samsung App Store
availability or TV wake/sleep persistence can be verified without the TV. Start with 1080p.
The host Media Station X/Samsung browser and TV firmware remain trusted. Native AVPlay
may not enforce browser CSP in the same way as HTML5; the reviewed plugin and upstream
media service remain trusted for stream/manifest contents. Generic HTTPS allowlists do
not authenticate every response from an allowed CDN. Shared-origin scripts can still read
JavaScript storage; GitHub Pages projects under one username share an origin. Do not host
unreviewed code under this account or add random extensions. No private data is embedded
in these public repositories; local account tokens are not encrypted against same-origin JS.

Allowed CDN families were taken from upstream examples: cdn2cdn.com, cdn2site.com,
digital-cdn.net, cdntogo.net. If the service rotates domains, requests should fail closed
until a deliberate review/update. HLS2 can limit alternate audio; removing the author's
manifest proxy trades those features for avoiding third-party data disclosure. No public
replacement proxy was deployed. Common xbmc client credentials can be revoked by KinoPub;
this setup does not evade a rejection by the provider.

Known upstream policy/primary references:
- https://github.com/yumata/lampa/blob/02df3448ec9139b77ff1f5603785591fe6b4419b/SECURITY.md
- https://github.com/dearlordylord/lampa_kinopub/blob/main/security/SECURITY-AUDIT.md
- https://github.com/jquery/jquery/security/advisories/GHSA-gxr4-xjj5-5px2
- https://msx.benzac.de/wiki/index.php?title=Setup_Start_Parameter
