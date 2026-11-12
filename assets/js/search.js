/* Search over substances (name + aliases, ko/en) and cases (title, ko/en). */
(function () {
  'use strict';

  function normalize(s) {
    return String(s === null || s === undefined ? '' : s).normalize('NFC').toLowerCase().trim();
  }

  function data() { return window.DOPING_DATA || {}; }

  function hit(q, values) {
    for (var i = 0; i < values.length; i++) {
      if (values[i] && normalize(values[i]).indexOf(q) !== -1) return true;
    }
    return false;
  }

  function search(query) {
    var q = normalize(query);
    var res = { substances: [], cases: [] };
    if (!q) return res;
    var subs = Array.isArray(data().substances) ? data().substances : [];
    var cases = Array.isArray(data().cases) ? data().cases : [];
    subs.forEach(function (s) {
      var vals = [];
      if (s.name) vals.push(s.name.ko, s.name.en);
      if (s.aliases) vals = vals.concat(s.aliases.ko || [], s.aliases.en || []);
      if (hit(q, vals)) res.substances.push(s);
    });
    cases.forEach(function (c) {
      var vals = c.title ? [c.title.ko, c.title.en] : [];
      if (hit(q, vals)) res.cases.push(c);
    });
    return res;
  }

  window.Search = { normalize: normalize, search: search };
})();
