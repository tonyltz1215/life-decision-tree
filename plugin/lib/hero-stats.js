/* hero-stats.js - 英雄面板数据（纯函数，不 require obsidian）
 * 口径写死：经历=memory.L1（回落 evidence 节点）；标签=assets.skills 的 domain 去重；
 * 技能卡=assets.skills.length；点亮=evidence>=1 或 verified；版图=branches 解锁/总数。
 */
'use strict';
function arr(x) { return Array.isArray(x) ? x : []; }
function statsFrom(input) {
  const i = input || {};
  const model = i.model || {};
  const assets = i.assets || {};
  const memory = i.memory || {};
  const layers = memory.layers || {};
  const evidence = arr(model.nodes).filter(function (n) { return n && n.kind === 'evidence'; });
  const events = arr(layers.L1).length || evidence.length;
  const skills = arr(assets.skills);
  const hist = {};
  skills.forEach(function (s) { arr(s && s.domain).forEach(function (d) { hist[d] = (hist[d] || 0) + 1; }); });
  const branches = arr(model.branches);
  // 「点亮」= 已验证（status=verified）；「稀有度」另用 evidence 条数，两者不混
  const lit = skills.filter(function (s) { return s && s.status === 'verified'; }).length;
  return {
    events: events,
    tags: Object.keys(hist).length,
    domainHist: hist,
    skills: skills.length,
    lit: lit,
    unlocked: branches.filter(function (b) { return b && b.unlocked === true; }).length,
    total: branches.length
  };
}
function bar(w, cls) { const pct = Math.max(0, Math.min(100, Math.round(w))); return '<span class="ldt-hf-bar' + (cls ? ' ' + cls : '') + '"><i style="width:' + pct + '%"></i></span>'; }
function renderBar(s) {
  const st = s || {};
  const max = Math.max(st.events || 0, st.tags || 0, st.skills || 0, 1);
  const pc = function (v) { return Math.round((v || 0) / max * 100); };
  const litPct = st.skills ? Math.round((st.lit || 0) / st.skills * 100) : 0;
  const mapPct = st.total ? Math.round((st.unlocked || 0) / st.total * 100) : 0;
  const chips = Object.keys(st.domainHist || {}).map(function (d) {
    return '<span class="ldt-hero-chip" data-act="hero-tag" data-domain="' + String(d).replace(/"/g, '&quot;') + '">' + String(d).replace(/</g, '&lt;') + ' <b>' + st.domainHist[d] + '</b></span>';
  }).join('');
  const row = function (key, label, val, txt, cls) {
    return '<div class="ldt-hf"><span class="ldt-hf-l" data-act="' + key + '">' + label + ' <b>' + txt + '</b></span>' + bar(val, cls) + '</div>';
  };
  return '<div class="ldt-hero">'
    + '<div class="ldt-hero-nums">'
    + '<span class="ldt-hn" data-act="hero-events">🧱 经历 <b>' + (st.events || 0) + '</b></span>'
    + '<span class="ldt-hn" data-act="hero-tags">📌 标签 <b>' + (st.tags || 0) + '</b></span>'
    + '<span class="ldt-hn" data-act="hero-skills">⚔️ 技能卡 <b>' + (st.skills || 0) + '</b>（点亮 ' + (st.lit || 0) + '）</span>'
    + '<span class="ldt-hn" data-act="hero-map">🗺️ 版图 <b>' + (st.unlocked || 0) + '/' + (st.total || 0) + '</b></span>'
    + '</div>'
    + '<div class="ldt-hero-funnel">'
    + row('hero-events', '经历', pc(st.events), String(st.events || 0), '')
    + row('hero-tags', '标签', pc(st.tags), String(st.tags || 0) + ' 域', '')
    + row('hero-skills', '技能卡', pc(st.skills), String(st.skills || 0) + ' 张', '')
    + row('hero-skills', '点亮', litPct, (st.lit || 0) + '/' + (st.skills || 0) + ' · ' + litPct + '%', litPct === 0 ? 'is-zero' : 'is-lit')
    + row('hero-map', '版图', mapPct, (st.unlocked || 0) + '/' + (st.total || 0) + ' · ' + mapPct + '%', '')
    + '</div>'
    + '<div class="ldt-hero-narr">挖矿 → 鉴定 → 锻造 → 开图</div>'
    + '<div class="ldt-hero-tags-pop"><div class="ldt-hero-pop-t">按领域筛技能卡（点一下跳到关卡地图并筛选）</div><div class="ldt-hero-pop-chips">' + chips + '</div></div>'
    + '</div>';
}
module.exports = { statsFrom: statsFrom, renderBar: renderBar };
