/* observe.js - 观察模式（骨架 v2 §14 ＋ 口径 R2）
 * 规则：任何新自动化先只记录「本来会做什么」不真执行，写 observe-<name>.log；
 * 一周后人工核对 ≥10 条（一致／不一致逐条记），全一致才允许切自动；切换后保留一键回观察。
 * 纯函数，不 require obsidian；日志两列固定：本来会做 / 实际做了。
 */
'use strict';
const WOULD = '本来会做';
const DID = '实际做了';
const NOT_RUN = '未执行（观察期只记录）';
const NAME_RE = /^observe-([a-z0-9][a-z0-9-]*)\.log$/;

function oneLine(v) { return String(v == null ? '' : v).replace(/[\r\n|]+/g, ' ').trim(); }
function stamp(d) { return (d || new Date()).toISOString(); }

function line(rec) {
  const r = rec || {};
  return [r.ts || stamp(), 'name=' + (r.name || 'unknown'), WOULD + '=' + oneLine(r.would), DID + '=' + oneLine(r.did || NOT_RUN)].join('|');
}

function parse(text) {
  const rows = [];
  String(text || '').split(/\r?\n/).forEach(function (raw, i) {
    const l = raw.trim();
    if (!l || l.charAt(0) === '#') { return; }
    const parts = l.split('|');
    if (parts.length < 4) { return; }
    const get = function (k) {
      const hit = parts.filter(function (x) { return x.indexOf(k + '=') === 0; })[0];
      return hit ? hit.slice(k.length + 1) : '';
    };
    rows.push({ n: rows.length + 1, ts: parts[0].trim(), name: get('name'), would: get(WOULD), did: get(DID), raw: l });
  });
  return rows;
}

function summary(rows) {
  const rs = Array.isArray(rows) ? rows : [];
  const executed = rs.filter(function (r) { return r.did && r.did !== NOT_RUN && !/^未执行/.test(r.did); }).length;
  const names = [];
  rs.forEach(function (r) { if (r.name && names.indexOf(r.name) < 0) { names.push(r.name); } });
  return { total: rs.length, executed: executed, observedOnly: rs.length - executed, names: names };
}

// 切自动前的机检：≥10 条记录 ＋ ≥10 条人工核对 ＋ 0 条不一致
function canSwitch(rows, reviewed) {
  const rs = Array.isArray(rows) ? rows : [];
  const rv = (Array.isArray(reviewed) ? reviewed : []).filter(function (r) { return r && (r.ok === true || r.ok === false); });
  const reasons = [];
  if (rs.length < 10) { reasons.push('观察记录只有 ' + rs.length + ' 条（要 ≥10）'); }
  if (rv.length < 10) { reasons.push('人工核对只有 ' + rv.length + ' 条（要 ≥10）'); }
  const bad = rv.filter(function (r) { return r.ok === false; });
  if (bad.length) { reasons.push('核对有 ' + bad.length + ' 条不一致（先改规则，别切自动）'); }
  const missing = rs.length - rv.length;
  if (missing > 0) { reasons.push('还有 ' + missing + ' 条没核对'); }
  return { ok: reasons.length === 0, reasons: reasons, total: rs.length, checked: rv.length, conflicts: bad.length };
}

function renderHtml(rows, reviewed) {
  const rs = Array.isArray(rows) ? rows : [];
  const s = summary(rs);
  const g = canSwitch(rs, reviewed);
  const list = rs.slice(0, 12).map(function (r) {
    return '<div class="ldt-obrow"><b>#' + r.n + '</b> ' + r.would + '<div class="ldt-muted">实际做了：' + r.did + '</div></div>';
  }).join('');
  return '<div class="ldt-observe"><div class="ldt-observe-head">观察模式 · ' + (s.names.join('、') || '未命名') + ' · 记录 ' + s.total + ' 条 · 已执行 ' + s.executed + ' 条</div>'
    + '<div class="ldt-muted">' + (g.ok ? '已满足切自动条件（≥10 条核对且 0 不一致）' : '还不能切自动：' + g.reasons.join('；')) + '</div>'
    + list + '</div>';
}

module.exports = { WOULD: WOULD, DID: DID, NOT_RUN: NOT_RUN, NAME_RE: NAME_RE, line: line, parse: parse, summary: summary, canSwitch: canSwitch, renderHtml: renderHtml, stamp: stamp };
