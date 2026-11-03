/* Plans: слайдер отзывов и FAQ-аккордеон */

/* ---------- слайдер «What our customers say» ----------
   Карточки бесконечно по кругу: список повторён 3 раза, работаем в средней копии,
   на краях незаметно перескакиваем. Автопрокрутка, прогресс — в активной точке. */
(function () {
  var track = document.getElementById('storiesTrack');
  var dotsBox = document.getElementById('storiesDots');
  if (!track || !dotsBox) return;
  var section = track.closest('.stories');
  var cards = Array.prototype.slice.call(track.children);
  var n = cards.length, GAP = 20, AUTOPLAY = 6000;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // клоны слева и справа
  cards.forEach(function (c) { track.appendChild(c.cloneNode(true)); });
  cards.slice().reverse().forEach(function (c) { track.insertBefore(c.cloneNode(true), track.firstChild); });
  Array.prototype.forEach.call(track.children, function (c, i) { if (i < n || i >= 2 * n) c.setAttribute('aria-hidden', 'true'); });

  var dots = dotsBox.children, pos = n, timer = null;
  section.style.setProperty('--autoplay', AUTOPLAY + 'ms');

  function x(p) {
    var w = cards[0].offsetWidth;
    return section.clientWidth / 2 - w / 2 - p * (w + GAP);
  }
  var drag = 0; // текущий сдвиг при перетаскивании
  function render(anim) {
    track.classList.toggle('no-anim', !anim);
    track.style.transform = 'translateX(' + (x(pos) + drag) + 'px)';
    var active = ((pos % n) + n) % n;
    Array.prototype.forEach.call(dots, function (d, i) {
      d.classList.remove('is-active');
      if (i === active) { void d.offsetWidth; d.classList.add('is-active'); } // перезапуск прогресса
    });
  }
  function go(p) { pos = p; render(true); restart(); }
  track.addEventListener('transitionend', function () {
    if (pos >= 2 * n || pos < n) { pos = n + ((pos - n) % n + n) % n; render(false); }
  });

  function restart() {
    clearTimeout(timer);
    if (reduce || section.classList.contains('is-paused')) return;
    timer = setTimeout(function () { go(pos + 1); }, AUTOPLAY);
  }
  Array.prototype.forEach.call(dots, function (d, i) {
    d.addEventListener('click', function () { go(n + i); });
  });
  /* перетаскивание мышью / пальцем: тянем ленту, отпускаем — листаем на 1+ карточек или возвращаемся */
  var startX = 0, startT = 0, dragging = false, moved = false;
  track.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    dragging = true; moved = false;
    startX = e.clientX; startT = performance.now();
    clearTimeout(timer);
    track.setPointerCapture(e.pointerId);
    track.classList.add('is-dragging');
  });
  track.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    drag = e.clientX - startX;
    if (Math.abs(drag) > 5) moved = true;
    render(false);
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    var w = cards[0].offsetWidth + GAP;
    var v = drag / Math.max(1, performance.now() - startT);      // px/ms
    var steps = Math.round(-drag / w);
    if (steps === 0 && Math.abs(drag) > 60 || Math.abs(v) > 0.5 && Math.abs(drag) > 20) steps = drag < 0 ? Math.max(1, steps) : Math.min(-1, steps);
    // переходим без рывка: учитываем уже сдвинутое расстояние
    pos += steps; drag = 0;
    render(true); restart();
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('dragstart', function (e) { e.preventDefault(); }); // не тащить картинки
  track.addEventListener('click', function (e) { // после перетаскивания клик не срабатывает
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);

  track.addEventListener('click', function (e) { // клик по соседней карточке — листаем к ней
    var card = e.target.closest('.story');
    if (!card || e.target.closest('a')) return;
    var idx = Array.prototype.indexOf.call(track.children, card);
    if (idx !== pos) go(idx);
  });
  section.addEventListener('mouseenter', function () { section.classList.add('is-paused'); clearTimeout(timer); });
  section.addEventListener('mouseleave', function () { section.classList.remove('is-paused'); restart(); });
  addEventListener('resize', function () { render(false); });

  render(false);
  restart();
})();

/* ---------- FAQ: открыт один вопрос за раз ---------- */
(function () {
  var list = document.querySelector('.faq__list');
  if (!list) return;
  list.addEventListener('click', function (e) {
    var q = e.target.closest('.faq__q');
    if (!q) return;
    var item = q.parentNode, open = !item.classList.contains('is-open');
    Array.prototype.forEach.call(list.children, function (it) {
      it.classList.remove('is-open');
      it.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
    });
    if (open) { item.classList.add('is-open'); q.setAttribute('aria-expanded', 'true'); }
  });
})();

/* фото и логотипы отзывов, которых ещё нет в проекте, — не показываем битую картинку */
document.querySelectorAll('.story img') /* после клонирования слайдера */.forEach(function (img) {
  function miss() { img.classList.add('is-missing'); }
  if (img.complete && !img.naturalWidth) miss(); else img.addEventListener('error', miss);
});


/* блок имени в карточках отзывов центрируется по фото 136px и может встать на .5px —
   подтягиваем на целый пиксель, чтобы логотипы не мылились */
(function () {
  function snap() {
    document.querySelectorAll('.story__id, .story__photo').forEach(function (el) {
      el.style.translate = '';
      var frac = el.getBoundingClientRect().top % 1;
      if (Math.abs(frac) > 0.01) el.style.translate = '0 ' + (-frac) + 'px';
    });
  }
  document.fonts.ready.then(snap);
  addEventListener('resize', snap);
})();

/* появление блока «Start with a name and company»: один раз, когда видно 50% блока */
(function () {
  var block = document.querySelector('.flow2');
  if (!block || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  block.classList.add('is-anim');
  var io = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    requestAnimationFrame(function () { block.classList.add('is-play'); });
  }, { threshold: 0.5 });
  io.observe(block);
})();
