/* Plans: выбор пакета токенов (шкала с шагами) + пересчёт Price breakdown */
(function () {
  var slider = document.getElementById('tokensSlider');
  if (!slider) return;
  var STEPS = [0, 1000, 2000, 5000, 10000, 20000, 50000];
  var GAP = 2, WIDTH = 640, SEG = 107; // пересчитываются по реальной ширине шкалы (адаптив)
  function measure() { WIDTH = slider.clientWidth; SEG = (WIDTH + GAP) / (STEPS.length - 1); }
  var price = parseFloat(document.getElementById('tokens').dataset.price) || 0.02;
  var segs = slider.querySelectorAll('.tokens__seg');
  var thumb = slider.querySelector('.tokens__thumb');
  var fmt = function (n) { return n.toLocaleString('en-US'); };
  var current = 4;

  function x(i) { return i === STEPS.length - 1 ? WIDTH - 1 : i * SEG - 1; } // центр деления
  function set(i) {
    current = Math.max(0, Math.min(STEPS.length - 1, i));
    var v = STEPS[current];
    thumb.style.left = (x(current) + 1) + 'px';
    Array.prototype.forEach.call(segs, function (s, n) { s.classList.toggle('is-on', n < current); });
    preview(null);
    slider.setAttribute('aria-valuenow', v);
    slider.setAttribute('aria-valuetext', fmt(v) + ' tokens');
    document.getElementById('tokensValue').textContent = fmt(v);
    document.getElementById('priceTokens').textContent = fmt(v) + ' tokens';
    document.getElementById('priceSum').textContent = '$' + (v * price).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  function nearest(clientX) {
    var px = clientX - slider.getBoundingClientRect().left, best = 0;
    STEPS.forEach(function (_, i) { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    return best;
  }

  /* перетаскивание: ползунок прыгает по делениям, заливка — целыми отрезками */
  /* шаг под курсором для hover и клика: отрезок под курсором всегда целиком.
     серый отрезок (выше текущего) — до его конца, закрашенный (ниже) — от его начала */
  function target(clientX) {
    var px = clientX - slider.getBoundingClientRect().left;
    var seg = Math.max(0, Math.min(STEPS.length - 2, Math.floor((px + 1) / SEG)));
    return seg >= current ? seg + 1 : seg;
  }

  var dragging = false;
  slider.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    dragging = true;
    slider.setPointerCapture(e.pointerId);
    slider.classList.add('is-dragging');
    set(target(e.clientX));
    e.preventDefault();
  });
  slider.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var i = nearest(e.clientX);
    if (i !== current) set(i);
  });
  function end() { dragging = false; slider.classList.remove('is-dragging'); }

  /* hover на другой пакет: меньший — отрезки «отпадут» (высветляются), больший — «добавятся» (сиреневые) */
  function preview(i) {
    Array.prototype.forEach.call(segs, function (s, n) {
      s.classList.toggle('is-preview', i !== null && n >= i && n < current);       // меньший пакет: отпадёт
      s.classList.toggle('is-preview-up', i !== null && n >= current && n < i);   // больший пакет: добавится
    });
  }
  slider.addEventListener('pointermove', function (e) { preview(dragging ? null : target(e.clientX)); });
  slider.addEventListener('pointerleave', function () { preview(null); });
  slider.addEventListener('pointerup', end);
  slider.addEventListener('pointercancel', end);
  slider.addEventListener('lostpointercapture', end);
  slider.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowUp') { set(current + 1); e.preventDefault(); }
    if (k === 'ArrowLeft' || k === 'ArrowDown') { set(current - 1); e.preventDefault(); }
    if (k === 'Home') { set(0); e.preventDefault(); }
    if (k === 'End') { set(STEPS.length - 1); e.preventDefault(); }
  });

  measure();
  addEventListener('resize', function () { measure(); set(current); });
  set(current);
})();
