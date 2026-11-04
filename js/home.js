/* Home: поле AI Assistant и подсказки */
(function () {
  var form = document.getElementById('aiAsk');
  var input = document.getElementById('aiAskInput');
  if (!form || !input) return;
  var send = form.querySelector('.ai-ask__send');
  var HINT = 'Enter your question first';

  /* «выключаем» через aria-disabled, а не disabled: у disabled-кнопки браузер глушит
     события мыши, и хинт не показался бы */
  function empty() { return !input.value.trim(); }
  function sync() {
    var off = empty();
    send.setAttribute('aria-disabled', String(off));
    if (off) send.dataset.tip = HINT; else delete send.dataset.tip;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (empty()) { input.focus(); return; }
    // TODO: отправка запроса ассистенту
  });
  input.addEventListener('input', sync);
  input.addEventListener('keydown', function (e) { // Enter — отправить, Shift+Enter — новая строка
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  document.querySelectorAll('.ai-chip').forEach(function (chip) {
    chip.addEventListener('click', function () { input.value = chip.textContent.trim(); sync(); input.focus(); });
  });
  sync();
})();
