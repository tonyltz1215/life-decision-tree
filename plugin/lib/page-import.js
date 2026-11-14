/* page-import.js - 导入更新页（纯字符串；锚点按 NEG-IMPORT-FINAL） */
'use strict';
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
const STEPS = [['paste', '粘贴'], ['validate', '校验'], ['diff', '差异'], ['merge', '合并']];
const VECTORS = {
  empty: ['active', 'todo', 'todo', 'todo'],
  error: ['done', 'error', 'todo', 'todo'],
  blocked: ['done', 'error', 'todo', 'todo'],
  diff: ['done', 'done', 'active', 'todo'],
  merged: ['done', 'done', 'done', 'done']
};
function stepsHtml(state) {
  const v = VECTORS[state] || VECTORS.empty;
  return STEPS.map(function (s, i) {
    return '<div class="ldt-step2' + (v[i] === 'done' ? ' is-done' : (v[i] === 'active' ? ' is-on' : (v[i] === 'error' ? ' is-err' : ''))) + '" data-step="' + s[0] + '" data-state="' + v[i] + '"><i>' + (i + 1) + '</i>' + s[1] + '</div>';
  }).join('<span class="ldt-step-sep">→</span>');
}
function findingsHtml(findings) {
  if (!findings || !findings.length) { return ''; }
  return '<ul class="ldt-findings" data-n="' + findings.length + '">' + findings.map(function (f) {
    const path = f.path || f.where || '$';
    return '<li class="' + (f.blocking ? 'is-block' : 'is-warn') + '" data-code="' + esc(f.code) + '" data-path="' + esc(path) + '"><code>' + esc(f.code) + '</code><span class="ldt-path">' + esc(path) + '</span><span class="ldt-msg">' + esc(f.msg || '') + '</span></li>';
  }).join('') + '</ul>';
}
function countLabel(k, n) {
  const names = { 'new-skills': '新增技能', 'updated-skills': '修改技能', 'new-levels': '新增关卡', 'unlocked-levels': '解锁关卡', 'new-routes': '新增路由' };
  return '<span class="ldt-diff-cell"><b class="ldt-diff-k">' + names[k] + '</b> <b data-k="' + k + '" class="ldt-diff-n">' + (n || 0) + '</b></span>';
}
function diffHtml(counts) {
  const c = counts || {};
  return '<div class="ldt-diff" data-diff="1">' + ['new-skills', 'updated-skills', 'new-levels', 'unlocked-levels', 'new-routes'].map(function (k) { return countLabel(k, c[k]); }).join('') + '</div>';
}
// 独立复算差异（不采信入参 diff，按契约定义）
function diffCounts(prev, next) {
  const P = prev || {}; const N = next || {};
  const byId = function (arr) { const m = Object.create(null); (arr || []).forEach(function (x) { if (x && x.id) { m[x.id] = x; } }); return m; };
  const ps = byId(P.skills); const ns = byId(N.skills);
  const pl = byId(P.levels); const nl = byId(N.levels);
  const pr = byId(P.routes); const nr = byId(N.routes);
  const out = { 'new-skills': 0, 'updated-skills': 0, 'new-levels': 0, 'unlocked-levels': 0, 'new-routes': 0 };
  Object.keys(ns).forEach(function (id) { if (!ps[id]) { out['new-skills']++; } else if (JSON.stringify(ps[id]) !== JSON.stringify(ns[id])) { out['updated-skills']++; } });
  Object.keys(nl).forEach(function (id) { if (!pl[id]) { out['new-levels']++; } else if (pl[id].status === 'locked' && nl[id].status === 'open') { out['unlocked-levels']++; } });
  Object.keys(nr).forEach(function (id) { if (!pr[id]) { out['new-routes']++; } });
  return out;
}
// 合并写盘用：同 id 覆盖、未提项保留
function mergeForWrite(prev, next) {
  const out = JSON.parse(JSON.stringify(prev || {}));
  ['skills', 'levels', 'routes'].forEach(function (k) {
    const cur = Array.isArray(out[k]) ? out[k] : [];
    const idx = Object.create(null); cur.forEach(function (x, i) { if (x && x.id) { idx[x.id] = i; } });
    (Array.isArray(next[k]) ? next[k] : []).forEach(function (x) {
      if (!x || !x.id) { return; }
      if (x.id in idx) { cur[idx[x.id]] = JSON.parse(JSON.stringify(x)); } else { cur.push(JSON.parse(JSON.stringify(x))); idx[x.id] = cur.length - 1; }
    });
    out[k] = cur;
  });
  if (next.generated_at) { out.generated_at = next.generated_at; }
  if (next.summary != null) { out.summary = next.summary; }
  if (Array.isArray(next.domains) && next.domains.length) { out.domains = next.domains.slice(); }
  return out;
}

function buildImportHtml(o) {
  const opts = o || {};
  const st = opts.state || 'empty';
  const findings = opts.findings || [];
  const text = opts.text || '';
  const canMerge = st === 'diff';
  const body = [];
  if (st === 'error' || st === 'blocked') {
    body.push('<div class="ldt-refusal" data-panel="' + st + '"><b>' + (st === 'error' ? '⛔ JSON 解析失败' : '⛔ 七码未过，未写盘') + '</b>' + findingsHtml(findings) + '</div>');
  }
  if (st === 'diff') { body.push(diffHtml(opts.counts)); if (opts.fileSha) { body.push('<div class="ldt-auth">第 8 码 · 文件指纹 sha256：<code>' + String(opts.fileSha).slice(0,16) + '…</code> ｜ 声明：' + (opts.auth === 'match' ? '✓ 匹配' : (opts.auth === 'mismatch' ? '✗ 不匹配' : '未声明（仅本地指纹）')) + '</div>'); } body.push('<div class="ldt-ok-line">✓ 校验通过，确认后才写盘</div>'); }
  if (st === 'merged') {
    const pk = opts.stats || {};
    body.push('<div class="ldt-done" data-panel="merged"><b>✓ 已合并到 .ldt/assets.json</b>'
      + '<div class="ldt-stats">技能 <b data-k="pack-skills">' + (pk.skills || 0) + '</b> ｜ 关卡 <b data-k="pack-levels">' + (pk.levels || 0) + '</b> ｜ 路由 <b data-k="pack-routes">' + (pk.routes || 0) + '</b></div>'
      + '<div class="ldt-import-act"><span class="ldt-btn" data-act="import-goto-assets" data-target="assets">去资产库看 →</span></div></div>');
  }
  const mergeBtn = canMerge
    ? '<span class="ldt-btn" data-act="import-merge">确认合并（写入 .ldt/assets.json）</span>'
    : '<span class="ldt-btn is-disabled" data-act="import-merge" aria-disabled="true">确认合并（先校验通过）</span>';
  const html = '<div class="ldt-page ldt-import" data-page="import" data-state="' + esc(st) + '">'
    + '<div class="ldt-steps2">' + stepsHtml(st) + '</div>'
    + '<textarea class="ldt-import-ta" data-act="import-text" aria-label="资产包 JSON" placeholder="把 AI 返回的资产包 JSON 贴在这里（资产包 / JSON）" spellcheck="false">' + esc(text) + '</textarea>'
    + '<div class="ldt-import-act"><span class="ldt-btn ghost" data-act="import-validate">校验</span>' + mergeBtn + '</div>'
    + body.join('')
    + '</div>';
  return { ok: st === 'diff' || st === 'merged' || st === 'empty', html: html, state: st };
}

module.exports = { buildImportHtml: buildImportHtml, diffCounts: diffCounts, mergeForWrite: mergeForWrite, findingsHtml: findingsHtml, STEPS: STEPS, VECTORS: VECTORS };
