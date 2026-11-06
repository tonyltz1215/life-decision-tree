#!/usr/bin/env node
'use strict';
// check-update.cjs - 检查「发新版本后用户能不能收到更新」的通道是否成立
// 用法: node tools/check-update.cjs [--repo owner/name]
// 退出码: 0=通道成立  1=有缺项（逐条 PASS/FAIL）
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const REPO = arg('repo', '');
let bad = 0;
const ok = (n, c, x) => { if (c) console.log('PASS ' + n + (x ? ' · ' + x : '')); else { bad += 1; console.log('FAIL ' + n + (x ? ' · ' + x : '')); } };
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return ''; } };
const MF = JSON.parse(read('plugin/manifest.json') || '{}');
ok('1-1 manifest 有 id/version/minAppVersion', !!(MF.id && MF.version && MF.minAppVersion), [MF.id, MF.version, MF.minAppVersion].join(' / '));
const V = JSON.parse(read('versions.json') || '{}');
ok('1-2 versions.json 覆盖当前版本', !!V[MF.version], JSON.stringify(V));
const upd = path.join(ROOT, 'dist', 'release', 'update', MF.version);
const need = ['manifest.json', 'main.js', 'styles.css', 'versions.json'];
const miss = need.filter((f) => !fs.existsSync(path.join(upd, f)));
ok('1-3 更新资产四件齐（dist/release/update/<ver>/）', miss.length === 0, miss.length ? '缺 ' + miss.join(',') : need.join(' / '));
const doc = read('docs/安装说明-陌生人版-v1-20261105.md');
ok('1-4 安装说明写了「怎么收到更新」', /更新|升级/.test(doc), /更新|升级/.test(doc) ? '有更新段' : '缺更新段（用户装完不知道新版）');
const guide = read('docs/手册-用户版-v1-20261106.md');
ok('1-5 用户手册写了更新路径', /更新|升级/.test(guide), /更新|升级/.test(guide) ? '有' : '缺');
ok('1-6 分发通道已配置（--repo 或 manifest.authorUrl）', !!REPO || !!MF.authorUrl, REPO || MF.authorUrl || '无 repo / 无 authorUrl ⇒ 没有托管源，Obsidian 查不到新版本');
ok('1-7 社区商店收录（需要 GitHub 公共仓 + obsidian-releases PR）', false, '未收录：侧载插件不会收到「更新」提示');
console.log(bad ? 'FAIL check-update · ' + bad + ' 项未成立 ⇒ 现在发出去，用户收不到更新消息' : 'PASS check-update · 通道成立');
process.exit(bad ? 1 : 0);
