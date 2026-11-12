#!/usr/bin/env node
// Generates data/<name>.js from data/<name>.json so index.html works over file://.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

for (const name of ['categories', 'substances', 'cases', 'news']) {
  const src = join(DATA, `${name}.json`);
  let value;
  if (name === 'news' && !existsSync(src)) value = { updatedAt: null, items: [] };
  else value = JSON.parse(readFileSync(src, 'utf8'));
  const out =
    'window.DOPING_DATA = window.DOPING_DATA || {};\n' +
    `window.DOPING_DATA.${name} = ${JSON.stringify(value)};\n`;
  writeFileSync(join(DATA, `${name}.js`), out, 'utf8');
  console.log(`wrote data/${name}.js`);
}
