/* Safe DOM helpers: textContent only, https/internal hrefs only. */
(function () {
  'use strict';

  function safeHref(url) {
    if (typeof url !== 'string') return null;
    var u = url.trim();
    if (u.indexOf('#/') === 0) return u;
    try {
      var p = new URL(u);
      return p.protocol === 'https:' ? p.href : null;
    } catch (e) {
      return null;
    }
  }

  /* Images: only local files under assets/img/ with an image extension. */
  function safeImgSrc(src) {
    if (typeof src !== 'string') return null;
    return /^assets\/img\/[A-Za-z0-9_\-\/]+\.(png|jpe?g|gif|svg|webp)$/.test(src) && src.indexOf('..') === -1 ? src : null;
  }

  function append(node, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(node, c); }); return; }
    if (typeof child === 'string' || typeof child === 'number') {
      node.appendChild(document.createTextNode(String(child)));
    } else if (child.nodeType) {
      node.appendChild(child);
    }
  }

  /* el('a', {class:'x', href:'#/', on:{click:fn}}, children...) */
  function el(tag, props) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = String(v);
        else if (k === 'href') {
          var h = safeHref(v);
          if (h) node.setAttribute('href', h);
        } else if (k === 'src') {
          var s = safeImgSrc(v);
          if (s) node.setAttribute('src', s);
        } else if (k === 'on') {
          Object.keys(v).forEach(function (ev) { node.addEventListener(ev, v[ev]); });
        } else if (/^on/i.test(k)) {
          return; // never allow inline handler attributes
        } else if (k === 'value') node.value = String(v);
        else node.setAttribute(k, v === true ? '' : String(v));
      });
    }
    for (var i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }

  /* External link: https only, new tab. Plain text span if the URL is unsafe. */
  function extLink(url, label, cls) {
    var h = safeHref(url);
    if (!h || h.charAt(0) === '#') return el('span', { class: cls }, label);
    return el('a', { href: h, target: '_blank', rel: 'noopener noreferrer', class: cls }, label);
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  window.DomUtil = { el: el, extLink: extLink, safeHref: safeHref, safeImgSrc: safeImgSrc, clear: clear };
})();
