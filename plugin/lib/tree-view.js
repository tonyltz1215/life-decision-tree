/* tree-view.js - 决策树视图的纯渲染层（不 require obsidian，便于无 GUI 机检）
 * 判据同 ui/zone-render.js：evidence≥5 且带 quote／nodes≥15／三色齐，否则拒绝生成（骨架 v2 反直觉①）
 * 未解锁分支带 needs；refusals 里点到 id 的分支挂熔断（只用已有字段，不改数据模型）
 */
'use strict';
const COLORS = { fact: '#3b82f6', inferred: '#eab308', redline: '#ef4444' };
const KIND = { skill: '能力', evidence: '证据', risk: '风险', resource: '资源' };
const DISCLAIMER = '不提供心理诊断、不保证转行成功、只做沙盘推演';
const REFUSE = '数据不足，再给 2 个具体案例（时间＋做了什么＋结果）';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function tally(model) {
  const m = model || {};
  const nodes = m.nodes || [];
  const ev = nodes.filter((n) => n.kind === 'evidence');
  const ep = { fact: 0, inferred: 0, redline: 0 };
  nodes.forEach((n) => { if (ep[n.epistemic] != null) { ep[n.epistemic] += 1; } });
  const branches = m.branches || [];
  return {
    nodes: nodes.length, evidence: ev.length,
    evidenceNoQuote: ev.filter((n) => !n.quote).length,
    ep: ep, branches: branches.length,
    unlocked: branches.filter((b) => b.unlocked === true).length,
    locked: branches.filter((b) => b.unlocked !== true).length,
    hidden: (m.hidden_skills || []).length, refusals: (m.refusals || []).length
  };
}
function checkSufficiency(model) {
  const t = tally(model);
  const reasons = [];
  if ((model || {}).status === 'insufficient') { reasons.push('上游标注 status=insufficient'); }
  if (t.evidence < 5) { reasons.push('evidence 仅 ' + t.evidence + ' 条（门槛 5）'); }
  if (t.evidenceNoQuote > 0) { reasons.push(t.evidenceNoQuote + ' 条 evidence 缺 quote'); }
  if (t.nodes < 15) { reasons.push('nodes 仅 ' + t.nodes + ' 条（门槛 15）'); }
  const miss = ['fact', 'inferred', 'redline'].filter((k) => !t.ep[k]);
  if (miss.length) { reasons.push('epistemic 缺色：' + miss.join('／')); }
  const ok = reasons.length === 0;
  return { ok: ok, refusal: ok ? null : ((model || {}).need || REFUSE), reasons: reasons, stats: t };
}
function fuseOf(model) {
  const map = {};
  ((model || {}).refusals || []).forEach((r) => {
    ((model || {}).branches || []).forEach((b) => { if (String(r).indexOf(b.id) >= 0) { map[b.id] = String(r); } });
  });
  return map;
}
function buildTreeHtml(model) {
  const res = checkSufficiency(model);
  if (!res.ok) {
    return {
      ok: false, refusal: res.refusal, reasons: res.reasons, stats: res.stats,
      html: '<div class="ldt-refusal"><b>⛔ 拒绝生成</b><div>' + esc(res.refusal) + '</div><ul>'
        + res.reasons.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul>'
        + '<div class="ldt-hint">先跑 tools/import-model.cjs 把访谈 JSON 入库，或在设置里改 person-model.json 路径。</div></div>'
    };
  }
  const m = model || {};
  const t = res.stats;
  const fuse = fuseOf(m);
  const cards = (m.nodes || []).map((n) => '<div class="ldt-card" data-ep="' + esc(n.epistemic) + '">'
    + '<div class="ldt-k">' + (KIND[n.kind] || n.kind) + ' · ' + esc(n.id) + ' · ' + esc(n.epistemic) + '</div>'
    + '<div class="ldt-t">' + esc(n.text) + '</div>'
    + (n.quote ? '<div class="ldt-q">「' + esc(n.quote) + '」</div>' : '') + '</div>').join('');
  const branches = (m.branches || []).map((b) => '<div class="ldt-branch ' + (b.unlocked ? 'on' : 'off') + (fuse[b.id] ? ' fuse' : '') + (b.diag ? ' ' + esc(b.diag.cls) : '') + '">'
    + '<b>' + esc(b.id) + '</b> ' + esc(b.title)
    + (b.unlocked ? '<span class="ldt-tag ok">已解锁</span>' : '<span class="ldt-tag lock">未解锁</span>')
    + (fuse[b.id] ? '<span class="ldt-tag fuse">熔断</span>' : '')
    + (b.diag ? '<span class="ldt-tag diag ' + esc(b.diag.cls) + '"><i class="ldt-dot ' + esc(b.diag.dot) + '"></i>' + esc(b.diag.label) + '</span>' : '')
    + (b.diag && b.diag.verify ? '<div class="ldt-verify">' + esc(b.diag.verify) + '</div>' : '')
    + (b.diag && b.diag.repair && b.diag.repair.length ? '<div class="ldt-repair">补强清单：' + esc(b.diag.repair.join('；')) + '</div>' : '')
    + (b.diag && b.diag.trace && b.diag.trace.length > 1 ? '<div class="ldt-trace">追先修：' + esc(b.diag.trace.join(' → ')) + '</div>' : '')
    + (b.unlocked ? '' : '<div class="ldt-needs">需要：' + esc((b.needs || []).join('；')) + '</div>')
    + (fuse[b.id] ? '<div class="ldt-fuse">⚡ ' + esc(fuse[b.id]) + '</div>' : '') + '</div>').join('');
  const hidden = (m.hidden_skills || []).map((h) => '<div class="ldt-hidden"><b>隐藏技能：</b>' + esc(h.text)
    + '<ol>' + (h.verify_questions || []).map((q) => '<li>' + esc(q) + '</li>').join('') + '</ol></div>').join('');
  const html = '<div class="ldt-head">' + esc((m.person && m.person.alias) || '?') + ' · 节点 ' + t.nodes
    + ' · fact ' + t.ep.fact + ' / inferred ' + t.ep.inferred + ' / redline ' + t.ep.redline + '</div>'
    + '<div class="ldt-legend"><span><i style="background:' + COLORS.fact + '"></i>事实 fact</span>'
    + '<span><i style="background:' + COLORS.inferred + '"></i>系统推测 inferred</span>'
    + '<span><i style="background:' + COLORS.redline + '"></i>未验证高风险 redline</span></div>'
    + '<div class="ldt-grid">' + cards + '</div>'
    + '<h3>决策树</h3>' + branches
    + hidden
    + '<div class="ldt-note">' + DISCLAIMER + '</div>';
  return { ok: true, refusal: null, reasons: [], stats: t, html: html, fuse: Object.keys(fuse) };
}
module.exports = { buildTreeHtml: buildTreeHtml, checkSufficiency: checkSufficiency, tally: tally, fuseOf: fuseOf, COLORS: COLORS, DISCLAIMER: DISCLAIMER, REFUSE: REFUSE };
