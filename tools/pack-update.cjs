#!/usr/bin/env node
'use strict';
// pack-update.cjs - 产出「更新通道」需要的四件资产（平铺，供 GitHub Release / BRAT / 商店用）
// 用法: node tools/pack-update.cjs
// 判据: manifest.json / main.js / styles.css / versions.json 四件齐全，且与 plugin/ 源逐字节相同
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const MF = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugin', 'manifest.json'), 'utf8'));
const OUT = path.join(ROOT, 'dist', 'release', 'update', MF.version);
fs.mkdirSync(OUT, { recursive: true });
const src = (f) => path.join(ROOT, f);
const pairs = [
  ['plugin/manifest.json', 'manifest.json'],
  ['plugin/main.js', 'main.js'],
  ['plugin/styles.css', 'styles.css'],
  ['versions.json', 'versions.json'],
];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
let bad = 0;
for (const [from, to] of pairs) {
  const buf = fs.readFileSync(src(from));
  fs.writeFileSync(path.join(OUT, to), buf);
  const back = fs.readFileSync(path.join(OUT, to));
  const ok = sha(buf) === sha(back);
  if (!ok) bad += 1;
  console.log((ok ? 'PASS ' : 'FAIL ') + to + ' · ' + buf.length + 'B · sha ' + sha(buf).slice(0, 12));
}
console.log('[out] ' + path.relative(ROOT, OUT) + ' · 版本 ' + MF.version + ' · minAppVersion ' + MF.minAppVersion);
process.exit(bad ? 1 : 0);
