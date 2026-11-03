/* Тосты (alert снизу экрана) */
var toast = (function () {
  var region = document.querySelector('.toast-region');
  var DURATION = 3000;
  function close(el) {
    if (!el.isConnected || el.classList.contains('is-leaving')) return;
    el.classList.add('is-leaving');
    el.addEventListener('animationend', function () { el.remove(); }, { once: true });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) el.remove();
  }
  return function (text) {
    if (!region) return;
    region.querySelectorAll('.toast').forEach(close); // одновременно показываем один
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="toast__text"></span>' +
      '<button class="toast__close" aria-label="Close"><svg class="i" aria-hidden="true"><use href="#i-close-clear"/></svg></button>';
    el.querySelector('.toast__text').textContent = text;
    el.querySelector('.toast__close').addEventListener('click', function () { close(el); });
    region.appendChild(el);
    setTimeout(function () { close(el); }, DURATION);
  };
})();

/* Копирование полей таблицы: любой [data-copy] → тост «Copied to clipboard» */
(function () {
  var MESSAGE = 'Copied to clipboard';
  function write(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea'); // запасной вариант
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
    return Promise.resolve();
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    write(btn.dataset.copy).then(function () {
      toast(MESSAGE);
    });
  });
})();

/* Чекбокс «выбрать всё» в шапке таблицы */
(function () {
  var all = document.querySelector('.grid thead .checkbox');
  if (!all) return;
  var rows = function () { return document.querySelectorAll('.grid tbody .checkbox'); };
  all.addEventListener('change', function () {
    rows().forEach(function (cb) { cb.checked = all.checked; });
  });
  document.querySelector('.grid tbody').addEventListener('change', function (e) {
    if (!e.target.matches('.checkbox')) return;
    all.checked = Array.prototype.every.call(rows(), function (cb) { return cb.checked; });
  });
})();

/* Вертикальный скроллбар таблицы поверх контента (WebKit/Blink).
   В Firefox остаётся нативный thin. */
(function () {
  if (!CSS.supports('selector(::-webkit-scrollbar)')) return;
  var scroller = document.getElementById('tableScroll');
  if (!scroller) return;
  var HEADER = 40;
  var MIN_THUMB = 32;
  var PAD = 2; // отступ ползунка от краёв подложки

  var bar = document.createElement('div');
  bar.className = 'vbar';
  bar.innerHTML = '<div class="vbar__thumb"></div>';
  scroller.parentNode.appendChild(bar);
  var thumb = bar.firstChild;

  function update() {
    var track = scroller.clientHeight - HEADER - PAD * 2;
    var content = scroller.scrollHeight - HEADER;
    var max = scroller.scrollHeight - scroller.clientHeight;
    bar.hidden = max <= 0;
    if (bar.hidden) return;
    var h = Math.max(MIN_THUMB, track * track / content);
    thumb.style.height = h + 'px';
    thumb.style.top = PAD + (scroller.scrollTop / max) * (track - h) + 'px';
    bar.style.bottom = (scroller.offsetHeight - scroller.clientHeight) + 'px'; // над горизонтальным скроллом
  }

  thumb.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    thumb.setPointerCapture(e.pointerId);
    bar.classList.add('is-dragging');
    var startY = e.clientY, startTop = scroller.scrollTop;
    function move(ev) {
      var track = scroller.clientHeight - HEADER - PAD * 2;
      var ratio = (scroller.scrollHeight - scroller.clientHeight) / (track - thumb.offsetHeight);
      scroller.scrollTop = startTop + (ev.clientY - startY) * ratio;
    }
    function up() {
      bar.classList.remove('is-dragging');
      thumb.removeEventListener('pointermove', move);
      thumb.removeEventListener('pointerup', up);
    }
    thumb.addEventListener('pointermove', move);
    thumb.addEventListener('pointerup', up);
  });

  scroller.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(scroller);
  update();
})();


/* Скрыть / показать панель Lists. Состояние запоминается в браузере. */
(function () {
  var btn = document.getElementById('listsToggle');
  var workspace = document.querySelector('.workspace');
  if (!btn || !workspace) return;
  var KEY = 'snovio.listsHidden';
  var STATES = {
    shown:  { icon: '#i-collapse', label: 'Hide lists' },
    hidden: { icon: '#i-expand',   label: 'Show lists' }
  };

  function apply(hidden) {
    var s = hidden ? STATES.hidden : STATES.shown;
    workspace.classList.toggle('is-lists-hidden', hidden);
    btn.querySelector('use').setAttribute('href', s.icon);
    btn.dataset.tip = s.label;
    btn.setAttribute('aria-label', s.label);
    btn.setAttribute('aria-expanded', String(!hidden));
  }

  var saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}
  apply(saved);
  // анимации включаем после первой отрисовки, чтобы сохранённое состояние не «проезжало» при загрузке
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { workspace.classList.add('is-animated'); });
  });

  btn.addEventListener('click', function () {
    var hidden = !workspace.classList.contains('is-lists-hidden');
    apply(hidden);
    try { localStorage.setItem(KEY, hidden ? '1' : '0'); } catch (e) {}
    btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); // обновить хинт под курсором
  });
})();


/* Боковая панель Enrich & AI tools: кнопка Enrich tools открывает/закрывает,
   закрытие — крестик, Esc, клик вне панели */
(function () {
  var btn = document.getElementById('enrichToggle');
  var panel = document.getElementById('enrichPanel');
  if (!btn || !panel) return;
  panel.hidden = false; // дальше видимостью управляет .is-open

  function set(open) {
    panel.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector('.tool-item').focus({ preventScroll: true });
  }
  btn.addEventListener('click', function () { set(!panel.classList.contains('is-open')); });
  panel.querySelector('[data-panel-close]').addEventListener('click', function () { set(false); btn.focus(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) { set(false); btn.focus(); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!panel.classList.contains('is-open')) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    set(false);
  });
})();