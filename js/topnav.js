/* Поиск в шапке: если между меню и иконками не помещается даже 200px — оставляем только иконку */
(function () {
  var search = document.querySelector('.top-search');
  var account = search && search.closest('.account');
  if (!search) return;
  var MIN = 200;
  function fit() {
    if (search.contains(document.activeElement)) return; // во время ввода не переключаем
    search.classList.remove('is-compact');
    var others = 0;
    Array.prototype.forEach.call(account.children, function (el) {
      if (el === search) return;
      var cs = getComputedStyle(el);
      others += el.offsetWidth + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight);
    });
    var gap = parseFloat(getComputedStyle(account).columnGap) || 0;
    var free = account.clientWidth - others - gap * (account.children.length - 1) - 10; // 10 — margin-right поиска
    search.classList.toggle('is-compact', free < MIN);
  }
  /* фокус: поиск уже 248px — растёт до 248px, отступ от меню уменьшается на столько же */
  var GROW = 248, GAP = 52;
  search.addEventListener('focusin', function () {
    if (search.classList.contains('is-compact')) return;
    var w = search.offsetWidth;
    if (w >= GROW) return;
    account.style.marginLeft = Math.max(8, GAP - (GROW - w)) + 'px';
    search.style.flexBasis = GROW + 'px';
    search.style.minWidth = GROW + 'px';
  });
  search.addEventListener('focusout', function () {
    if (search.contains(document.activeElement)) return;
    account.style.marginLeft = '';
    search.style.flexBasis = '';
    search.style.minWidth = '';
  });

  fit();
  document.fonts && document.fonts.ready.then(fit);
  addEventListener('resize', fit);
})();
