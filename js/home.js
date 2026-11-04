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

/* при центрировании по высоте блок может встать на .5px — подтягиваем на целый пиксель */
(function () {
  var box = document.querySelector('.ai-start');
  if (!box) return;
  function snap() { // через padding, а не transform: transform ломает отрисовку видео в Safari
    box.style.paddingTop = '';
    var frac = box.getBoundingClientRect().top % 1;
    // блок по центру: +d к padding сдвигает контент на d/2, поэтому добавляем удвоенный остаток
    if (frac) box.style.paddingTop = (52 + 2 * (1 - frac)) + 'px';
  }
  snap();
  addEventListener('resize', snap);
})();


/* попапы: <a|button data-modal-open="id"> открывает <dialog id>, закрытие — крестик, Esc, клик по фону.
   Появление и закрытие — быстрое проявление с лёгким масштабом (CSS), закрываем после анимации */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function close(dlg) {
    if (!dlg.open || dlg.classList.contains('is-closing')) return;
    if (reduce) { dlg.close(); return; }
    dlg.classList.add('is-closing');
    dlg.addEventListener('animationend', function done() {
      dlg.removeEventListener('animationend', done);
      dlg.classList.remove('is-closing');
      dlg.close();
    });
  }
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-modal-open]');
    if (opener) {
      var dlg = document.getElementById(opener.dataset.modalOpen);
      if (dlg && dlg.showModal) { e.preventDefault(); dlg.showModal(); }
      return;
    }
    var x = e.target.closest('[data-modal-close]');
    if (x) close(x.closest('dialog'));
  });
  document.querySelectorAll('dialog.modal').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(dlg); }); // клик мимо карточки
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(dlg); });  // Esc
  });
})();
