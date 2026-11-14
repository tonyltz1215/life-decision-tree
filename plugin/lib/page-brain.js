/* page-brain.js - 人生决策树内的「第二大脑」页（纯字符串渲染＋解析，不 require obsidian）
 * 数据：<vault>/.mysb/cards/*.md（我的第二大脑写成，九段卡）；没有卡时给空态，不编。
 * 四页：书架 / 知识地图（SVG 连线）/ 搜索 / 阅读器。
 */
'use strict';

const SUB = [['shelf', '书架'], ['map', '知识地图'], ['search', '搜索'], ['reader', '阅读器']];
const TYPE_LABEL = { branch: '决策分支', case: '案例', carry: '能力资产', evidence: '证据', skill: '能力假设', risk: '风险约束', resource: '资源' };
const ORDER = ['branch', 'case', 'carry', 'evidence', 'skill', 'risk', 'resource'];

function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

function parseCard(file, text) {
  const t = String(text || '');
  const id = (/^id: (.+)$/m.exec(t) || [])[1] || String(file || '').replace(/^.*\//, '').replace(/\.md$/, '');
  const type = (/^type: (.+)$/m.exec(t) || [])[1] || 'other';
  const anchor = (/^anchor: (.+)$/m.exec(t) || [])[1] || '';
  const rel = (/^relates: (.+)$/m.exec(t) || [])[1] || '';
  const head = /^# (.+)$/m.exec(t);
  const secs = [];
  const re = /^## (.+)$/gm;
  const marks = [];
  let m;
  while ((m = re.exec(t)) !== null) { marks.push({ name: m[1].trim(), start: m.index, bodyStart: m.index + m[0].length }); }
  for (let i = 0; i < marks.length; i += 1) {
    const end = i + 1 < marks.length ? marks[i + 1].start : t.length;
    secs.push({ name: marks[i].name, body: t.slice(marks[i].bodyStart, end).trim() });
  }
  return { file: file, id: id.trim(), type: type.trim(), anchor: anchor.trim(), title: head ? head[1].trim() : String(file), relates: rel ? rel.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [], sections: secs };
}

function buildGraph(cards) {
  const ids = {};
  cards.forEach(function (c) { ids[c.id] = true; });
  const seen = {};
  const edges = [];
  cards.forEach(function (c) {
    (c.relates || []).forEach(function (r) {
      const to = r.indexOf('ldt-') === 0 ? r : 'ldt-' + r;
      if (!ids[to] || to === c.id) { return; }
      const k = c.id + '>' + to;
      if (seen[k]) { return; }
      seen[k] = true;
      edges.push({ from: c.id, to: to });
    });
  });
  const byType = {};
  cards.forEach(function (c) { (byType[c.type] = byType[c.type] || []).push(c); });
  const cols = ORDER.filter(function (t) { return byType[t]; }).concat(Object.keys(byType).filter(function (t) { return ORDER.indexOf(t) < 0; }));
  const nodes = [];
  let maxRows = 0;
  cols.forEach(function (t, col) {
    maxRows = Math.max(maxRows, byType[t].length);
    byType[t].forEach(function (c, row) {
      nodes.push({ id: c.id, type: t, label: c.title.length > 9 ? c.title.slice(0, 9) + '…' : c.title, x: 14 + col * 152, y: 16 + row * 44 });
    });
  });
  return { nodes: nodes, edges: edges, width: 14 + Math.max(1, cols.length) * 152, height: 16 + Math.max(1, maxRows) * 44 };
}

function svgHtml(g) {
  const pos = {};
  g.nodes.forEach(function (n) { pos[n.id] = n; });
  let s = '<svg class="ldt-brain-svg" viewBox="0 0 ' + g.width + ' ' + g.height + '" width="100%">';
  g.edges.forEach(function (e) {
    const a = pos[e.from], b = pos[e.to];
    if (!a || !b) { return; }
    s += '<line x1="' + (a.x + 74) + '" y1="' + (a.y + 12) + '" x2="' + b.x + '" y2="' + (b.y + 12) + '" class="ldt-brain-edge"></line>';
  });
  g.nodes.forEach(function (n) {
    s += '<g class="ldt-brain-node ' + esc(n.type) + '" data-act="brain-card" data-id="' + esc(n.id) + '">';
    s += '<rect x="' + n.x + '" y="' + n.y + '" width="74" height="24" rx="6"></rect>';
    s += '<text x="' + (n.x + 37) + '" y="' + (n.y + 16) + '" text-anchor="middle">' + esc(n.label) + '</text></g>';
  });
  return s + '</svg>';
}

function toolsHtml() {
  return '<div class="ldt-brain-tools">'
    + '<span class="ldt-btool" data-act="brain-model">⚙ 模型连接</span>'
    + '<span class="ldt-btool" data-act="brain-guide">▤ 使用教程</span>'
    + '<span class="ldt-btool" data-act="brain-version">◈ 人生决策树 v0.1.23</span>'
    + '<span class="ldt-btool" data-act="brain-search-open">⌕ 搜索</span>'
    + '<span class="ldt-btool" data-act="brain-switch">⇄ 切换</span>'
    + '</div>';
}

function subBar(sub) {
  return '<div class="ldt-brain-sub">' + SUB.map(function (s) {
    return '<span class="ldt-brain-subtab' + (sub === s[0] ? ' is-active' : '') + '" role="tab" aria-selected="' + (sub === s[0] ? 'true' : 'false') + '" data-act="brain-sub-' + s[0] + '">' + s[1] + '</span>';
  }).join('') + '</div>';
}

function rows(list, current) {
  return '<div class="ldt-brain-rows">' + list.map(function (c) {
    return '<div class="ldt-brain-row' + (c.id === current ? ' is-on' : '') + '" data-act="brain-card" data-id="' + esc(c.id) + '">'
      + '<span class="ty">' + esc(TYPE_LABEL[c.type] || c.type) + '</span>'
      + '<span class="tt">' + esc(c.title) + '<i>' + esc(c.id) + (c.anchor ? ' · ' + esc(c.anchor.replace(/^ldt:\/\//, '')) : '') + '</i></span>'
      + '<span class="go">看卡 →</span></div>';
  }).join('') + '</div>';
}

function renderHtml(o) {
  const opts = o || {};
  const cards = opts.cards || [];
  const sub = opts.sub || 'shelf';
  const q = String(opts.query || '').toLowerCase();
  if (!cards.length) {
    return '<div class="ldt-brain fs-' + (opts.font || 'normal') + '">' + subBar(sub) + '<div class="ldt-brain-empty">还没有知识卡。<br>回到「人生决策树」页签，命令面板跑一次「扫描人生决策树内容 → 知识卡」，这里就有 26 张九段卡了。</div>';
  }
  const counts = {};
  cards.forEach(function (c) { counts[c.type] = (counts[c.type] || 0) + 1; });
  const bar = Object.keys(counts).map(function (t) { return (TYPE_LABEL[t] || t) + ' ' + counts[t]; }).join(' · ');
  let body = '';
  if (sub === 'shelf') {
    body = '<div class="ldt-brain-meta">' + cards.length + ' 张卡 · ' + esc(bar) + '</div>' + rows(cards, opts.current);
  } else if (sub === 'map') {
    const g = buildGraph(cards);
    body = '<div class="ldt-brain-meta">节点 ' + g.nodes.length + ' · 关系 ' + g.edges.length + '（边只来自卡上 relates）</div><div class="ldt-brain-graph">' + svgHtml(g) + '</div>'
      + ORDER.filter(function (t) { return counts[t]; }).map(function (t) {
        return '<h4 class="ldt-brain-group">' + (TYPE_LABEL[t] || t) + '（' + counts[t] + '）</h4>' + rows(cards.filter(function (c) { return c.type === t; }), opts.current);
      }).join('');
  } else if (sub === 'search') {
    const hits = q ? cards.filter(function (c) { return (c.title + ' ' + (c.sections || []).map(function (s) { return s.body; }).join(' ')).toLowerCase().indexOf(q) >= 0; }) : cards;
    body = '<div class="ldt-brain-search"><input class="ldt-brain-input" data-act="brain-input" value="' + esc(opts.query || '') + '" placeholder="搜标题或正文，回车过滤"></div>'
      + '<div class="ldt-brain-meta">命中 ' + hits.length + ' / ' + cards.length + (q ? ' · 关键词「' + esc(opts.query) + '」' : '') + '</div>' + rows(hits, opts.current);
  } else {
    const cur = cards.filter(function (c) { return c.id === opts.current; })[0] || cards[0];
    body = '<div class="ldt-brain-reader"><div class="head"><b>' + esc(cur.title) + '</b><span>' + esc(TYPE_LABEL[cur.type] || cur.type) + (cur.anchor ? ' · ' + esc(cur.anchor) : '') + '</span></div>'
      + (cur.sections || []).map(function (s) { return '<h5>' + esc(s.name) + '</h5><p>' + esc(s.body) + '</p>'; }).join('')
      + '<div class="ldt-brain-meta"><span data-act="brain-sub-shelf" class="ldt-brain-back">← 回书架</span></div></div>';
  }
  return '<div class="ldt-brain fs-' + (opts.font || 'normal') + '">' + subBar(sub) + body + '</div>';
}

module.exports = { toolsHtml: toolsHtml, SUB: SUB, TYPE_LABEL: TYPE_LABEL, parseCard: parseCard, buildGraph: buildGraph, svgHtml: svgHtml, renderHtml: renderHtml };
