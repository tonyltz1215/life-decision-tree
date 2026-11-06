/* feedback.js - 产品内反馈打包（M0-3 用）：脱敏 run.json → 可直接邮件/落盘
 * 只保留结构（状态/类型/计数/XP），**绝不带** evidence 的 value/quote 原文。
 */
'use strict';
const VERSION = 1;

function redactRun(run) {
  const out = { levels: {} };
  const lv = (run && run.levels) || {};
  Object.keys(lv).forEach(function (id) {
    const x = lv[id] || {};
    const ev = Array.isArray(x.evidence) ? x.evidence : [];
    const types = { junior: 0, mid: 0, senior: 0 };
    ev.forEach(function (e) { if (types[e.type] != null) { types[e.type] += 1; } });
    out.levels[id] = {
      status: x.status || 'locked',
      xp: Number(x.xp) || 0,
      rejectCount: Number(x.rejectCount) || 0,
      evidenceTypes: types,
      links: ev.filter(function (e) { return e.kind === 'link'; }).length
    };
  });
  return out;
}

function buildPayload(input) {
  const i = input || {};
  const run = i.run || {};
  const levels = redactRun(run).levels;
  const ids = Object.keys(levels);
  return {
    schemaVersion: VERSION,
    app: 'life-decision-tree',
    generatedAt: new Date().toISOString(),
    note: String(i.note || '').slice(0, 500),
    summary: {
      archetype: run.archetype || 'pipeline',
      difficulty: run.difficulty || 'standard',
      demo: run.demo === true,
      rejectionCount: Number(run.rejectionCount) || 0,
      levels: ids.length,
      done: ids.filter(function (k) { return levels[k].status === 'done'; }).length,
      xp: ids.reduce(function (a, k) { return a + levels[k].xp; }, 0)
    },
    levels: levels
  };
}

function fileNameFor(ts) {
  const t = String(ts || new Date().toISOString()).replace(/[:.]/g, '-');
  return '.ldt/feedback/feedback-' + t + '.json';
}

function mailtoFor(payload, to) {
  const subject = '人生决策树 · 反馈 ' + (payload && payload.summary ? payload.summary.archetype : '');
  const body = '请把下面这段贴回给我（已脱敏，不含你的原文）：\n\n' + JSON.stringify(payload, null, 1).slice(0, 1200);
  return 'mailto:' + String(to || '').trim() + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

module.exports = { VERSION: VERSION, redactRun: redactRun, buildPayload: buildPayload, fileNameFor: fileNameFor, mailtoFor: mailtoFor };
