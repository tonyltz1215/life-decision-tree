#!/usr/bin/env node
'use strict';
// sync-root.cjs - 把 plugin/ 的发布件同步到仓库根（Obsidian 商店要求根目录有 manifest.json）
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const pairs = [['plugin/manifest.json','manifest.json'],['plugin/main.js','main.js'],['plugin/styles.css','styles.css']];
let bad = 0;
for (const [from, to] of pairs) {
  fs.copyFileSync(path.join(ROOT, from), path.join(ROOT, to));
  const ok = sha(path.join(ROOT, from)) === sha(path.join(ROOT, to));
  if (!ok) bad += 1;
  console.log((ok ? 'PASS ' : 'FAIL ') + to + ' ← ' + from);
}
const MF = JSON.parse(fs.readFileSync(path.join(ROOT, 'plugin/manifest.json'), 'utf8'));
const VP = path.join(ROOT, 'versions.json');
const V = fs.existsSync(VP) ? JSON.parse(fs.readFileSync(VP, 'utf8')) : {};
if (!V[MF.version]) { V[MF.version] = MF.minAppVersion; fs.writeFileSync(VP, JSON.stringify(V, null, 2) + '\n'); console.log('PASS versions.json 补 ' + MF.version + ' → ' + MF.minAppVersion); }
else { console.log('PASS versions.json 已含 ' + MF.version); }
process.exit(bad ? 1 : 0);
