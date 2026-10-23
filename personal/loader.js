(function () {
  'use strict';
  var script = document.createElement('script');
  script.src = './app.min.js?v=personal-20261023-4';
  script.onerror = function () {
    document.querySelector('.no-network').classList.remove('hide');
    document.querySelector('.no-network__file').textContent = 'app.min.js';
  };
  document.body.appendChild(script);
})();
