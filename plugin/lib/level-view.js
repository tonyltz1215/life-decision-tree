/* level-view.js - 关卡地图渲染（纯字符串，不 require obsidian，便于无 GUI 机检）
 * 输入：skeleton（4 类×3 关）+ archetype/difficulty + 可选 run 状态
 * 输出：{ ok, html, stats }；数据不合契约时返回拒绝态，不静默给结论
 */
'use strict';
const SK = require('./skeleton.js');
const EX = require('./export-check.js');
const DISCLAIMER = '本工具不提供心理诊断、不保证转行成功、只做沙盘推演';
const BANNED = ['死穴', '驳回', '不合格', '逆袭', '30 天', '保证成功'];

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
function hasBanned(s) { const t = String(s || ''); return BANNED.filter(function (w) { return t.indexOf(w) >= 0; }); }

function criteriaOf(level, difficulty) {
  const ov = (level.difficultyOverrides || {})[difficulty];
  return Array.isArray(ov) && ov.length ? ov : (level.criteria || []);
}

function check(skeleton) {
  const reasons = [];
  if (!skeleton || !skeleton.LEVELS) { reasons.push('骨架数据缺失'); return { ok: false, reasons: reasons }; }
  (skeleton.ARCHETYPES || []).forEach(function (a) {
    const lv = skeleton.LEVELS[a.id];
    if (!lv || lv.length !== 3) { reasons.push('分支 ' + a.id + ' 关卡数 != 3'); return; }
    lv.forEach(function (x) {
      if (!x.goal || !x.uiCopy) { reasons.push(x.id + ' 缺 goal/uiCopy'); }
      if ((x.criteria || []).length < 1) { reasons.push(x.id + ' 缺判据'); }
      if ((x.exampleEvidence || []).length < 1) { reasons.push(x.id + ' 缺示例凭据'); }
      if (!x.badExample) { reasons.push(x.id + ' 缺反例'); }
      if ((x.deathPoints || []).length < 1) { reasons.push(x.id + ' 缺护身符'); }
      const bad = hasBanned(x.uiCopy).concat(hasBanned(x.goal));
      if (bad.length) { reasons.push(x.id + ' 含禁用词 ' + bad.join('/')); }
    });
  });
  return { ok: reasons.length === 0, reasons: reasons };
}

function buildPrompt(level, arch, diff) {
  const lines = [
    '我当前在【' + arch.name + '】路线的【' + level.stage + ' ' + level.title + '】关卡（' + diff.name + '）。',
    '我的背景：{我会___；我做过___；我有___资源}。',
    '这一关的系统目标是：' + level.goal + '。',
    '通关判据：' + criteriaOf(level, diff.id).join('；') + '。',
    '请帮我生成 3 个本周就能启动的最小方案，每个包含：①具体做什么 ②预计花多少钱 ③预计花多少小时 ④怎么判断成功/失败。',
    '不要泛泛建议，要具体到明天可以做的第一件事。'
  ];
  return lines.join('\n');
}

function exportHtml(state) {
  const s = state || {};
  const c = s.checked || {};
  const can = EX.canCopy(c);
  const p = [];
  p.push('<div class="ldt-drawer ldt-export">');
  p.push('<div class="ldt-drawer-h"><b>导出前检查（三项全勾才可复制）</b><span class="ldt-drawer-x" data-act="export-close">×</span></div>');
  p.push('<div class="ldt-drawer-sub">数据在 .ldt/；分享截图请打码。</div>');
  EX.CHECKLIST.forEach(function (item) {
    p.push('<label class="ldt-check"><input type="checkbox" data-export="' + esc(item.id) + '"' + (c[item.id] === true ? ' checked' : '') + '><span>' + esc(item.text) + '</span></label>');
  });
  p.push('<div class="ldt-fb"><span class="ldt-btn primary' + (can ? '' : ' is-disabled') + '" data-act="export-copy"' + (can ? '' : ' aria-disabled="true"') + '>复制 .ldt/ 路径</span></div>');
  p.push('</div>');
  return p.join('');
}

function tierRow(value, label, sub, pct, checked) {
  return '<label class="ldt-tier' + (checked ? ' is-on' : '') + '"><input type="radio" name="ldt-tier" value="' + value + '"' + (checked ? ' checked' : '') + '>'
    + '<span class="ldt-tier-t">' + esc(label) + '</span><span class="ldt-tier-s">' + esc(sub) + '</span><span class="ldt-tier-p">' + pct + '%</span></label>';
}

function drawerHtml(d, levels, diffId, run) {
  const lv = (levels || []).filter(function (x) { return x.id === d.lv; })[0];
  if (!lv) { return ''; }
  const st = ((run || {}).levels || {})[d.lv] || {};
  const msg = d.msg || null;
  const p = [];
  p.push('<div class="ldt-drawer">');
  p.push('<div class="ldt-drawer-h"><b>还差一步就能点亮</b><span class="ldt-drawer-x" data-act="close">×</span></div>');
  p.push('<div class="ldt-drawer-sub">' + esc(lv.stage) + ' · ' + esc(lv.title) + ' ｜ 本关点权重 ' + (st.xp || 0) + '%</div>');
  if (msg) { p.push('<div class="ldt-msg ' + (msg.kind || 'info') + '">' + esc(msg.text) + '</div>'); }
  p.push('<div class="ldt-tiers">');
  p.push(tierRow('junior', '初级 · 复盘日记 / AI 截图', '过程留痕，先跑起来', 30, false));
  p.push(tierRow('mid', '中级 · 公网链接', '任何人点开就能看到', 70, true));
  p.push(tierRow('senior', '高级 · 脱敏收入', '有人真的付了钱', 100, false));
  p.push('</div>');
  p.push('<div class="ldt-drawer-sub">你走的是哪类方案？（只影响统计，不评判高低）</div>');
  p.push('<div class="ldt-plans">' + [['content', '内容'], ['tool', '工具'], ['service', '服务'], ['other', '其他']].map(function (x) {
    return '<label class="ldt-plan"><input type="radio" name="ldt-plan" value="' + x[0] + '"' + (x[0] === 'other' ? ' checked' : '') + '>' + x[1] + '</label>';
  }).join('') + '</div>');
  p.push('<textarea class="ldt-ta" data-act="ta" placeholder="贴链接或一句话说明，别贴你的私人原文"></textarea>');
  p.push('<span class="ldt-btn primary" data-act="submit" data-lv="' + esc(lv.id) + '">提交</span>');
  p.push('<div class="ldt-drawer-sub2">提交后会立刻判定；差一点就告诉你还差哪一条。</div>');
  p.push('<div class="ldt-fb"><span class="ldt-btn ghost" data-act="feedback" data-lv="' + esc(lv.id) + '">? 遇到问题</span><span class="ldt-fb-s">会打包你的进度结构，不含原文</span></div>');
  p.push('</div>');
  return p.join('');
}

function buildMapHtml(opts) {
  const o = opts || {};
  const sk = { ARCHETYPES: SK.ARCHETYPES, DIFFICULTIES: SK.DIFFICULTIES, LEVELS: SK.LEVELS };
  const res = check(sk);
  if (!res.ok) {
    return { ok: false, refusal: '骨架数据不完整，暂不生成地图', reasons: res.reasons, stats: null, html: '<div class="ldt-refusal"><b>⛔ 暂不生成</b><div>骨架数据不完整，暂不生成地图</div><ul>' + res.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></div>' };
  }
  const archeId = sk.ARCHETYPES.some(function (a) { return a.id === o.archetype; }) ? o.archetype : 'pipeline';
  const diffId = sk.DIFFICULTIES.some(function (d) { return d.id === o.difficulty; }) ? o.difficulty : 'standard';
  const arch = sk.ARCHETYPES.filter(function (a) { return a.id === archeId; })[0];
  const diff = sk.DIFFICULTIES.filter(function (d) { return d.id === diffId; })[0];
  const levels = sk.LEVELS[archeId] || [];
  const run = o.run || {};
  const st = run.levels || {};
  const diffChips = sk.DIFFICULTIES.map(function (d) { return '<span class="ldt-chip' + (d.id === diffId ? ' is-on' : '') + '" data-diff="' + esc(d.id) + '">' + esc(d.name) + '</span>'; }).join('');
  const archChips = sk.ARCHETYPES.map(function (a) { return '<span class="ldt-chip' + (a.id === archeId ? ' is-on' : '') + '" data-arch="' + esc(a.id) + '"><i style="background:' + esc(a.cover) + '"></i>' + esc(a.name) + '</span>'; }).join('');
  const chainHtml = ['<span class="ldt-node is-done">入口</span>'].concat(levels.map(function (lv, i) {
    let s = (st[lv.id] || {}).status || (i === 0 ? 'open' : 'locked');
    if (o.demoMode && i > 0) { s = 'locked'; }
    const cls = s === 'done' ? 'is-done' : (s === 'open' ? 'is-open' : 'is-lock');
    const mark = s === 'done' ? ' ✓' : (s === 'open' ? ' ●' : ' ○');
    return '<span class="ldt-node ' + cls + '">' + esc(lv.title) + mark + '</span>';
  })).join('<span class="ldt-arrow">→</span>');
  const cards = levels.map(function (lv, i) {
    let s = (st[lv.id] || {}).status || (i === 0 ? 'open' : 'locked');
    if (o.demoMode && i > 0) { s = 'locked'; }
    const cs = criteriaOf(lv, diffId);
    const ovr = Array.isArray((lv.difficultyOverrides || {})[diffId]) && (lv.difficultyOverrides[diffId] || []).length > 0;
    const stTxt = s === 'done' ? '已点亮' : (s === 'open' ? '进行中' : '未解锁');
    return '<div class="ldt-lv ' + s + '" data-lv="' + esc(lv.id) + '">'
      + '<div class="ldt-lv-h"><b>' + esc(lv.stage) + ' · ' + esc(lv.title) + '</b>' + (lv.boss ? '<span class="ldt-boss">BOSS</span>' : '') + '<span class="ldt-st">' + stTxt + '</span></div>'
      + '<div class="ldt-goal">目标：' + esc(lv.goal) + '</div>'
      + '<div class="ldt-copy">' + esc(lv.uiCopy) + '</div>'
      + '<div class="ldt-sub">通关判据' + (ovr ? '（' + esc(diff.name) + '）' : '') + '</div><ul class="ldt-crit">' + cs.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>'
      + '<details class="ldt-ex"><summary>示例凭据 / 反例</summary>'
      + '<div class="ldt-ex-ok">✓ ' + esc((lv.exampleEvidence || [])[0] || '') + '</div>'
      + '<div class="ldt-ex-bad">✗ ' + esc(lv.badExample || '') + '</div></details>'
      + '<div class="ldt-shield">🛡 护身符：' + esc((lv.deathPoints || []).join('；')) + '</div>'
      + '<div class="ldt-lv-actions"><span class="ldt-btn" data-act="evidence" data-lv="' + esc(lv.id) + '">贴证据</span>'
      + '<span class="ldt-btn ghost" data-act="copy" data-lv="' + esc(lv.id) + '">复制指令</span>'
      + '<span class="ldt-lv-xp">XP ' + ((st[lv.id] || {}).xp || 0) + '</span></div></div>';
  }).join('');
  const html = '<div class="ldt-map">'
    + '<div class="ldt-map-head"><div><div class="ldt-map-t">选一个身份，看清下一步</div><div class="ldt-map-s">当前：' + esc(arch.name) + ' · ' + esc(diff.name) + ' — ' + esc(diff.copy) + '</div></div>'
    + '<div class="ldt-map-actions"><span class="ldt-pill" data-act="reload">↻ 重读</span><span class="ldt-pill primary" data-act="copy">复制本关指令</span></div></div>'
    + (o.demoMode ? '<div class="ldt-demo">体验版：只开放第一关。点右上「体验版 · 升级」解锁全部 12 关。</div>' : '')
    + '<div class="ldt-pick"><div class="ldt-pick-t">难度</div><div class="ldt-chips">' + diffChips + '</div></div>'
    + '<div class="ldt-pick"><div class="ldt-pick-t">职业大类</div><div class="ldt-chips">' + archChips + '</div></div>'
    + '<div class="ldt-chain">' + chainHtml + '</div>'
    + (o.drawer && o.drawer.lv ? drawerHtml(o.drawer, levels, diffId, run) : '')
    + (o.exportCheck && o.exportCheck.open ? exportHtml(o.exportCheck) : '')
    + '<div class="ldt-lvs">' + cards + '</div>'
    + '<div class="ldt-note">' + esc(DISCLAIMER) + '</div></div>';
  const done = levels.filter(function (lv) { return (st[lv.id] || {}).status === 'done'; }).length;
  return { ok: true, refusal: null, reasons: [], stats: { archetype: archeId, difficulty: diffId, archName: arch.name, diffName: diff.name, levels: levels.length, done: done }, html: html };
}

module.exports = { buildMapHtml: buildMapHtml, drawerHtml: drawerHtml, exportHtml: exportHtml, buildPrompt: buildPrompt, check: check, criteriaOf: criteriaOf, DISCLAIMER: DISCLAIMER, BANNED: BANNED };
