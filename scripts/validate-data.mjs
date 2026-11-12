#!/usr/bin/env node
// Validates data/*.json: schema, counts, referential integrity, content safety patterns.
// Usage: node scripts/validate-data.mjs [--content-only-warn]
//   --content-only-warn: content failures are reported as warnings (exit 0);
//   news.json schema errors still fail.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const contentOnlyWarn = process.argv.includes('--content-only-warn');

const contentErrors = [];
const newsErrors = [];
const warnings = [];

const EXPECTED_CODES = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'M1', 'M2', 'M3', 'P1'];
const CONCEPT_CODES = new Set(['S0', 'M2', 'M3']);
const STATUSES = new Set(['always', 'in-competition', 'particular-sports']);
const BODIES = new Set(['CAS', 'WADA', 'IF', 'NADO', 'court']);

const HARD_FAIL = [
  /\d+(\.\d+)?\s*(mg|µg|mcg|IU|ml|mL|g)\b/iu,
  /반감기|half-life|detection window|검출 기간|clearance/iu,
  /\b(cycle|cycling) of\b|\bstack(ing)?\b|\bdosage\b|\bdose\b/iu,
];
const WARN = [/회피|용량|evade|mask(?!ing agents)/iu];
// Official names/phrases removed before pattern checks.
const ALLOWLIST = [/Diuretics and Masking Agents/gu];

function readJson(name, required = true) {
  const p = join(DATA, name);
  if (!existsSync(p)) {
    if (required) contentErrors.push(`${name}: file missing`);
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    (name === 'news.json' ? newsErrors : contentErrors).push(`${name}: invalid JSON (${e.message})`);
    return undefined;
  }
}

const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isHttps = (u) => {
  try {
    return new URL(u).protocol === 'https:';
  } catch {
    return false;
  }
};

function checkBilingual(obj, where) {
  if (!isObj(obj)) {
    contentErrors.push(`${where}: missing {ko,en} object`);
    return;
  }
  for (const lang of ['ko', 'en']) {
    if (!isStr(obj[lang])) contentErrors.push(`${where}.${lang}: empty or missing`);
  }
}

function checkSources(sources, where) {
  if (!Array.isArray(sources) || sources.length < 1) {
    contentErrors.push(`${where}.sources: at least 1 required`);
    return;
  }
  sources.forEach((s, i) => {
    if (!isObj(s) || !isStr(s.title)) contentErrors.push(`${where}.sources[${i}].title: missing`);
    if (!isObj(s) || !isHttps(s.url)) contentErrors.push(`${where}.sources[${i}].url: must be https`);
  });
}

function scanText(text, where) {
  if (typeof text !== 'string') return;
  let t = text;
  for (const a of ALLOWLIST) t = t.replace(a, '');
  for (const re of HARD_FAIL) {
    const m = t.match(re);
    if (m) contentErrors.push(`${where}: safety hard-fail pattern ${re} matched "${m[0]}"`);
  }
  for (const re of WARN) {
    const m = t.match(re);
    if (m) warnings.push(`${where}: safety warn pattern ${re} matched "${m[0]}" (manual review)`);
  }
}

function scanAll(value, where) {
  if (typeof value === 'string') scanText(value, where);
  else if (Array.isArray(value)) value.forEach((v, i) => scanAll(v, `${where}[${i}]`));
  else if (isObj(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'url' || k === 'sourceUrl') continue;
      scanAll(v, `${where}.${k}`);
    }
  }
}

// --- categories ---
const catData = readJson('categories.json');
const catCodes = new Set();
if (catData !== undefined) {
  if (!isObj(catData)) contentErrors.push('categories.json: must be an object');
  else {
    if (!isStr(catData.listVersion)) contentErrors.push('categories.json: listVersion missing');
    const cats = Array.isArray(catData.categories) ? catData.categories : [];
    if (cats.length !== 14) contentErrors.push(`categories.json: expected 14 categories, got ${cats.length}`);
    cats.forEach((c, i) => {
      const w = `categories[${c?.code ?? i}]`;
      if (!isStr(c?.code)) contentErrors.push(`${w}.code: missing`);
      else if (catCodes.has(c.code)) contentErrors.push(`${w}: duplicate code`);
      else catCodes.add(c.code);
      checkBilingual(c?.name, `${w}.name`);
      checkBilingual(c?.description, `${w}.description`);
      if (!STATUSES.has(c?.status)) contentErrors.push(`${w}.status: invalid "${c?.status}"`);
      if (!isHttps(c?.sourceUrl)) contentErrors.push(`${w}.sourceUrl: must be https`);
      scanAll(c, w);
    });
    for (const code of EXPECTED_CODES) {
      if (!catCodes.has(code)) contentErrors.push(`categories.json: missing code ${code}`);
    }
    const s5 = cats.find((c) => c?.code === 'S5');
    if (s5 && s5.name?.en !== 'Diuretics and Masking Agents') {
      contentErrors.push('categories[S5].name.en: must be "Diuretics and Masking Agents"');
    }
  }
}

// --- substances ---
const subs = readJson('substances.json');
const subById = new Map();
if (subs !== undefined) {
  if (!Array.isArray(subs)) contentErrors.push('substances.json: must be an array');
  else {
    const perCat = new Map();
    subs.forEach((s, i) => {
      const w = `substances[${s?.id ?? i}]`;
      if (!isStr(s?.id)) contentErrors.push(`${w}.id: missing`);
      else if (subById.has(s.id)) contentErrors.push(`${w}: duplicate id`);
      else subById.set(s.id, s);
      if (!catCodes.has(s?.category)) contentErrors.push(`${w}.category: unknown "${s?.category}"`);
      perCat.set(s?.category, (perCat.get(s?.category) ?? 0) + 1);
      for (const f of ['name', 'effects', 'sideEffects', 'detection']) checkBilingual(s?.[f], `${w}.${f}`);
      if (!isObj(s?.aliases) || !Array.isArray(s.aliases.ko) || !Array.isArray(s.aliases.en)) {
        contentErrors.push(`${w}.aliases: ko and en arrays required`);
      } else {
        for (const lang of ['ko', 'en']) {
          s.aliases[lang].forEach((a, j) => {
            if (!isStr(a)) contentErrors.push(`${w}.aliases.${lang}[${j}]: empty`);
          });
        }
      }
      checkSources(s?.sources, w);
      if (!Array.isArray(s?.caseIds)) contentErrors.push(`${w}.caseIds: array required`);
      scanAll(s, w);
    });
    for (const code of EXPECTED_CODES) {
      const n = perCat.get(code) ?? 0;
      if (CONCEPT_CODES.has(code)) {
        if (n !== 1) contentErrors.push(`substances: ${code} must have exactly 1 concept entry, got ${n}`);
      } else if (n < 2 || n > 3) {
        contentErrors.push(`substances: ${code} must have 2-3 entries, got ${n}`);
      }
    }
    if (subs.length < 25 || subs.length > 30) {
      contentErrors.push(`substances: total must be 25-30, got ${subs.length}`);
    }
  }
}

// --- cases ---
const cases = readJson('cases.json');
const caseById = new Map();
if (cases !== undefined) {
  if (!Array.isArray(cases)) contentErrors.push('cases.json: must be an array');
  else {
    if (cases.length < 10) contentErrors.push(`cases: at least 10 required, got ${cases.length}`);
    cases.forEach((c, i) => {
      const w = `cases[${c?.id ?? i}]`;
      if (!isStr(c?.id)) contentErrors.push(`${w}.id: missing`);
      else if (caseById.has(c.id)) contentErrors.push(`${w}: duplicate id`);
      else caseById.set(c.id, c);
      if (!Number.isInteger(c?.year)) contentErrors.push(`${w}.year: integer required`);
      if (!isStr(c?.sport)) contentErrors.push(`${w}.sport: missing`);
      for (const f of ['title', 'summary', 'outcome']) checkBilingual(c?.[f], `${w}.${f}`);
      if (!isObj(c?.decision) || !BODIES.has(c.decision.body) || !isStr(c.decision.ref)) {
        contentErrors.push(`${w}.decision: body (CAS|WADA|IF|NADO|court) and ref required`);
      }
      if (!Array.isArray(c?.substanceIds) || c.substanceIds.length < 1) {
        contentErrors.push(`${w}.substanceIds: at least 1 required`);
      }
      checkSources(c?.sources, w);
      scanAll(c, w);
    });
  }
}

// --- referential integrity (both directions) ---
if (Array.isArray(subs) && Array.isArray(cases)) {
  for (const c of caseById.values()) {
    for (const sid of c.substanceIds ?? []) {
      const s = subById.get(sid);
      if (!s) contentErrors.push(`cases[${c.id}].substanceIds: unknown substance "${sid}"`);
      else if (!(s.caseIds ?? []).includes(c.id)) {
        contentErrors.push(`substances[${sid}].caseIds: missing back-reference to case "${c.id}"`);
      }
    }
  }
  for (const s of subById.values()) {
    for (const cid of s.caseIds ?? []) {
      const c = caseById.get(cid);
      if (!c) contentErrors.push(`substances[${s.id}].caseIds: unknown case "${cid}"`);
      else if (!(c.substanceIds ?? []).includes(s.id)) {
        contentErrors.push(`cases[${cid}].substanceIds: missing back-reference to substance "${s.id}"`);
      }
    }
  }
}

// --- news (optional; schema errors always fail) ---
const news = readJson('news.json', false);
let newsCount = 'absent';
if (news !== undefined) {
  if (!isObj(news)) newsErrors.push('news.json: must be an object');
  else {
    if (!(news.updatedAt === null || (isStr(news.updatedAt) && !Number.isNaN(Date.parse(news.updatedAt))))) {
      newsErrors.push('news.json: updatedAt must be an ISO date string or null');
    }
    if (!Array.isArray(news.items)) newsErrors.push('news.json: items must be an array');
    else {
      newsCount = news.items.length;
      news.items.forEach((it, i) => {
        const w = `news.items[${i}]`;
        if (!isObj(it)) {
          newsErrors.push(`${w}: must be an object`);
          return;
        }
        if (!isStr(it.title)) newsErrors.push(`${w}.title: missing`);
        if (!isHttps(it.url)) newsErrors.push(`${w}.url: must be https`);
        if (!isStr(it.source)) newsErrors.push(`${w}.source: missing`);
        if (!isStr(it.publishedAt) || Number.isNaN(Date.parse(it.publishedAt))) {
          newsErrors.push(`${w}.publishedAt: valid date string required`);
        }
        if (it.lang !== 'ko' && it.lang !== 'en') newsErrors.push(`${w}.lang: must be "ko" or "en"`);
      });
    }
  }
}

// --- summary ---
console.log('validate-data summary');
console.log(`  categories: ${catCodes.size} (listVersion: ${catData?.listVersion ?? 'missing'})`);
console.log(`  substances: ${subById.size}`);
console.log(`  cases:      ${caseById.size}`);
console.log(`  news items: ${newsCount}`);
for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of contentErrors) console.log(`${contentOnlyWarn ? 'WARN ' : 'FAIL '} ${e}`);
for (const e of newsErrors) console.log(`FAIL  ${e}`);
console.log(
  `  result: ${contentErrors.length} content error(s), ${newsErrors.length} news error(s), ${warnings.length} warning(s)` +
    (contentOnlyWarn ? ' [--content-only-warn]' : ''),
);

const failed = newsErrors.length > 0 || (!contentOnlyWarn && contentErrors.length > 0);
process.exit(failed ? 1 : 0);
