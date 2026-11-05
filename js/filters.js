/* Панель Filters: состояние фильтров → активные чипы, счётчики секций, живая фильтрация таблицы.
   Текст — «начинается с» (по началу слов), токены — Enter/запятая, чипы и Industry — можно несколько.
   Location / Company location / Company domain / Campaign status — в демо-таблице нет данных:
   выбираются и показываются в активных, но строки не отсекают. */
(function () {
  var panel = document.getElementById('filtersPanel');
  if (!panel) return;
  var body = document.getElementById('filtersBody');
  var table = document.querySelector('.grid tbody');

  var LABELS = {
    name: 'Name', email: 'Email', position: 'Position', location: 'Location',
    company: 'Company', industry: 'Industry', companyLocation: 'Company location', companyDomain: 'Company domain',
    emailStatus: 'Email status', emailDomain: 'Email domain', hasEmail: 'Email', hasLinkedin: 'LinkedIn',
    lists: 'List', tags: 'Tag', campaignProgress: 'Campaign', campaignEngaged: 'Campaign'
  };
  var state = {};
  function blank() {
    state = { name: '', email: '', position: '', location: [], company: [], industry: [], companyLocation: [], companyDomain: [],
      emailStatus: [], emailDomain: [], hasEmail: 'any', hasLinkedin: 'any', lists: [], tags: [], campaignProgress: [], campaignEngaged: [] };
  }
  blank();
  function isSet(k) { var v = state[k]; return Array.isArray(v) ? v.length > 0 : (k === 'hasEmail' || k === 'hasLinkedin') ? v !== 'any' : !!v.trim(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- данные строки таблицы ---------- */
  function rowData(tr) {
    if (tr._f) return tr._f;
    var meta = tr.querySelectorAll('.prospect__meta span');
    var txt = function (sel) { var el = tr.querySelector(sel); return el ? el.textContent.trim() : ''; };
    tr._f = {
      name: txt('.prospect__name'),
      position: meta[1] ? meta[1].textContent.trim() : '',
      company: txt('.col-company') || (meta[0] ? meta[0].textContent.trim() : ''),
      industry: txt('.col-company-industry'),
      emails: Array.prototype.map.call(tr.querySelectorAll('.email__addr'), function (e) { return e.textContent.trim().toLowerCase(); }),
      linkedin: !!tr.querySelector('.social'),
      tags: Array.prototype.map.call(tr.querySelectorAll('.tag'), function (t) { return t.firstChild ? t.firstChild.textContent.trim() : t.textContent.trim(); })
    };
    return tr._f;
  }
  function words(s) { return s.toLowerCase().split(/[\s.@,·/()-]+/).filter(Boolean); }
  function startsAll(text, q) { // каждое слово запроса совпадает с началом какого-то слова
    var w = words(text);
    return words(q).every(function (p) { return w.some(function (x) { return x.indexOf(p) === 0; }); });
  }
  function match(tr) {
    var d = rowData(tr);
    if (state.name.trim() && !startsAll(d.name, state.name)) return false;
    if (state.email.trim() && !d.emails.some(function (e) { return e.indexOf(state.email.trim().toLowerCase()) === 0; })) return false;
    if (state.position.trim() && !startsAll(d.position, state.position)) return false;
    if (state.company.length && !state.company.some(function (c) { return startsAll(d.company, c); })) return false;
    if (state.industry.length && state.industry.indexOf(d.industry) === -1) return false;
    if (state.emailDomain.length && !d.emails.some(function (e) { return state.emailDomain.some(function (dm) { return e.split('@')[1] === dm.toLowerCase(); }); })) return false;
    if (state.emailStatus.length && state.emailStatus.indexOf('Valid') === -1) return false; // в демо все email валидные
    if (state.hasEmail === 'has' && !d.emails.length) return false;
    if (state.hasEmail === 'no' && d.emails.length) return false;
    if (state.hasLinkedin === 'has' && !d.linkedin) return false;
    if (state.hasLinkedin === 'no' && d.linkedin) return false;
    if (state.lists.length && state.lists.indexOf('International Business') === -1) return false; // таблица — список International Business
    if (state.tags.length && !d.tags.some(function (t) { return state.tags.indexOf(t) !== -1; })) return false;
    return true;
  }

  /* ---------- применение ---------- */
  var timer = null;
  function apply() {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
    renderUI();
  }
  function run() {
    if (!table) return;
    Array.prototype.forEach.call(table.rows, function (tr) {
      if (tr.classList.contains('no-results')) return;
      tr.classList.toggle('is-filtered-out', !match(tr));
    });
    var n = window.recountProspects ? window.recountProspects() : null;
    var total = document.getElementById('prospectCount');
    var shown = n === null ? (total ? total.dataset.total || total.textContent : '') : n;
    document.getElementById('filtersCount').textContent = shown;
    document.getElementById('filtersShowCount').textContent = shown;
  }

  /* ---------- активные чипы и счётчики секций ---------- */
  var SECTIONS = {
    prospect: ['name', 'email', 'position', 'location'],
    company: ['company', 'industry', 'companyLocation', 'companyDomain'],
    contact: ['emailStatus', 'emailDomain', 'hasEmail', 'hasLinkedin'],
    lists: ['lists', 'tags'],
    campaign: ['campaignProgress', 'campaignEngaged']
  };
  function chipText(k) {
    var v = state[k];
    if (k === 'hasEmail' || k === 'hasLinkedin') return LABELS[k] + ': ' + (v === 'has' ? 'has' : 'none');
    if (Array.isArray(v)) return LABELS[k] + ': ' + (v.length > 2 ? v.slice(0, 2).join(', ') + ' +' + (v.length - 2) : v.join(', '));
    return LABELS[k] + ': ' + v.trim();
  }
  function renderUI() {
    var keys = Object.keys(state).filter(isSet);
    var bar = body.querySelector('.f-active');
    bar.hidden = !keys.length;
    bar.querySelector('.f-active__chips').innerHTML = keys.map(function (k) {
      return '<span class="f-active__chip" title="' + esc(chipText(k)) + '"><span>' + esc(chipText(k)) + '</span><button type="button" data-f-remove="' + k + '" aria-label="Remove ' + esc(LABELS[k]) + ' filter"><svg class="i i--16" aria-hidden="true"><use href="#i-close-tag-16"/></svg></button></span>';
    }).join('');
    Object.keys(SECTIONS).forEach(function (s) {
      var n = SECTIONS[s].filter(isSet).length;
      var sec = body.querySelector('[data-sec="' + s + '"]');
      var c = sec.querySelector('.f-sec__count');
      c.hidden = !n; c.textContent = n;
      sec.querySelector('.f-sec__reset').hidden = !n;
    });
  }

  /* ---------- синхронизация контролов с состоянием (после сброса) ---------- */
  function syncControls() {
    body.querySelectorAll('input.f-input[data-f]').forEach(function (i) { i.value = state[i.dataset.f]; });
    body.querySelectorAll('.f-tokens').forEach(renderTokens);
    body.querySelectorAll('.f-chips').forEach(function (g) {
      g.querySelectorAll('.f-chip').forEach(function (c) { c.setAttribute('aria-pressed', String(state[g.dataset.f].indexOf(c.dataset.v) !== -1)); });
    });
    body.querySelectorAll('.f-seg').forEach(function (g) {
      g.querySelectorAll('.f-seg__opt').forEach(function (o) { var on = o.dataset.v === state[g.dataset.f]; o.classList.toggle('is-on', on); o.setAttribute('aria-checked', String(on)); });
    });
    body.querySelectorAll('.f-ms').forEach(function (m) {
      m.querySelectorAll('input[type=checkbox]').forEach(function (c) { c.checked = state[m.dataset.f].indexOf(c.value) !== -1; });
      msLabel(m);
    });
  }
  function reset(keep) { // сбросить всё, кроме ключей keep
    var old = state; blank();
    keep.forEach(function (k) { state[k] = old[k]; });
    syncControls(); apply();
  }

  /* ---------- текстовые поля ---------- */
  body.querySelectorAll('input.f-input[data-f]').forEach(function (i) {
    i.addEventListener('input', function () { state[i.dataset.f] = i.value; apply(); });
  });

  /* ---------- токены ---------- */
  function renderTokens(box) {
    box.querySelectorAll('.f-token').forEach(function (t) { t.remove(); });
    var input = box.querySelector('.f-tokens__input');
    state[box.dataset.f].forEach(function (v, n) {
      input.insertAdjacentHTML('beforebegin', '<span class="f-token">' + esc(v) + '<button type="button" data-i="' + n + '" aria-label="Remove ' + esc(v) + '"><svg class="i i--16" aria-hidden="true"><use href="#i-close-tag-16"/></svg></button></span>');
    });
  }
  body.querySelectorAll('.f-tokens').forEach(function (box) {
    var input = box.querySelector('.f-tokens__input'), max = +box.dataset.max || 50, k = box.dataset.f;
    function add() {
      input.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (v) {
        if (state[k].length < max && state[k].map(function (x) { return x.toLowerCase(); }).indexOf(v.toLowerCase()) === -1) state[k].push(v);
      });
      input.value = ''; renderTokens(box); apply();
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
      else if (e.key === 'Backspace' && !input.value && state[k].length) { state[k].pop(); renderTokens(box); apply(); }
    });
    input.addEventListener('blur', function () { if (input.value.trim()) add(); });
    box.addEventListener('click', function (e) {
      var x = e.target.closest('.f-token button');
      if (x) { state[k].splice(+x.dataset.i, 1); renderTokens(box); apply(); input.focus(); return; }
      input.focus();
    });
  });

  /* ---------- чипы ---------- */
  body.querySelectorAll('.f-chips').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var c = e.target.closest('.f-chip'); if (!c) return;
      var arr = state[g.dataset.f], i = arr.indexOf(c.dataset.v);
      if (i === -1) arr.push(c.dataset.v); else arr.splice(i, 1);
      c.setAttribute('aria-pressed', String(i === -1));
      apply();
    });
  });

  /* ---------- сегменты ---------- */
  body.querySelectorAll('.f-seg').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var o = e.target.closest('.f-seg__opt'); if (!o) return;
      state[g.dataset.f] = o.dataset.v;
      g.querySelectorAll('.f-seg__opt').forEach(function (x) { x.classList.toggle('is-on', x === o); x.setAttribute('aria-checked', String(x === o)); });
      apply();
    });
  });

  /* ---------- мультиселект ---------- */
  function msLabel(m) {
    var v = state[m.dataset.f], el = m.querySelector('.f-ms__value');
    el.classList.toggle('is-empty', !v.length);
    el.textContent = !v.length ? 'Any' : v.length <= 2 ? v.join(', ') : v.length + ' selected';
  }
  body.querySelectorAll('.f-ms').forEach(function (m) {
    m.addEventListener('change', function (e) {
      if (e.target.type !== 'checkbox') return;
      var arr = state[m.dataset.f], i = arr.indexOf(e.target.value);
      if (e.target.checked && i === -1) arr.push(e.target.value);
      if (!e.target.checked && i !== -1) arr.splice(i, 1);
      msLabel(m); apply();
    });
    var search = m.querySelector('.f-ms__search');
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      m.querySelectorAll('.f-ms__opt').forEach(function (o) { o.classList.toggle('is-hidden', !!q && o.textContent.toLowerCase().indexOf(q) === -1); });
    });
  });

  /* ---------- секции, сбросы, удаление активных ---------- */
  body.addEventListener('click', function (e) {
    var t = e.target.closest('.f-sec__toggle');
    if (t) { var sec = t.closest('.f-sec'); var open = !sec.classList.contains('is-open'); sec.classList.toggle('is-open', open); t.setAttribute('aria-expanded', String(open)); return; }
    var r = e.target.closest('.f-sec__reset');
    if (r) { var s = r.closest('.f-sec').dataset.sec; reset(Object.keys(state).filter(function (k) { return SECTIONS[s].indexOf(k) === -1; })); return; }
    var rm = e.target.closest('[data-f-remove]');
    if (rm) { var k = rm.dataset.fRemove; reset(Object.keys(state).filter(function (x) { return x !== k; })); }
  });
  panel.addEventListener('click', function (e) { if (e.target.closest('[data-f-clear-all]')) reset([]); });

  renderUI();
  run();
})();
