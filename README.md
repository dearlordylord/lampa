# Lampa + KinoPub: личная сборка

Готовая веб-сборка для Samsung The Frame QN55LS03BAFXZC: фиксированная Lampa
и встроенный проверенный KinoPub-плагин, без удалённого терминала, сторонних
расширений, CUB, авторского прокси и удалённых логов.

**[Открыть приложение](https://dearlordylord.github.io/lampa/)** ·
**[Гайд для телевизора](https://dearlordylord.github.io/lampa/guide.html)** ·
[Markdown-гайд](GUIDE.md) · [Что изменено и пределы проверки](PERSONAL-SECURITY.md)

В Media Station X: **Settings → Start Parameter → Setup → `id:rgh:dearlordylord`**.
Включить HTTPS/замок, выбрать «Lampa · личная сборка», затем «Открыть Lampa + KinoPub».
Внутри: шестерёнка → KinoPub → Авторизоваться. Свои API-ключи не нужны.

Каталог и окно выдачи кода проверены в Chrome. Просмотр на реальном Samsung
и вход в твой аккаунт ещё не проверены. Для первой пробы — 1080p, Авто (HLS2).

`node tests/security.cjs` — проверки без реального аккаунта.
`python3 tests/serve.py` — локальный preview: http://127.0.0.1:8765/lampa/.

Основа: [yumata/lampa](https://github.com/yumata/lampa), GPL-2.0 (см. LICENSE).
Встроенный плагин: [наш форк](https://github.com/dearlordylord/lampa_kinopub).
Проекты не аффилированы с KinoPub. История upstream сохранена; обновления только вручную.
