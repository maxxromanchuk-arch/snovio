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



/* Поиск: панель недавних запросов, пустое состояние, применённый фильтр.
   Недавние хранятся в браузере. Кнопка Filters в демо включает/выключает фильтр «Job title: Founder». */
(function () {
  var form = document.getElementById('topSearch');
  if (!form) return;
  var input = document.getElementById('topSearchInput');
  var pop = document.getElementById('topSearchPop');
  var list = document.getElementById('topSearchList');
  var head = pop.querySelector('.search-pop__head');
  var clearBtn = pop.querySelector('[data-act="clear-recent"]');
  var empty = pop.querySelector('.search-pop__empty');
  var filterRow = pop.querySelector('.search-pop__filter');
  var count = form.querySelector('.top-search__count');
  var KEY = 'snovio.recentSearches', MAX = 5;
  var DEFAULTS = ['Max Romanchuk', 'cochenco.com', 'linkedin.com/in/maxromanchuk/'];
  var recent, applied = [], active = -1; // applied — фильтры, применённые кнопкой Show в панели Filters
  try { recent = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!Array.isArray(recent)) recent = DEFAULTS.slice();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(recent)); } catch (e) {} }
  function type(q) {
    if (/linkedin\.com\/in\//i.test(q)) return 'LinkedIn URL';
    if (!/\s|@/.test(q) && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(q)) return 'Domain';
    return 'Prospect';
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function items() { return Array.prototype.slice.call(list.children); }
  function setActive(i) {
    var all = items();
    active = all.length && i >= 0 ? (i % all.length + all.length) % all.length : -1;
    all.forEach(function (el, n) { el.classList.toggle('is-active', n === active); el.setAttribute('aria-selected', String(n === active)); });
  }
  // кнопка Filters в поиске: сиреневая со счётчиком, пока применён хотя бы один фильтр
  function syncFilter() {
    var n = applied.length;
    form.classList.toggle('has-filter', n > 0);
    count.hidden = !n;
    count.textContent = n;
    filterRow.hidden = !n;
    if (n) filterRow.querySelector('.search-pop__filter-text').innerHTML = 'Applied: <b>' + esc(applied.join(', ')) + '</b>';
  }
  window.setAppliedFilters = function (list) { applied = (list || []).slice(); syncFilter(); };
  function render() {
    syncFilter();
    list.innerHTML = recent.map(function (r, n) {
      return '<li class="search-pop__item" role="option" id="ts-opt-' + n + '" data-value="' + esc(r) + '">' +
        '<svg class="i i--16" aria-hidden="true"><use href="#i-time-16"/></svg>' +
        '<span class="search-pop__text">' + esc(r) + '</span>' +
        '<span class="search-pop__type">' + type(r) + '</span>' +
        '<button type="button" class="search-pop__x" data-act="remove" aria-label="Remove ' + esc(r) + '"><svg class="i" aria-hidden="true"><use href="#i-close-clear"/></svg></button></li>';
    }).join('');
    clearBtn.hidden = !recent.length;
    empty.hidden = !!recent.length;
    setActive(-1);
  }
  function open() {
    if (form.classList.contains('is-compact')) return;
    if (pop.classList.contains('is-closing')) { pop.classList.remove('is-closing'); return; }
    if (!pop.hidden) return;
    render();
    pop.hidden = false;
    form.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
  }
  function close() {
    clearTimeout(timer); setLoading(false);
    if (pop.hidden || pop.classList.contains('is-closing')) return;
    input.setAttribute('aria-expanded', 'false');
    function done() {
      pop.classList.remove('is-closing');
      pop.hidden = true;
      form.classList.remove('is-open');
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
    pop.classList.add('is-closing'); // быстро «втягивается» обратно в поле
    pop.addEventListener('animationend', function end() { pop.removeEventListener('animationend', end); done(); });
  }
  function commit(q) {
    q = q.trim(); if (!q) return;
    recent = [q].concat(recent.filter(function (r) { return r.toLowerCase() !== q.toLowerCase(); })).slice(0, MAX);
    save();
    input.value = q;
    filterTable(q);
    close(); input.blur();
  }

  /* фильтрация таблицы Prospects прямо при вводе (с небольшой задержкой).
     Совпадение — с начала слова в имени, компании, должности, email, LinkedIn, отрасли;
     домен и LinkedIn URL ищутся как подстрока */
  var table = document.querySelector('.grid tbody');
  var fTimer = null;
  /* общий пересчёт таблицы: строка видна, если прошла и поиск (is-hidden), и фильтры (is-filtered-out) */
  window.recountProspects = function () {
    if (!table) return 0;
    var countEl = document.getElementById('prospectCount');
    if (countEl && !countEl.dataset.total) countEl.dataset.total = countEl.textContent;
    var shown = 0, any = false;
    Array.prototype.forEach.call(table.rows, function (tr) {
      if (tr.classList.contains('no-results')) return;
      if (tr.classList.contains('is-hidden') || tr.classList.contains('is-filtered-out')) any = true;
      else shown++;
    });
    if (countEl) countEl.textContent = any ? shown : countEl.dataset.total;
    var noRow = table.querySelector('.no-results');
    if (!shown && any) {
      if (!noRow) {
        noRow = document.createElement('tr');
        noRow.className = 'no-results';
        noRow.innerHTML = '<td colspan="99"></td>';
        table.appendChild(noRow);
      }
      var q = input.value.trim();
      noRow.firstChild.innerHTML = q ? 'No prospects match “<b></b>”' : 'No prospects match these filters';
      if (q) noRow.querySelector('b').textContent = q;
    } else if (noRow) noRow.remove();
    return any ? shown : null;
  };
  function rowText(tr) {
    if (!tr._text) {
      var links = Array.prototype.map.call(tr.querySelectorAll('a[href*="linkedin.com"], [data-copy]'), function (a) { return a.getAttribute('href') || a.dataset.copy; }).join(' ');
      var parts = [], walk = document.createTreeWalker(tr, NodeFilter.SHOW_TEXT); // текст по кусочкам через пробел — «Green Leaf» и «CEO» не слипаются
      while (walk.nextNode()) parts.push(walk.currentNode.nodeValue);
      tr._text = (parts.join(' ') + ' ' + links).replace(/\s+/g, ' ').toLowerCase();
    }
    return tr._text;
  }
  function rowMatches(tr, q) {
    var text = rowText(tr);
    if (/linkedin\.com\/in\/|\./.test(q)) return text.indexOf(q.replace(/^https?:\/\/(www\.)?/, '')) !== -1;
    return q.split(/\s+/).every(function (w) {
      return new RegExp('(^|[\\s.@,·/(-])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(text);
    });
  }
  function applyFilter(q) {
    if (!table) return;
    q = q.trim().toLowerCase();
    Array.prototype.forEach.call(table.rows, function (tr) {
      if (tr.classList.contains('no-results')) return;
      tr.classList.toggle('is-hidden', !!q && !rowMatches(tr, q));
    });
    window.recountProspects();
  }
  function filterTable(q) {
    clearTimeout(fTimer);
    fTimer = setTimeout(function () { applyFilter(q); }, 200);
  }

  /* пока в поле есть текст и пользователь печатает — «идёт поиск»: скелетон вместо списка.
     Через 1,2 с после последнего символа — снова список (результатов в макете пока нет) */
  var loading = document.querySelector('.search-pop__loading'), timer = null;
  /* скелетон повторяет то, что было в списке: заголовок + столько строк, сколько недавних запросов (до 5) */
  var SKEL_W = [108, 96, 191, 140, 120];
  function setLoading(on) {
    if (on && !pop.classList.contains('is-loading')) {
      loading.querySelectorAll('.skel-row').forEach(function (r) { r.remove(); });
      recent.slice(0, MAX).forEach(function (_, n) {
        loading.insertAdjacentHTML('beforeend', '<div class="skel-row"><i class="skel skel--dot"></i><i class="skel" style="width:' + SKEL_W[n % SKEL_W.length] + 'px"></i></div>');
      });
      // истории нет — как строка «No recent searches yet»: одна полоска без кружка (Figma 841:7909)
      if (!recent.length) loading.insertAdjacentHTML('beforeend', '<div class="skel-row"><i class="skel" style="width:131px"></i></div>');
    }
    pop.classList.toggle('is-loading', on);
    loading.hidden = !on;
  }
  input.addEventListener('input', function () {
    filterTable(input.value);
    open();
    clearTimeout(timer);
    if (!input.value.trim()) { setLoading(false); return; }
    setLoading(true);
    timer = setTimeout(function () { setLoading(false); }, 1200);
  });

  input.addEventListener('focus', open);
  input.addEventListener('click', open);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { open(); setActive(active + 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { setActive(active < 0 ? items().length - 1 : active - 1); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); var a = items()[active]; commit(a ? a.dataset.value : input.value); }
    else if (e.key === 'Escape') { close(); input.blur(); }
  });
  pop.addEventListener('mousedown', function (e) { e.preventDefault(); }); // клик в панели не уводит фокус из поля
  list.addEventListener('mousemove', function (e) { var it = e.target.closest('.search-pop__item'); if (it) setActive(items().indexOf(it)); });
  list.addEventListener('mouseleave', function () { setActive(-1); });
  pop.addEventListener('click', function (e) {
    var act = e.target.closest('[data-act]');
    if (act) {
      if (act.dataset.act === 'remove') {
        var v = act.closest('.search-pop__item').dataset.value;
        recent = recent.filter(function (r) { return r !== v; });
      }
      if (act.dataset.act === 'clear-recent') recent = [];
      if (act.dataset.act === 'clear-filter') { applied = []; document.dispatchEvent(new CustomEvent('filters:clear')); }
      save(); render(); input.focus(); return;
    }
    var it = e.target.closest('.search-pop__item');
    if (it) commit(it.dataset.value);
  });
  document.addEventListener('pointerdown', function (e) { if (!form.contains(e.target)) close(); });
  render();
})();
