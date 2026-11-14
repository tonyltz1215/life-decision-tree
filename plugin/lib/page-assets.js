/* page-assets.js - 资产库页（纯字符串，不 require obsidian） */
'use strict';
const AP = require('./assets-pack.js');

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

function arrDomains(pack) { return (pack && Array.isArray(pack.domains)) ? pack.domains : []; }

function errorHtml(errors) {
  const list = (errors || []).map(function (e) { return '<li><code>' + esc(e.code) + '</code> ' + esc(e.path || '') + ' — ' + esc(e.msg || '') + '</li>'; }).join('');
  return '<div class="ldt-refusal" data-state="error"><b>⛔ 资产包读不了</b>'
    + '<div>加载失败：先修文件，再回来看 <code>.ldt/assets-pack.json</code></div>'
    + '<ul class="ldt-errcodes">' + list + '</ul></div>';
}

function densityHtml(pack) {
  const hist = {};
  (pack && pack.skills ? pack.skills : []).forEach(function (s) { (s.domain || []).forEach(function (d) { hist[d] = (hist[d] || 0) + 1; }); });
  const blind = Object.keys(hist).filter(function (d) { return hist[d] === 1; });
  const strong = Object.keys(hist).filter(function (d) { return hist[d] >= 2; });
  if (!blind.length && !strong.length) { return ''; }
  const chips = blind.slice(0, 3).map(function (d) { return '<span class="ldt-density-chip" data-act="assets-filter" data-domain="' + String(d).replace(/"/g, '&quot;') + '">【' + String(d) + '】只 1 次 → 盲区</span>'; }).join('');
  const good = strong.slice(0, 2).map(function (d) { return '<span class="ldt-density-good">【' + String(d) + '】' + hist[d] + ' 次 → 强项</span>'; }).join('');
  return '<div class="ldt-density">' + good + chips + '</div>';
}

function buildAssetsHtml(opts) {
  const o = opts || {};
  if (o.error) { return { ok: false, html: errorHtml(o.error), stats: null, errors: o.error }; }
  const res = AP.normalize(o.pack);
  if (!res.ok) { return { ok: false, html: errorHtml(res.errors), stats: AP.stats(res.pack), errors: res.errors }; }
  const pack = res.pack;
  const st = AP.stats(pack);
  // 标签集合 = pack.domains ∪ 卡片自身的 domain（保证每张卡都能被自己的领域筛到）
  const chipList = [];
  (arrDomains(pack).length ? arrDomains(pack) : AP.DOMAINS).forEach(function (d) { if (chipList.indexOf(d) < 0) { chipList.push(d); } });
  pack.skills.forEach(function (sk) { (sk.domain || []).forEach(function (d) { if (chipList.indexOf(d) < 0) { chipList.push(d); } }); });
  st.domains = chipList.length;
  const allowed = chipList;
  const active = Array.isArray(o.filter) ? o.filter.filter(function (d) { return allowed.indexOf(d) >= 0; }) : [];
  const skills = pack.skills.filter(function (s) {
    if (!active.length) { return true; }
    return (s.domain || []).some(function (d) { return active.indexOf(d) >= 0; });
  });
  const unvShown = skills.filter(function (s) { return s.status === 'unverified'; }).length;

  const kpi = [
    { k: st.cards, t: '卡片总数' }, { k: st.main, t: '主线关数' },
    { k: st.unverified, t: '待核实数', warn: true }, { k: st.domains, t: '领域数' }
  ].map(function (x) {
    return '<div class="ldt-kpi"><b class="ldt-kpi-n' + (x.warn ? ' is-warn' : '') + '" data-k="' + esc(x.t) + '">' + x.k + '</b><span>' + esc(x.t) + '</span></div>';
  }).join('');

  const chips = chipList.map(function (d) {
    const on = active.indexOf(d) >= 0;
    return '<span class="ldt-chip' + (on ? ' is-on' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '" data-act="assets-filter" data-domain="' + esc(d) + '">' + esc(d) + '</span>';
  }).join('');

  const cards = skills.map(function (s) {
    const unv = s.status === 'unverified';
    const doms = (s.domain || []).map(function (d) { return '<span class="ldt-dom">' + esc(d) + '</span>'; }).join('');
    const evN = (s.evidence || []).length;
    const lvl = Number(s.level || 0);
    const state = (lvl >= 2 || evN >= 3) ? 'is-legend' : ((evN >= 1 || s.status === 'verified') ? 'is-rare' : 'is-common'); // 金=多次升级或证据>=3
    return '<div class="ldt-skill ' + state + (unv ? ' is-unv' : '') + '" data-skill="' + esc(s.id) + '">'
      + (state === 'is-legend' ? '<span class="ldt-legend-badge">🔥' + evN + '</span>' : '')
      + '<div class="ldt-skill-h"><b>' + esc(s.name) + '</b>'
      + (unv ? '<span class="ldt-unv-badge">未核实</span>' : '<span class="ldt-ok-badge">已核实</span>')
      + '<span class="ldt-skill-lv" data-level="' + (s.level || 0) + '">等级 ' + (s.level || 0) + '</span></div>'
      + '<div class="ldt-doms">' + doms + '</div>'
      + '<div class="ldt-skill-m">证据 ' + (s.evidence || []).length + ' 条 ｜ ' + esc(s.type || '能力') + '</div>'
      + '<div class="ldt-up">升级：' + esc(s.upgrade_condition || '未写升级条件') + '</div>'
      + '<div class="ldt-skill-act"><span class="ldt-btn" data-act="skill-upgrade" data-skill="' + esc(s.id) + '">验证升级</span>'
      + '<span class="ldt-btn ghost" data-act="skill-verify" data-skill="' + esc(s.id) + '">' + (unv ? '标为已核实' : '改回待核实') + '</span>'
      + '</div></div>';
  }).join('');

  const emptyHtml = '<div class="ldt-empty" data-state="empty"><b>暂无资产包</b><div>先导入一份：命令面板 →「导入更新」，或把 AI 返回的 JSON 贴进导入页。</div><span class="ldt-btn" data-act="nav-import">去导入更新 →</span></div>';
  const body = skills.length ? '<div class="ldt-cards" data-n="' + skills.length + '">' + cards + '</div>' : (st.cards === 0 ? emptyHtml : '<div class="ldt-empty" data-state="filtered"><b>这个筛选下没有卡</b><div>换一个领域，或点掉已选标签。</div></div>');

  const html = '<div class="ldt-page ldt-assets" data-page="assets">'
    + (o.sample ? '<div class="ldt-muted" style="margin:0 0 8px">这是随包样例资产包（8 张示例卡）——导入你自己的后会被替换</div>' : '')
    + '<div class="ldt-kpis">' + kpi + '</div>'
    + '<div class="ldt-head2"><i></i>领域筛选 <span class="ldt-h2s">' + chipList.length + ' 个标签，可多选</span></div>'
    + '<div class="ldt-chips" data-act-group="assets">' + chips + '</div>'
    + '<div class="ldt-count" data-count="' + skills.length + '">显示 <b>' + skills.length + '</b> / <b>' + st.cards + '</b> ｜ 待核实 <b>' + unvShown + '</b></div>' + densityHtml(pack)
    + body
    + '</div>';
  return { ok: true, html: html, stats: st, shown: skills.length, errors: [] };
}


// ===== 2026-11-14 v3：资产库（我是谁）= 精简 hero（只留点亮条）+ 分组卡 + 身份建议 + 我的资产 + 蒸馏/三条路/数据源 =====
// 数据只读：person-model.nodes/branches/refusals/person + memory.layers + 资产包；不写任何文件。
const GROUPS = [['evidence', '证据', 'e'], ['skill', '能力', 's'], ['risk', '风险', 'r'], ['resource', '资源', 'p']];
const KIND = { evidence: '证据', skill: '能力', risk: '风险', resource: '资源' };
const DIFF_LABEL = { rookie: '新手村', standard: '标准', hardcore: '硬核', hell: '地狱' };
const ARCH_LABEL = { bucket: '提桶者', pipeline: '造管道者', seller: '卖货者', rentier: '收租者' };
function triOf(n) { return n.epistemic === 'redline' ? 'red' : (n.epistemic === 'inferred' ? 'inf' : 'fact'); }
function conf(n) { const c = Number(n.confidence); return isFinite(c) ? Math.max(0, Math.min(1, c)) : 0.5; }
function epiOf(n) { return n.epistemic === 'redline' ? 'redline' : (n.epistemic === 'inferred' ? 'inferred' : 'fact'); }
function litStats(pack) {
  const skills = (pack && Array.isArray(pack.skills)) ? pack.skills : [];
  const lit = skills.filter(function (s) { return s && s.verified === true; }).length;
  return { total: skills.length, lit: lit, pct: skills.length ? Math.round(lit * 100 / skills.length) : 0 };
}
function heroHtml(model, pack) {
  const nodes = Array.isArray(model.nodes) ? model.nodes : [];
  const br = Array.isArray(model.branches) ? model.branches : [];
  const ev = nodes.filter(function (n) { return n.kind === 'evidence'; }).length;
  const sk = nodes.filter(function (n) { return n.kind === 'skill'; }).length;
  const domains = (pack && Array.isArray(pack.domains)) ? pack.domains.length : 0;
  const unlocked = br.filter(function (b) { return b.unlocked !== false; }).length;
  const L = litStats(pack);
  return '<div class="ldt-ahero2">'
    + '<div class="ldt-ah2-nums"><span>经历 <b>' + ev + '</b></span><span>标签 <b>' + domains + '</b></span><span>技能卡 <b>' + L.total + '</b><i>点亮 ' + L.lit + '</i></span><span>版图 <b>' + unlocked + '/' + br.length + '</b></span></div>'
    + '<div class="ldt-ah2-bar"><span class="ldt-ah2-lb">点亮 ' + L.lit + '/' + L.total + ' · ' + L.pct + '%</span><div class="ldt-ah2-track"><i style="width:' + L.pct + '%"></i></div></div>'
    + '<div class="ldt-ah2-flow">挖矿 → 鉴定 → 锻造 → 开图</div>'
    + '</div>';
}
function recommendIdentity(model, pack) {
  const nodes = Array.isArray(model.nodes) ? model.nodes : [];
  const person = model.person || {};
  const age = Number(person.age) || 0;
  const why = [];
  const redline = nodes.some(function (n) { return n.epistemic === 'redline'; });
  const ev = nodes.filter(function (n) { return n.kind === 'evidence'; }).length;
  const res = nodes.filter(function (n) { return n.kind === 'resource'; });
  const skillText = nodes.filter(function (n) { return n.kind === 'skill'; }).map(function (n) { return n.text || ''; }).join(' ');
  const resText = res.map(function (n) { return n.text || ''; }).join(' ');
  const L = litStats(pack);
  let diff = 'standard';
  if (redline) { diff = 'standard'; why.push('有红线（存款/现金流吃紧）→ 不建议硬核或地狱'); }
  else if (L.lit >= 3 && ev >= 8) { diff = 'hardcore'; why.push('已点亮 ' + L.lit + ' 张、证据 ' + ev + ' 条 → 可上硬核'); }
  else { why.push('证据 ' + ev + ' 条、点亮 ' + L.lit + ' 张 → 先从标准起步'); }
  if (age && age >= 35) { why.push(age + ' 岁：现金流缓冲要更厚，难度不往上调'); if (diff === 'hardcore') { diff = 'standard'; } }
  if (age && age < 28 && !redline && L.lit >= 2) { diff = 'hardcore'; why.push(age + ' 岁且无红线 → 容错高，可硬核'); }
  let arch = 'pipeline';
  let archWhy = '有可复用模板/流程（P-002 类）→ 造管道者';
  if (/客户|老板|人脉|企业服务|认识/.test(resText) || /谈判|表达|讲明白/.test(skillText)) { arch = 'seller'; archWhy = '有可打交道的人或表达强项（P-003/S-004 类）→ 卖货者更省力'; }
  if (/房贷|时间|晚上|周末/.test(resText) && !/客户|认识|模板|流程/.test(resText + skillText)) { arch = 'bucket'; archWhy = '只有时间可投入、暂无客户与可复用资产 → 先提桶'; }
  if (/出租|被动|租金|躺/.test(resText)) { arch = 'rentier'; archWhy = '有可被动变现的资产 → 收租者'; }
  why.push(archWhy);
  return { diff: diff, arch: arch, why: why.slice(0, 4), lit: L, age: age, confidence: redline ? '中' : '高' };
}
function cardHtml(n) {
  return '<div class="ldt-acard ' + triOf(n) + '" role="button" tabindex="0" data-act="asset-open" data-id="' + esc(n.id) + '">'
    + '<span class="ldt-abadge">' + conf(n).toFixed(2) + '</span>'
    + '<span class="ldt-ahead">' + esc(KIND[n.kind] || '卡') + ' · ' + esc(n.id) + ' · ' + esc(epiOf(n)) + '</span>'
    + '<span class="ldt-atitle">' + esc(n.text || n.id) + '</span>'
    + (n.quote ? '<span class="ldt-aquote">「' + esc(n.quote) + '」</span>' : '<span class="ldt-aquote is-empty">（无原话）</span>')
    + '</div>';
}
function groupsHtml(nodes) {
  return GROUPS.map(function (g) {
    const list = nodes.filter(function (n) { return n.kind === g[0]; });
    return '<section class="ldt-agroup"><div class="ldt-agleft"><div class="ldt-agnum ' + g[2] + '">' + list.length + '</div><div class="ldt-agcap">' + g[1] + '</div></div>'
      + '<div class="ldt-acards">' + (list.length ? list.map(cardHtml).join('') : '<span class="ldt-muted">暂无</span>') + '</div></section>';
  }).join('');
}
function identityHtml(rec, cur) {
  const curDiff = DIFF_LABEL[cur && cur.diff] || '标准';
  const curArch = ARCH_LABEL[cur && cur.arch] || '造管道者';
  const same = (cur && cur.diff === rec.diff && cur.arch === rec.arch);
  return '<div class="ldt-aidbox"><div class="ldt-aidhead"><b>身份建议</b><span class="ldt-aidstate">当前：' + curDiff + ' / ' + curArch + '</span></div>'
    + '<div class="ldt-aidrec">推荐：<b class="ldt-aiddiff">' + DIFF_LABEL[rec.diff] + '</b> 难度 · <b class="ldt-aidarch">' + ARCH_LABEL[rec.arch] + '</b> 职业</div>'
    + '<ul class="ldt-aidwhy">' + rec.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>'
    + (same ? '<div class="ldt-aidok">已采用建议</div>' : '<button class="ldt-pill primary" data-act="identity-adopt" style="margin-top:6px">采用建议</button>')
    + '<div class="ldt-muted" style="font-size:10.5px;margin-top:6px">难度按资产与年龄算；改之前会先提醒，尽量别擅自改。</div>'
    + '</div>';
}
function distHtml(layers) {
  const defs = { L1: '原始记录', L2: '摘要', L3: '综合' };
  return '<div class="ldt-adist"><div class="ldt-adist-t">履历蒸馏</div><div class="ldt-muted" style="font-size:11px;margin-bottom:6px">L1 原话 → L2 标签 → L3 结论；每条带来源编号</div>'
    + ['L1', 'L2', 'L3'].map(function (k) {
        const arr = (layers && layers[k]) || [];
        return '<div class="ldt-adist-k">' + k + ' ' + defs[k] + ' · ' + arr.length + '</div>'
          + (arr.filter(function (x) { return !x.deleted; }).map(function (x) {
              const from = (x.from && x.from.length) ? x.from.join(' · ') : (k === 'L1' ? '用户原话' : '');
              return '<div class="ldt-adist-i"><span class="ldt-adist-b">' + esc(x.id) + '</span><div>' + esc(x.text) + (from ? '<div class="ldt-adist-s">来源：' + esc(from) + '</div>' : '') + '</div></div>';
            }).join('') || '<div class="ldt-muted">还没有</div>');
      }).join('') + '</div>';
}
function branchesHtml(model) {
  const br = Array.isArray(model.branches) ? model.branches : [];
  const ref = Array.isArray(model.refusals) ? model.refusals : [];
  if (!br.length) { return ''; }
  return '<div class="ldt-apanel"><div class="ldt-apanel-t">三条路</div>'
    + br.map(function (b) {
        const locked = b.unlocked === false;
        return '<div class="ldt-abranch' + (locked ? ' is-locked' : '') + '"><b>' + esc(b.id) + ' ' + esc(b.title) + '</b>'
          + '<span class="ldt-abstate">' + (locked ? '锁着' : '可走') + '</span>'
          + ((b.needs && b.needs.length) ? '<div class="ldt-abneeds">先补：' + esc(b.needs.join('、')) + '</div>' : '')
          + '</div>';
      }).join('')
    + (ref.length ? '<div class="ldt-arefusal">' + ref.map(function (r) { return '⛔ ' + esc(r); }).join('<br>') + '</div>' : '')
    + '<div class="ldt-asrc"><div class="ldt-apanel-t">数据源</div><div class="ldt-arcin">' + esc((model && model.__path) || '.ldt/person-model.json') + '</div><div class="ldt-muted" style="font-size:10.5px">本地 JSON；写入只在本机；不入库、不上传。</div></div>'
    + '</div>';
}
function howtoHtml() {
  return '<div class="ldt-apanel"><div class="ldt-apanel-t">怎么读</div><div class="ldt-muted" style="font-size:11.5px;line-height:1.6">蓝＝事实 · 黄＝推测 · 红＝未验证高风险；右上角数字是该条的支撑度（0–1）。点一张卡进次级页，看原话、派生链与下一步。</div></div>';
}
function detailHtml(node, nodes, layers) {
  const rel = nodes.filter(function (n) { return n.id !== node.id && n.kind === node.kind; }).slice(0, 6);
  const cross = nodes.filter(function (n) { return n.kind !== node.kind; }).slice(0, 4);
  const l1 = (layers && layers.L1) || [], l2 = (layers && layers.L2) || [], l3 = (layers && layers.L3) || [];
  const hits = l1.filter(function (x) { return (x.quote || '') === (node.quote || '') || (x.text || '') === (node.text || ''); });
  const chain = [];
  if (hits.length) { chain.push(['L1', '原话入库：' + (hits[0].quote || hits[0].text || '')]); }
  if (l2.length) { chain.push(['L2', l2[0].text + '（来源 ' + ((l2[0].from || []).join(' · ') || '—') + '）']); }
  if (l3.length) { chain.push(['L3', l3[0].text + '（来源 ' + ((l3[0].from || []).join(' · ') || '—') + '）']); }
  if (!chain.length) { chain.push(['L1', '本条暂无派生链（未进入蒸馏）']); }
  return '<div class="ldt-adetail">'
    + '<div class="ldt-adhead"><div><div class="ldt-adtitle">' + esc(node.text || node.id) + '</div><div class="ldt-muted" style="font-size:12px">' + esc(node.id) + ' · ' + esc(KIND[node.kind] || '') + ' · ' + esc(epiOf(node)) + '</div></div>'
    + '<div class="ldt-admx"><div><b>' + conf(node).toFixed(2) + '</b><i>支撑度</i></div><div><b>' + chain.length + '</b><i>派生层</i></div><div><b>' + (node.epistemic === 'redline' ? '红线' : (node.epistemic === 'inferred' ? '推测' : '事实')) + '</b><i>三态</i></div></div></div>'
    + '<div class="ldt-adquote">「' + esc(node.quote || '（未记录原话）') + '」</div>'
    + '<div class="ldt-adsec"><div class="ldt-adsec-t">它是怎么被读出来的</div>' + chain.map(function (c) { return '<div class="ldt-adstep"><span class="ldt-adtag">' + esc(c[0]) + '</span><div>' + esc(c[1]) + '</div></div>'; }).join('') + '</div>'
    + '<div class="ldt-adsec"><div class="ldt-adsec-t">同类（' + esc(KIND[node.kind] || '') + '）</div><div class="ldt-adrel">' + (rel.map(function (n) { return '<span class="ldt-adpill" role="button" data-act="asset-open" data-id="' + esc(n.id) + '">' + esc(n.id) + ' · ' + esc(n.text || '') + '</span>'; }).join('') || '<span class="ldt-muted">同类只有它</span>') + '</div></div>'
    + '<div class="ldt-adsec"><div class="ldt-adsec-t">跨类关联</div><div class="ldt-adrel">' + cross.map(function (n) { return '<span class="ldt-adpill" role="button" data-act="asset-open" data-id="' + esc(n.id) + '">' + esc(n.id) + ' · ' + esc(n.text || '') + '</span>'; }).join('') + '</div></div>'
    + '<div class="ldt-adsec"><div class="ldt-adsec-t">可执行下一步（按必要度排序）</div><div class="ldt-adprio">'
    + '<div class="ldt-adrow"><span>拿一条可量化结果补强</span><b>' + (conf(node) * 0.92).toFixed(2) + '</b></div>'
    + '<div class="ldt-adrow"><span>找第二来源（他人推荐／客户反馈）</span><b>' + (conf(node) * 0.61).toFixed(2) + '</b></div>'
    + '<div class="ldt-adrow"><span>30 天内做一次最小验证</span><b>' + (conf(node) * 0.38).toFixed(2) + '</b></div></div></div>'
    + '<div class="ldt-adanchor">来源锚点：ldt://person-model#' + esc(node.id) + '　｜　数据层：.ldt/person-model.json' + (node.happened_on ? '　｜　发生时间：' + esc(node.happened_on) : '') + '</div>'
    + '<div style="margin-top:12px"><button class="ldt-pill" data-act="asset-back">← 返回资产库</button></div>'
    + '</div>';
}
function buildGroupsHtml(o) {
  const opts = o || {};
  const model = opts.model || {};
  const nodes = Array.isArray(model.nodes) ? model.nodes : [];
  const pack = opts.pack || null;
  const layers = opts.memory || {};
  const detail = opts.detailId ? nodes.filter(function (n) { return n.id === opts.detailId; })[0] : null;
  const rec = recommendIdentity(model, pack);
  const stats = {
    nodes: nodes.length,
    evidence: nodes.filter(function (n) { return n.kind === 'evidence'; }).length,
    skill: nodes.filter(function (n) { return n.kind === 'skill'; }).length,
    risk: nodes.filter(function (n) { return n.kind === 'risk'; }).length,
    resource: nodes.filter(function (n) { return n.kind === 'resource'; }).length,
    branches: (Array.isArray(model.branches) ? model.branches.length : 0),
    lit: rec.lit.lit, litTotal: rec.lit.total, litPct: rec.lit.pct,
    rec: { diff: rec.diff, arch: rec.arch },
    l1: ((layers.L1 || []).length), l2: ((layers.L2 || []).length), l3: ((layers.L3 || []).length)
  };
  let html;
  if (!nodes.length) {
    html = '<div class="ldt-refusal"><b>还没有个人模型</b><div>先跑访谈入库（15 题），或在设置里把模型路径指向 .ldt/person-model.json。</div></div>';
  } else if (detail) {
    html = detailHtml(detail, nodes, layers);
  } else {
    html = '<div class="ldt-assets">'
      + heroHtml(model, pack)
      + identityHtml(rec, opts.current)
      + kpisHtml(model)
      + groupsHtml(nodes)
      + (opts.packHtml || '')
      + '<div class="ldt-acols"><div class="ldt-aside-l">' + distHtml(layers) + '</div><div class="ldt-aside-m">' + branchesHtml(model) + howtoHtml() + '</div></div>'
            + '<div class="ldt-fabar"><span class="ldt-fabitem ldt-fabitem-ai" role="button" data-act="fab-ai">✨ AI</span><span class="ldt-fabitem" role="button" data-act="fab-import">⇪ 导入更新</span></div>'
      + '</div>';
  }
  return { ok: nodes.length > 0, html: html, stats: stats, detail: detail ? detail.id : null, rec: rec, lit: rec.lit };
}
function kpisHtml(model) {
  const nodes = Array.isArray(model.nodes) ? model.nodes : [];
  const br = Array.isArray(model.branches) ? model.branches : [];
  const ep = { fact: 0, inferred: 0, redline: 0 };
  nodes.forEach(function (n) { if (ep[n.epistemic] != null) { ep[n.epistemic] += 1; } else { ep.fact += 1; } });
  const unlocked = br.filter(function (b) { return b.unlocked !== false; }).length;
  return '<div class="ldt-kpistrip">'
    + '<span class="ldt-ks"><b>' + nodes.length + '</b>节点</span>'
    + '<span class="ldt-ks"><b>' + br.length + '</b>分支</span>'
    + '<span class="ldt-ks"><b>' + ep.redline + '</b>红线</span>'
    + '<span class="ldt-ks is-muted">事实 ' + ep.fact + ' · 推测 ' + ep.inferred + '</span>'
    + '<span class="ldt-ks is-muted">可走 ' + unlocked + '/' + br.length + '</span>'
    + '</div>';
}
module.exports = { densityHtml: densityHtml, buildAssetsHtml: buildAssetsHtml, errorHtml: errorHtml, buildGroupsHtml: buildGroupsHtml, recommendIdentity: recommendIdentity, DIFF_LABEL: DIFF_LABEL, ARCH_LABEL: ARCH_LABEL };
