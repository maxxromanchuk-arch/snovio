/* Тултипы (общий модуль для всех страниц).
   <el data-tip="текст">                      — тёмный хинт с текстом
   class="tip--wide"                          — многострочный, 300px
   data-tip-html="id"                         — содержимое из скрытого элемента #id (разметка)
   data-tip-theme="light"                     — светлый вариант (белый, с рамкой и тенью)
   Один fixed-элемент в body: не обрезается overflow таблиц и панелей. */
(function () {
  var GAP = 6, EDGE = 8;
  var tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.appendChild(tip);
  var current = null;

  function show(el) {
    current = el;
    var src = el.dataset.tipHtml && document.getElementById(el.dataset.tipHtml);
    if (src) tip.innerHTML = src.innerHTML; else tip.textContent = el.dataset.tip;
    tip.classList.toggle('tooltip--wide', el.classList.contains('tip--wide'));
    tip.classList.toggle('tooltip--light', el.dataset.tipTheme === 'light');
    tip.hidden = false;
    var r = el.getBoundingClientRect(), t = tip.getBoundingClientRect();
    var left = r.left + r.width / 2 - t.width / 2;
    left = Math.max(EDGE, Math.min(left, innerWidth - t.width - EDGE));
    var top = r.top - t.height - GAP;
    if (top < EDGE) top = r.bottom + GAP; // нет места сверху — показываем снизу
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }
  function hide() { current = null; tip.hidden = true; }

  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest('[data-tip]');
    if (el && el !== current) show(el);
    else if (!el && current) hide();
  });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest('[data-tip]');
    if (el) show(el);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('scroll', hide, true);
})();
