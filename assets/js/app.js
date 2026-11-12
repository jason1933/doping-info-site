/* Hash router and views. */
(function () {
  'use strict';

  var el = DomUtil.el;
  var t = function (k) { return I18N.t(k); };
  var pick = function (o) { return I18N.pick(o); };

  var WADA_URL = 'https://www.wada-ama.org/en/prohibited-list';
  var newsFilter = 'all';
  var appEl = document.getElementById('app');
  var headerEl = document.getElementById('site-header');
  var footerEl = document.getElementById('site-footer');
  var skipEl = document.getElementById('skip-link');

  /* ---------- data access ---------- */
  function D() { return window.DOPING_DATA || {}; }
  function categoriesObj() { var c = D().categories; return c && Array.isArray(c.categories) ? c : { listVersion: '', categories: [] }; }
  function categories() { return categoriesObj().categories; }
  function substances() { return Array.isArray(D().substances) ? D().substances : []; }
  function cases() { return Array.isArray(D().cases) ? D().cases : []; }
  function newsObj() { var n = D().news; return n && Array.isArray(n.items) ? n : { updatedAt: '', items: [] }; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function catByCode(code) { var l = categories(); for (var i = 0; i < l.length; i++) if (l[i].code === code) return l[i]; return null; }

  function ts(s) { var n = Date.parse(s); return isNaN(n) ? 0 : n; }
  function fmtDate(s) {
    var n = Date.parse(s);
    if (isNaN(n)) return String(s || '');
    try { return new Date(n).toLocaleDateString(I18N.lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return String(s).slice(0, 10); }
  }
  function fmtDateTime(s) {
    var n = Date.parse(s);
    if (isNaN(n)) return String(s || '');
    try { return new Date(n).toLocaleString(I18N.lang === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (e) { return String(s); }
  }

  /* ---------- routing ---------- */
  function parseHash() {
    var h = location.hash || '';
    if (h.charAt(0) === '#') h = h.slice(1);
    if (!h) h = '/';
    var qi = h.indexOf('?');
    var path = qi === -1 ? h : h.slice(0, qi);
    var qs = qi === -1 ? '' : h.slice(qi + 1);
    var q = '';
    var m = /(?:^|&)q=([^&]*)/.exec(qs);
    if (m) { try { q = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { q = m[1]; } }
    var parts = path.split('/').filter(function (p) { return p !== ''; }).map(function (p) {
      try { return decodeURIComponent(p); } catch (e) { return p; }
    });
    return { parts: parts, q: q };
  }

  function href(path) { return '#/' + path; }
  function link(path, label, cls) { return el('a', { href: href(path), class: cls }, label); }
  function idHref(kind, id) { return kind + '/' + encodeURIComponent(id); }

  /* ---------- shared pieces ---------- */
  function setTitle(s) {
    document.title = s ? s + ' | ' + t('docTitleSuffix') : t('docTitleSuffix');
  }

  function statusBadge(status) {
    var key = 'status_' + String(status || '').replace(/-/g, '_');
    var label = t(key);
    if (label === key) return null;
    return el('span', { class: 'badge badge-' + status }, label);
  }

  function section(titleText, children, id) {
    var h = id || null;
    return el('section', { class: 'block', 'aria-labelledby': h }, el('h2', { id: h }, titleText), children);
  }

  function para(text) { return el('p', { class: 'prose' }, text); }

  function sourceList(sources) {
    if (!Array.isArray(sources) || !sources.length) return el('p', { class: 'muted' }, t('none'));
    return el('ul', { class: 'source-list' }, sources.map(function (s) {
      return el('li', null, DomUtil.extLink(s.url, s.title || s.url));
    }));
  }

  function message(text) { return el('p', { class: 'empty' }, text); }

  function pageHeader(title, lead) {
    return el('div', { class: 'page-head' }, el('h1', { id: 'page-title', tabindex: '-1' }, title), lead ? el('p', { class: 'lead' }, lead) : null);
  }

  function substanceCard(s) {
    var cat = catByCode(s.category);
    return el('li', null, el('a', { class: 'card', href: href(idHref('substance', s.id)) },
      el('span', { class: 'card-code' }, s.category || ''),
      el('span', { class: 'card-title' }, pick(s.name)),
      cat ? el('span', { class: 'card-sub' }, pick(cat.name)) : null));
  }

  function caseCard(c) {
    return el('li', null, el('a', { class: 'card', href: href(idHref('case', c.id)) },
      el('span', { class: 'card-code' }, String(c.year || '')),
      el('span', { class: 'card-title' }, pick(c.title)),
      el('span', { class: 'card-sub' }, c.sport || '')));
  }

  function categoryCard(c) {
    return el('li', null, el('a', { class: 'card', href: href(idHref('category', c.code)) },
      el('span', { class: 'card-code' }, c.code),
      el('span', { class: 'card-title' }, pick(c.name)),
      statusBadge(c.status)));
  }

  function newsList(items) {
    if (!items.length) return message(t('noNews'));
    return el('ul', { class: 'news-list' }, items.map(function (n) {
      return el('li', { class: 'news-item' },
        DomUtil.extLink(n.url, n.title || n.url, 'news-title'),
        el('span', { class: 'news-meta' },
          el('span', null, n.source || ''),
          el('span', null, fmtDate(n.publishedAt)),
          el('span', { class: 'lang-tag' }, String(n.lang || '').toUpperCase())));
    }));
  }

  function sortedNews() {
    return newsObj().items.slice().sort(function (a, b) { return ts(b.publishedAt) - ts(a.publishedAt); });
  }

  /* ---------- views ---------- */
  function viewHome() {
    setTitle('');
    var cats = categories();
    var news = sortedNews().slice(0, 5);
    var cs = cases();
    return [
      el('div', { class: 'hero' },
        el('h1', { id: 'page-title', tabindex: '-1' }, t('homeTitle')),
        el('p', { class: 'lead' }, t('homeIntro'))),
      section(t('latestNews'), [
        el('p', { class: 'notice' }, t('newsNotice')),
        newsList(news),
        el('p', null, link('news', t('moreNews'), 'more-link'))
      ], 'h-news'),
      section(t('categoriesHeading'), cats.length
        ? el('ul', { class: 'card-grid' }, cats.map(categoryCard)) : message(t('dataMissing')), 'h-cats'),
      section(t('casesHeading'), [
        para(t('casesLead')),
        cs.length ? null : message(t('dataMissing')),
        el('p', null, link('cases', t('viewCases'), 'more-link'))
      ], 'h-cases')
    ];
  }

  function viewCategories() {
    setTitle(t('categoriesTitle'));
    var cats = categories();
    return [pageHeader(t('categoriesTitle'), t('categoriesLead')),
      cats.length ? el('ul', { class: 'card-grid' }, cats.map(categoryCard)) : message(t('dataMissing'))];
  }

  function viewCategory(code) {
    var c = catByCode(code);
    if (!c) return viewNotFound();
    setTitle(c.code + ' ' + pick(c.name));
    var subs = substances().filter(function (s) { return s.category === c.code; });
    return [
      el('p', { class: 'crumb' }, link('categories', '← ' + t('categoriesTitle'))),
      el('div', { class: 'page-head' },
        el('h1', { id: 'page-title', tabindex: '-1' }, el('span', { class: 'code-pill' }, c.code), ' ', pick(c.name)),
        el('p', null, el('span', { class: 'muted' }, t('statusLabel') + ': '), statusBadge(c.status))),
      para(pick(c.description)),
      c.sourceUrl ? el('p', null, DomUtil.extLink(c.sourceUrl, t('officialSource'))) : null,
      section(t('substancesInCategory'), subs.length ? el('ul', { class: 'card-grid' }, subs.map(substanceCard)) : message(t('noSubstances')), 'h-subs')
    ];
  }

  function viewSubstances() {
    setTitle(t('navSubstances'));
    var cats = categories();
    var subs = substances();
    if (!subs.length && !cats.length) return [pageHeader(t('navSubstances')), message(t('dataMissing'))];
    var out = [pageHeader(t('navSubstances'), t('categoriesLead'))];
    cats.forEach(function (c) {
      var list = subs.filter(function (s) { return s.category === c.code; });
      out.push(el('section', { class: 'block' },
        el('h2', null, link(idHref('category', c.code), c.code + ' ' + pick(c.name))),
        list.length ? el('ul', { class: 'card-grid' }, list.map(substanceCard)) : message(t('noSubstances'))));
    });
    return out;
  }

  function viewSubstance(id) {
    var s = byId(substances(), id);
    if (!s) return viewNotFound();
    setTitle(pick(s.name));
    var cat = catByCode(s.category);
    var aliases = I18N.pickList(s.aliases);
    var related = (s.caseIds || []).map(function (cid) { return byId(cases(), cid); }).filter(Boolean);
    return [
      el('p', { class: 'crumb' },
        link('categories', '← ' + t('categoriesTitle')),
        cat ? [' / ', link(idHref('category', cat.code), cat.code + ' ' + pick(cat.name))] : null),
      el('div', { class: 'page-head' },
        el('h1', { id: 'page-title', tabindex: '-1' }, pick(s.name)),
        cat ? el('p', null, el('span', { class: 'code-pill' }, cat.code), ' ', statusBadge(cat.status)) : null,
        aliases.length ? el('p', { class: 'muted' }, t('aliases') + ': ' + aliases.join(', ')) : null),
      section(t('effects'), para(pick(s.effects)), 'h-eff'),
      section(t('sideEffects'), para(pick(s.sideEffects)), 'h-side'),
      section(t('detection'), para(pick(s.detection)), 'h-det'),
      section(t('relatedCases'), related.length ? el('ul', { class: 'card-grid' }, related.map(caseCard)) : message(t('none')), 'h-rc'),
      section(t('sources'), sourceList(s.sources), 'h-src')
    ];
  }

  function viewCases() {
    setTitle(t('casesTitle'));
    var list = cases().slice().sort(function (a, b) { return (a.year || 0) - (b.year || 0); });
    return [pageHeader(t('casesTitle'), t('casesLead')),
      list.length ? el('ul', { class: 'card-grid' }, list.map(caseCard)) : message(t('dataMissing'))];
  }

  function viewCase(id) {
    var c = byId(cases(), id);
    if (!c) return viewNotFound();
    setTitle(pick(c.title));
    var rel = (c.substanceIds || []).map(function (sid) { return byId(substances(), sid); }).filter(Boolean);
    var d = c.decision || {};
    return [
      el('p', { class: 'crumb' }, link('cases', '← ' + t('casesTitle'))),
      el('div', { class: 'page-head' },
        el('h1', { id: 'page-title', tabindex: '-1' }, pick(c.title)),
        el('p', { class: 'muted' }, t('year') + ': ' + (c.year || '') + '  ·  ' + t('sport') + ': ' + (c.sport || ''))),
      section(t('summary'), para(pick(c.summary)), 'h-sum'),
      section(t('outcome'), para(pick(c.outcome)), 'h-out'),
      section(t('decision'), el('dl', { class: 'kv' },
        el('dt', null, t('decisionBody')), el('dd', null, d.body || ''),
        el('dt', null, t('decisionRef')), el('dd', null, d.ref || '')), 'h-dec'),
      section(t('relatedSubstances'), rel.length ? el('ul', { class: 'card-grid' }, rel.map(substanceCard)) : message(t('none')), 'h-rs'),
      section(t('sources'), sourceList(c.sources), 'h-src')
    ];
  }

  function viewNews() {
    setTitle(t('newsTitle'));
    var n = newsObj();
    var items = sortedNews().filter(function (i) { return newsFilter === 'all' || i.lang === newsFilter; });
    var filters = ['all', 'ko', 'en'].map(function (f) {
      var label = f === 'all' ? t('filterAll') : (f === 'ko' ? t('filterKo') : t('filterEn'));
      return el('button', {
        type: 'button', class: 'chip', 'aria-pressed': newsFilter === f ? 'true' : 'false',
        on: { click: function () { newsFilter = f; render(true); } }
      }, label);
    });
    return [
      pageHeader(t('newsTitle')),
      el('p', { class: 'notice', role: 'note' }, t('newsNotice')),
      n.updatedAt ? el('p', { class: 'muted' }, t('newsUpdated') + ': ', el('time', { datetime: n.updatedAt }, fmtDateTime(n.updatedAt))) : null,
      el('div', { class: 'chips', role: 'group', 'aria-label': t('filterLabel') }, filters),
      newsList(items)
    ];
  }

  function viewSearch(q) {
    setTitle(t('searchTitle') + (q ? ': ' + q : ''));
    var out = [pageHeader(t('searchTitle'))];
    if (!q.trim()) { out.push(message(t('searchEmptyQuery'))); return out; }
    var r = Search.search(q);
    out.push(el('p', { class: 'muted' }, t('searchFor') + ': ' + q + '  (' + (r.substances.length + r.cases.length) + t('resultsCount') + ')'));
    if (!r.substances.length && !r.cases.length) { out.push(message(t('noResults'))); return out; }
    if (r.substances.length) out.push(section(t('substances') + ' (' + r.substances.length + ')', el('ul', { class: 'card-grid' }, r.substances.map(substanceCard)), 'h-rs'));
    if (r.cases.length) out.push(section(t('casesTitle') + ' (' + r.cases.length + ')', el('ul', { class: 'card-grid' }, r.cases.map(caseCard)), 'h-rc'));
    return out;
  }

  function viewNotFound() {
    setTitle(t('notFoundTitle'));
    return [pageHeader(t('notFoundTitle'), t('notFoundText')), el('p', null, link('', t('backHome'), 'more-link'))];
  }

  function route(r) {
    var p = r.parts;
    if (!p.length) return viewHome();
    switch (p[0]) {
      case 'categories': return p.length === 1 ? viewCategories() : viewNotFound();
      case 'category': return p.length === 2 ? viewCategory(p[1]) : viewNotFound();
      case 'substances': return p.length === 1 ? viewSubstances() : viewNotFound();
      case 'substance': return p.length === 2 ? viewSubstance(p[1]) : viewNotFound();
      case 'cases': return p.length === 1 ? viewCases() : viewNotFound();
      case 'case': return p.length === 2 ? viewCase(p[1]) : viewNotFound();
      case 'news': return p.length === 1 ? viewNews() : viewNotFound();
      case 'search': return p.length === 1 ? viewSearch(r.q) : viewNotFound();
      default: return viewNotFound();
    }
  }

  /* ---------- chrome: header / footer ---------- */
  function navLink(path, label, current) {
    var props = { href: href(path), class: 'nav-link' };
    if (current) props['aria-current'] = 'page';
    return el('a', props, label);
  }

  function renderHeader(r) {
    var top = r.parts[0] || '';
    var section_ = { '': 'home', categories: 'sub', category: 'sub', substances: 'sub', substance: 'sub', cases: 'cases', 'case': 'cases', news: 'news' }[top];
    var input = el('input', {
      type: 'search', name: 'q', id: 'q', class: 'search-input', autocomplete: 'off',
      placeholder: t('searchPlaceholder'), 'aria-label': t('searchLabel'), value: top === 'search' ? r.q : ''
    });
    var form = el('form', {
      class: 'search-form', role: 'search',
      on: { submit: function (e) {
        e.preventDefault();
        var v = input.value.trim();
        location.hash = '#/search?q=' + encodeURIComponent(v);
      } }
    }, input, el('button', { type: 'submit', class: 'btn' }, t('searchBtn')));

    var langBtn = el('button', {
      type: 'button', class: 'btn btn-ghost lang-btn', 'aria-label': t('langBtnLabel'),
      on: { click: function () { I18N.toggle(); } }
    }, t('langBtn'));

    DomUtil.clear(headerEl);
    headerEl.appendChild(el('div', { class: 'container header-inner' },
      el('a', { class: 'brand', href: href('') }, el('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'A'), el('span', null, t('siteName'))),
      el('nav', { class: 'nav', 'aria-label': t('navMain') },
        navLink('', t('navHome'), section_ === 'home'),
        navLink('substances', t('navSubstances'), section_ === 'sub'),
        navLink('cases', t('navCases'), section_ === 'cases'),
        navLink('news', t('navNews'), section_ === 'news')),
      form, langBtn));
    skipEl.textContent = t('skip');
  }

  function renderFooter() {
    var c = categoriesObj();
    DomUtil.clear(footerEl);
    footerEl.appendChild(el('div', { class: 'container footer-inner' },
      el('p', null, t('footerSources') + ' ',
        DomUtil.extLink(WADA_URL, t('footerWada')),
        c.listVersion ? ' · ' + t('footerList') + ': ' + c.listVersion : ''),
      el('p', { class: 'footer-strong' }, t('footerMedical')),
      el('p', null, t('footerEdu'))));
  }

  /* ---------- render ---------- */
  function render(keepScroll) {
    var r = parseHash();
    renderHeader(r);
    renderFooter();
    var nodes;
    try { nodes = route(r); }
    catch (e) { nodes = [message(t('dataMissing'))]; }
    DomUtil.clear(appEl);
    [].concat(nodes).forEach(function (n) { if (n) appEl.appendChild(n); });
    if (!keepScroll) {
      window.scrollTo(0, 0);
      var h = document.getElementById('page-title');
      if (h && h.focus) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
    }
  }

  window.addEventListener('hashchange', function () { render(false); });
  I18N.onChange(function () { render(true); });
  render(true);
})();
