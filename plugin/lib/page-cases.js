/* page-cases.js - 案例透视页（纯字符串，不 require obsidian） */
'use strict';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function normCases(raw) {
  const errors = [];
  let list = [];
  if (raw == null) { return { ok: true, cases: [], errors: [] }; }
  if (Array.isArray(raw)) { list = raw; } else if (Array.isArray(raw.cases)) { list = raw.cases; } else if (isObj(raw) && (raw.case_id || raw.case_name)) { list = [raw]; }
  else if (isObj(raw) && !('cases' in raw)) { list = []; }
  else if (isObj(raw) && raw.cases == null) { list = []; }
  else { return { ok: false, cases: [], errors: [{ code: 'E_JSON', path: '$', msg: 'cases 既不是数组也不是对象' }] }; }
  const seen = Object.create(null);
  const out = [];
  list.forEach(function (c, i) {
    const p = '$[' + i + ']';
    if (!isObj(c)) { errors.push({ code: 'E_FIELDS', path: p, msg: '不是对象' }); return; }
    if (c.schema && c.schema !== 'ldt-case-v1') { errors.push({ code: 'E_SCHEMA', path: p + '.schema', msg: '期望 ldt-case-v1，实为 ' + String(c.schema) }); }
    if (!c.case_id || !c.case_name) { errors.push({ code: 'E_FIELDS', path: p, msg: '缺 case_id/case_name' }); }
    if (seen['c:' + c.case_id]) { errors.push({ code: 'E_DUP_ID', path: p, msg: '重复 case_id ' + c.case_id }); }
    seen['c:' + c.case_id] = 1;
    out.push({
      case_id: String(c.case_id || ''), case_name: String(c.case_name || ''), archetype: String(c.archetype || '未标注'),
      one_liner: String(c.one_liner || ''), ceiling: String(c.ceiling || '未标注'),
      cost: isObj(c.cost) ? c.cost : {}, core_factor: isObj(c.core_factor) ? c.core_factor : {},
      revenue: isObj(c.revenue) ? c.revenue : {}, pitfalls: Array.isArray(c.pitfalls) ? c.pitfalls.filter(function (x) { return typeof x === 'string' && x; }) : [],
      status: c.status === 'verified' ? 'verified' : 'unverified'
    });
  });
  return { ok: errors.length === 0, cases: out, errors: errors };
}

function errorHtml(errors) {
  const list = (errors || []).map(function (e) { return '<li><code>' + esc(e.code) + '</code> ' + esc(e.path || '') + ' — ' + esc(e.msg || '') + '</li>'; }).join('');
  return '<div class="ldt-refusal" data-state="error"><b>⛔ 案例文件加载失败</b><div>先修 <code>.ldt/cases.json</code></div><ul class="ldt-errcodes">' + list + '</ul></div>';
}

function kv(label, v) {
  if (v == null || v === '') { return ''; }
  if (Array.isArray(v)) { return '<div class="ldt-cv"><span class="ldt-ck">' + esc(label) + '</span><span class="ldt-cvv">' + v.map(esc).join('、') + '</span></div>'; }
  return '<div class="ldt-cv"><span class="ldt-ck">' + esc(label) + '</span><span class="ldt-cvv">' + esc(v) + '</span></div>';
}
function costHtml(cost) {
  const rows = [];
  ['money', 'time', 'energy'].forEach(function (k) {
    const v = cost[k];
    if (!isObj(v)) { return; }
    const nm = ({ money: '钱', time: '时间', energy: '精力' })[k];
    rows.push(kv(nm + '（' + (v.level || '未标注') + '）', v.text || ''));
  });
  return rows.join('');
}

function chainHtml(c, levels) {
  const key = 'lv-case-' + String(c.case_id || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const rel = (levels || []).filter(function (l) { return l && (l.source_case === c.case_id || String(l.id || '').indexOf(key) === 0); });
  if (!rel.length) { return ''; }
  const nodes = rel.map(function (l) {
    const d = l.detail || {};
    const ev = Array.isArray(d.evidence_required) ? d.evidence_required : [];
    return '<div class="ldt-c3-lv"><b>' + esc(l.title || l.id) + '</b><span>' + (ev.length ? esc(String(ev[0]).slice(0, 28)) : '未写证据') + '</span></div>';
  }).join('<span class="ldt-c3-arrow">→</span>');
  return '<div class="ldt-c3"><span class="ldt-c3-case">案例</span><span class="ldt-c3-arrow">→</span>' + nodes + '</div>';
}
function buildCasesHtml(opts) {
  const o = opts || {};
  if (o.error) { return { ok: false, html: errorHtml(o.error), cases: [], errors: o.error, index: 0 }; }
  const res = normCases(o.raw);
  if (!res.ok) { return { ok: false, html: errorHtml(res.errors), cases: res.cases, errors: res.errors, index: 0 }; }
  const list = res.cases;
  if (!list.length) {
    return { ok: true, cases: [], index: 0, html: '<div class="ldt-page ldt-cases" data-page="cases"><div class="ldt-empty" data-state="empty"><b>暂无案例卡</b><div>先导入一张：命令面板 →「导入更新」，或把 AI 返回的案例 JSON 贴进去。</div><span class="ldt-btn" data-act="nav-import">去导入更新 →</span><span class="ldt-btn" data-act="case-seed3">载入 3 张样例案例</span></div></div>' };
  }
  let idx = Number(o.index); if (!isFinite(idx) || idx < 0 || idx >= list.length) { idx = 0; }
  const c = list[idx];
  const tabs = list.map(function (x, i) {
    const mini = (x.status !== 'verified' && i !== idx) ? '<span class="ldt-unv-badge" data-mini="1">未核实</span>' : '';
    return '<span class="ldt-chip' + (i === idx ? ' is-on' : '') + '" aria-pressed="' + (i === idx ? 'true' : 'false') + '" data-act="case-pick" data-i="' + i + '">' + esc(x.case_name) + mini + '</span>';
  }).join('');
  const unv = c.status !== 'verified';
  const core = c.core_factor || {};
  const rev = c.revenue || {};
  const pitfalls = c.pitfalls.length ? '<ul class="ldt-pit">' + c.pitfalls.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<div class="ldt-cv"><span class="ldt-ck">坑</span><span class="ldt-cvv">未填写</span></div>';
  const html = '<div class="ldt-page ldt-cases" data-page="cases" data-idx="' + idx + '">'
    + '<div class="ldt-head2"><i></i>案例卡 <span class="ldt-h2s">' + (idx + 1) + ' / ' + list.length + ' · 默认未核实</span></div>'
    + '<div class="ldt-chips" data-act-group="cases">' + tabs + '</div>'
    + '<div class="ldt-case" data-case="' + esc(c.case_id) + '">'
    + '<div class="ldt-case-h"><b>' + esc(c.case_name) + '</b>' + (unv ? '<span class="ldt-unv-badge">未核实</span>' : '<span class="ldt-ok-badge">已核实</span>') + '<span class="ldt-arche">' + esc(c.archetype) + '</span></div>'
    + (c.one_liner ? '<div class="ldt-case-one">' + esc(c.one_liner) + '</div>' : '')
    + '<div class="ldt-case-grid">'
    + '<div class="ldt-case-col"><div class="ldt-case-t">成本</div>' + costHtml(c.cost) + kv('上限', c.ceiling) + '</div>'
    + '<div class="ldt-case-col"><div class="ldt-case-t">核心因子</div>' + kv('要会的', core.skills_required) + kv('秘方', core.secret_sauce) + '</div>'
    + '<div class="ldt-case-col"><div class="ldt-case-t">收入</div>' + kv('模式', rev.model) + kv('区间', rev.amount_range) + kv('毛利', rev.margin) + '</div>'
    + '<div class="ldt-case-col"><div class="ldt-case-t">坑</div>' + pitfalls + '</div>'
    + '</div>'
    + chainHtml(c, opts.levels) + '<div class="ldt-case-act"><span class="ldt-btn" data-act="case-prompt" data-case="' + esc(c.case_id) + '">以此为目标生成关卡</span><span class="ldt-op" data-act="case-to-level" data-case="' + esc(c.case_id) + '">直接转 3 个递进备用关卡</span><span class="ldt-case-note">先生成 Prompt 发给外部 AI，拿回 3 个关卡 JSON 再从「导入更新」贴回来</span></div>'
    + '</div></div>';
  return { ok: true, html: html, cases: list, index: idx, errors: [] };
}

module.exports = { buildCasesHtml: buildCasesHtml, normCases: normCases, errorHtml: errorHtml };
