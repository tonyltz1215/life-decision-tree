/* diagnosis.js - 诊断三态（骨架 v2 §13）：mastered / unstable / weak
 * mastered 首次答对 -> 实线 + 绿点；unstable 一错一对 -> 虚线 + 黄点 +「需要再验证」；
 * weak 连续两错 -> 锁定 + 红点 + 补强清单，并往前追一层先修（追到根或追到 mastered）。
 * 纯函数，不 require obsidian。
 */
'use strict';
const STATES = ['mastered', 'unstable', 'weak'];
const VIEW = {
  mastered: { cls: 'diag-mastered', line: 'solid', dot: 'green', label: '已掌握' },
  unstable: { cls: 'diag-unstable', line: 'dashed', dot: 'amber', label: '需要再验证' },
  weak: { cls: 'diag-weak', line: 'locked', dot: 'red', label: '待补强' },
  unknown: { cls: 'diag-unknown', line: 'none', dot: 'gray', label: '未评估' }
};
const VERIFY_TEXT = '需要再验证：换一个更具体的例子，再答一次';

function list(x) { return Array.isArray(x) ? x : []; }
function style(state) { return VIEW[state] || VIEW.unknown; }

// 判定：首答对 = mastered；出现连续两错 = weak；一错一对 = unstable（不并入 weak）
function classify(attempts) {
  const a = list(attempts).filter(function (x) { return typeof x === 'boolean'; });
  if (!a.length) { return 'unknown'; }
  if (a[0] === true) { return 'mastered'; }
  let consec = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === false) { consec += 1; if (consec >= 2) { return 'weak'; } } else { consec = 0; }
  }
  return a[a.length - 1] === true ? 'unstable' : 'weak';
}

// 追先修：从 weak 节点往上走，追到根或追到 mastered 为止；返回路径与要问的问题
function traceBack(nodes, id, maxDepth) {
  const arr = list(nodes);
  const byId = {};
  arr.forEach(function (n) { byId[n.id] = n; });
  const start = byId[id];
  if (!start) { return { ok: false, error: '没有这个节点：' + id, path: [], questions: [], stopped: 'missing' }; }
  const path = [id];
  const questions = [];
  let cur = start;
  let depth = 0;
  const limit = maxDepth || 6;
  while (depth < limit) {
    depth += 1;
    if (cur.state === 'mastered' && cur.id !== id) { return { ok: true, path: path, questions: questions, stopped: 'mastered' }; }
    const parentId = cur.parent || null;
    const parent = parentId ? byId[parentId] : null;
    if (!parent) { return { ok: path.length > 1, path: path, questions: questions, stopped: 'root' }; }
    path.push(parent.id);
    if (parent.question) { questions.push(parent.question); }
    cur = parent;
  }
  return { ok: true, path: path, questions: questions, stopped: 'depth' };
}

function counts(branches) {
  const c = { total: 0, mastered: 0, unstable: 0, weak: 0, unknown: 0 };
  list(branches).forEach(function (b) {
    const s = (b && b.diag && b.diag.state) || 'unknown';
    c.total += 1;
    c[s] = (c[s] || 0) + 1;
  });
  return c;
}

// 把 model.diagnosis.branches 摊到 model.branches[].diag，树渲染只认 b.diag（不改数据模型字段）
function decorate(model) {
  const m = model || {};
  const dg = m.diagnosis || {};
  const per = dg.branches || {};
  const br = list(m.branches);
  const enriched = br.map(function (b) {
    const d = per[b.id] || {};
    return { id: b.id, parent: b.parent || d.parent || null, state: d.state || classify(d.attempts), question: d.question || '' };
  });
  const out = Object.assign({}, m);
  out.branches = br.map(function (b, i) {
    const d = per[b.id] || {};
    const state = enriched[i].state;
    const v = style(state);
    const tb = state === 'weak' ? traceBack(enriched, b.id) : null;
    return Object.assign({}, b, {
      diag: {
        state: state, cls: v.cls, line: v.line, dot: v.dot, label: v.label,
        attempts: list(d.attempts),
        verify: state === 'unstable' ? VERIFY_TEXT : '',
        repair: state === 'weak' ? list(d.repair).length ? list(d.repair) : ['先补一条带日期的具体案例', '再回到上一个已掌握的分支'] : [],
        trace: tb && tb.ok ? tb.path : [],
        traceStopped: tb ? tb.stopped : '',
        questions: tb ? tb.questions : []
      }
    });
  });
  out.diagStats = counts(out.branches);
  return out;
}

function check(model) {
  const errors = [];
  // 先核对输入自带的 diag 是否与 state 自洽（防上游把 unstable 改成 weak 的 label）
  list((model || {}).branches).forEach(function (b) {
    if (!b || !b.diag) { return; }
    const v = VIEW[b.diag.state] || VIEW.unknown;
    if (b.diag.label !== v.label) { errors.push('分支 ' + b.id + ' 的标签与态不符：' + b.diag.label + ' != ' + v.label); }
    if (b.diag.line !== v.line) { errors.push('分支 ' + b.id + ' 的线型与态不符'); }
  });
  const m = decorate(model);
  const per = ((m.diagnosis || {}).branches) || {};
  Object.keys(per).forEach(function (id) {
    const d = per[id] || {};
    if (d.state && STATES.indexOf(d.state) < 0) { errors.push('分支 ' + id + ' 的态不合法：' + d.state); }
    if (d.attempts && !list(d.attempts).length && !d.state) { errors.push('分支 ' + id + ' 既没有 attempts 也没有 state'); }
  });
  list(m.branches).forEach(function (b) {
    if (!b.diag) { errors.push('分支 ' + b.id + ' 没有摊出 diag'); return; }
    if (b.diag.state === 'unstable' && b.diag.label === '待补强') { errors.push('unstable 被并进 weak：' + b.id); }
    if (b.diag.state === 'weak' && (!b.diag.trace || b.diag.trace.length < 2)) { errors.push('weak 没追先修：' + b.id); }
  });
  return { ok: errors.length === 0, errors: errors, stats: m.diagStats };
}

function renderHtml(model) {
  const m = decorate(model);
  const s = m.diagStats || counts([]);
  const rows = list(m.branches).map(function (b) {
    const d = b.diag || {};
    const parts = ['<div class="ldt-diagrow ' + d.cls + '"><i class="ldt-dot ' + d.dot + '"></i><b>' + b.id + '</b> ' + (b.title || '') +
      '<span class="ldt-tag diag">' + (d.label || '') + '</span>'];
    if (d.verify) { parts.push('<div class="ldt-muted">' + d.verify + '</div>'); }
    if (d.repair && d.repair.length) { parts.push('<div class="ldt-muted">补强清单：' + d.repair.join('；') + '</div>'); }
    if (d.trace && d.trace.length > 1) { parts.push('<div class="ldt-muted">追先修：' + d.trace.join(' → ') + '（停在 ' + (d.traceStopped === 'mastered' ? '已掌握' : '根') + '）</div>'); }
    if (d.questions && d.questions.length) { parts.push('<div class="ldt-muted">先问：' + d.questions.join('；') + '</div>'); }
    parts.push('</div>');
    return parts.join('');
  }).join('');
  return '<div class="ldt-diag"><div class="ldt-diag-head">诊断三态 · 已掌握 ' + s.mastered + ' / 需要再验证 ' + s.unstable + ' / 待补强 ' + s.weak + '（共 ' + s.total + '）</div>' + rows + '</div>';
}

module.exports = {
  STATES: STATES, VIEW: VIEW, VERIFY_TEXT: VERIFY_TEXT,
  classify: classify, traceBack: traceBack, decorate: decorate, check: check, counts: counts, renderHtml: renderHtml, style: style
};
