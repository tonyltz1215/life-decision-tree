/* strategy.js - 公共策略库（本地版接口，M2）：只收结构化字段，绝不收原文
 * opt-in 由设置控制；aggregate 给「同关卡最高频卡点」用；exportPublic 为将来上传预留。
 */
'use strict';
const VERSION = 1;
const PLAN_TYPES = ['content', 'tool', 'service', 'other'];
const RESULTS = ['done', 'failed', 'quit'];
const HOURS = ['<2', '2-5', '5-10', '>10', 'unknown'];
const MAX_ENTRIES = 500;

function blank() { return { schemaVersion: VERSION, entries: [] }; }

function sanitize(e) {
  if (!e || typeof e !== 'object') { return { ok: false, error: 'BAD_ENTRY' }; }
  const levelId = String(e.levelId || '').slice(0, 12);
  if (!levelId) { return { ok: false, error: 'NO_LEVEL' }; }
  return {
    ok: true,
    entry: {
      levelId: levelId,
      archetype: String(e.archetype || '').slice(0, 16),
      difficulty: String(e.difficulty || '').slice(0, 12),
      planType: PLAN_TYPES.indexOf(e.planType) >= 0 ? e.planType : 'other',
      result: RESULTS.indexOf(e.result) >= 0 ? e.result : 'failed',
      hoursBand: HOURS.indexOf(e.hoursBand) >= 0 ? e.hoursBand : 'unknown',
      month: String(e.month || new Date().toISOString().slice(0, 7)).slice(0, 7)
    }
  };
}

function add(store, entry) {
  const s = sanitize(entry);
  if (!s.ok) { return s; }
  const st = (store && Array.isArray(store.entries)) ? store : blank();
  st.entries.push(s.entry);
  if (st.entries.length > MAX_ENTRIES) { st.entries = st.entries.slice(-MAX_ENTRIES); }
  return { ok: true, store: st };
}

function aggregate(store, levelId) {
  const all = ((store || {}).entries || []).filter(function (x) { return x.levelId === levelId; });
  const byType = {};
  all.forEach(function (x) { byType[x.planType] = (byType[x.planType] || 0) + 1; });
  const done = all.filter(function (x) { return x.result === 'done'; }).length;
  return { count: all.length, done: done, successRate: all.length ? Math.round((done / all.length) * 100) : 0, byType: byType };
}

function exportPublic(store) {
  const agg = {};
  ((store || {}).entries || []).forEach(function (x) {
    if (!agg[x.levelId]) { agg[x.levelId] = { count: 0, done: 0, planTypes: {} }; }
    agg[x.levelId].count += 1;
    if (x.result === 'done') { agg[x.levelId].done += 1; }
    agg[x.levelId].planTypes[x.planType] = (agg[x.levelId].planTypes[x.planType] || 0) + 1;
  });
  return { schemaVersion: VERSION, levels: agg };
}

module.exports = { VERSION: VERSION, PLAN_TYPES: PLAN_TYPES, RESULTS: RESULTS, HOURS: HOURS, MAX_ENTRIES: MAX_ENTRIES, blank: blank, sanitize: sanitize, add: add, aggregate: aggregate, exportPublic: exportPublic };
