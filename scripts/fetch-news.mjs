// Fetches Google News RSS (en/ko) and merges into data/news.json.
// Zero dependencies. Always exits 0; failures are logged to stderr.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FEEDS = {
  en: process.env.NEWS_FEED_EN || 'https://news.google.com/rss/search?q=doping+athlete&hl=en-US&gl=US&ceid=US:en',
  ko: process.env.NEWS_FEED_KO || 'https://news.google.com/rss/search?q=%EB%8F%84%ED%95%91+%EC%84%A0%EC%88%98&hl=ko&gl=KR&ceid=KR:ko',
};
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'news.json');
const TIMEOUT_MS = 15000;
const MAX_AGE_DAYS = 30;
const MAX_PER_LANG = 50; // 2 languages -> max 100 total
const UA = 'Mozilla/5.0 (compatible; EducationalNewsFetcher/1.0)';

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => safeCp(parseInt(h, 16), m))
    .replace(/&#(\d+);/g, (m, d) => safeCp(parseInt(d, 10), m))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in NAMED ? NAMED[n.toLowerCase()] : m));
}
function safeCp(cp, fallback) {
  try { return String.fromCodePoint(cp); } catch { return fallback; }
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  if (!m) return '';
  let v = m[1].trim();
  const c = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (c) return c[1].trim();
  return decode(v).trim();
}
function normKey(t) {
  return t.normalize('NFC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function parseFeed(xml, lang) {
  const items = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const b = m[0];
    let title = tag(b, 'title');
    const url = tag(b, 'link');
    const source = tag(b, 'source');
    const d = new Date(tag(b, 'pubDate'));
    if (!title || !/^https:\/\//i.test(url) || isNaN(d)) continue;
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3)).trim();
    if (!title) continue;
    items.push({ title, url, source, publishedAt: d.toISOString(), lang });
  }
  return items;
}

async function fetchLang(lang) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(FEEDS[lang], { signal: ctl.signal, headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseFeed(await res.text(), lang);
  } finally {
    clearTimeout(timer);
  }
}

function mergeLang(existing, fresh) {
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
  const seenUrl = new Set();
  const seenTitle = new Set();
  const out = [];
  for (const it of [...fresh, ...existing]) {
    const k = normKey(it.title);
    if (seenUrl.has(it.url) || seenTitle.has(k)) continue;
    if (new Date(it.publishedAt).getTime() < cutoff) continue;
    seenUrl.add(it.url);
    seenTitle.add(k);
    out.push(it);
  }
  out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return out.slice(0, MAX_PER_LANG);
}

async function main() {
  let existing = { updatedAt: null, items: [] };
  try {
    const parsed = JSON.parse(readFileSync(OUT, 'utf8'));
    if (parsed && Array.isArray(parsed.items)) existing = parsed;
  } catch { /* no usable file yet */ }

  const result = {};
  let updated = 0;
  for (const lang of ['en', 'ko']) {
    const old = existing.items.filter((i) => i.lang === lang);
    try {
      const fresh = await fetchLang(lang);
      if (fresh.length === 0) throw new Error('0 items parsed');
      result[lang] = mergeLang(old, fresh);
      updated++;
      console.log(`[${lang}] fetched ${fresh.length}, kept ${result[lang].length}`);
    } catch (e) {
      console.error(`WARN [${lang}] feed failed (${e.message}); keeping ${old.length} existing items`);
      result[lang] = old;
    }
  }

  if (updated === 0) {
    console.error('WARN both feeds failed; news.json left untouched');
    return;
  }
  const items = [...result.en, ...result.ko].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2) + '\n');
  console.log(`wrote ${items.length} items (en ${result.en.length}, ko ${result.ko.length})`);
}

main().catch((e) => console.error('WARN unexpected error:', e)).finally(() => { process.exitCode = 0; });
