/* verify.js - 证据判定器（M0-2）：纯函数、无 IO
 * 规则来源：关卡 stage（0→1 / 小成 / 大成）的默认门槛；关卡可用 gate 覆盖。
 * 判定顺序：先查死穴（blocked）→ 再看门槛（done/open）。
 * 死穴匹配是粗匹配（evidence.value/quote 包含死穴短语），命中即 blocked，不判定通过。
 */
'use strict';

const DEFAULT_GATE = {
  '0→1': { mid: 1, link: false, senior: 0 },
  '小成': { mid: 2, link: true, senior: 0 },
  '大成': { mid: 0, link: false, senior: 2 }
};
const RANK = { junior: 1, mid: 2, senior: 3 };
const XP_BY_TYPE = { junior: 30, mid: 70, senior: 100 };

function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, '').toLowerCase(); }

function gateOf(level) {
  if (level && level.gate) { return level.gate; }
  return DEFAULT_GATE[(level && level.stage) || '0→1'] || DEFAULT_GATE['0→1'];
}

function hitBlock(level, evidence) {
  const rules = (level.deathPoints || []).map(norm);
  return evidence.filter(function (e) {
    const text = norm(e.value) + '|' + norm(e.quote);
    return rules.some(function (r) { return r.length >= 3 && text.indexOf(r) >= 0; });
  });
}

// runState: { status, evidence:[], rejectCount, xp }
function judgeLevel(level, runState) {
  const st = runState || {};
  const ev = Array.isArray(st.evidence) ? st.evidence : [];
  const gate = gateOf(level);
  const hits = hitBlock(level, ev);
  if (hits.length) {
    return { ok: true, status: 'blocked', reasons: hits.map(function (h) { return '命中护身符：' + h.value.slice(0, 40); }), xp: 0, suggest: '先补安全垫，再回到本关' };
  }
  const senior = ev.filter(function (e) { return e.type === 'senior'; }).length;
  const midPlus = ev.filter(function (e) { return RANK[e.type] >= 2; }).length;
  const links = ev.filter(function (e) { return e.kind === 'link'; }).length;
  const reasons = [];
  if (senior < (gate.senior || 0)) { reasons.push('还差 ' + (gate.senior - senior) + ' 条高级凭据'); }
  if (midPlus < (gate.mid || 0)) { reasons.push('还差 ' + (gate.mid - midPlus) + ' 条中级以上凭据'); }
  if (gate.link && links < 1) { reasons.push('还差 1 条公网链接'); }
  const done = reasons.length === 0;
  const xp = ev.reduce(function (a, e) { return Math.max(a, XP_BY_TYPE[e.type] || 0); }, 0);
  const result = { ok: true, status: done ? 'done' : 'open', reasons: reasons, xp: done ? Math.max(xp, 70) : xp };
  if (!done && Number(st.rejectCount) >= 2) {
    result.suggest = '连续 2 次没通过：要不要换一条路，或回上一关降标准？';
  }
  return result;
}

module.exports = { judgeLevel: judgeLevel, gateOf: gateOf, DEFAULT_GATE: DEFAULT_GATE, XP_BY_TYPE: XP_BY_TYPE };
