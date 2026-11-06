/* run-model.js - 用户进度模型（v0.3 M0-1）
 * 纯函数、无 IO：读写交给 store.atomicWrite；渲染交给 level-view。
 * 结构：{ schemaVersion:1, treeId, difficulty, archetype, createdAt, levels:{ <id>:{ status, evidence[], xp, rejectCount, tasks[], updatedAt } } }
 * 状态机：locked → open → done；死穴命中 → blocked（可从 blocked 回到 open）。
 */
'use strict';

const VERSION = 1;
const STATUSES = ['locked', 'open', 'done', 'blocked'];

function nowIso() { return new Date().toISOString(); }

function defaults(opts) {
  const o = opts || {};
  return {
    schemaVersion: VERSION,
    treeId: o.treeId || 'default',
    archetype: o.archetype || 'pipeline',
    difficulty: o.difficulty || 'standard',
    createdAt: o.createdAt || nowIso(),
    demo: !!o.demo,
    rejectionCount: 0,
    levels: {}
  };
}

function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

function normalize(raw, opts) {
  const o = opts || {};
  const base = defaults(o);
  if (raw == null) { return { ok: true, run: base, repaired: ['empty'] }; }
  if (!isObj(raw)) { return { ok: false, error: 'run.json 不是对象', run: base }; }
  const run = defaults(o);
  const repaired = [];
  if (Number(raw.schemaVersion) !== VERSION) { repaired.push('schemaVersion→' + VERSION); }
  if (typeof raw.archetype === 'string' && raw.archetype) { run.archetype = raw.archetype; }
  if (typeof raw.difficulty === 'string' && raw.difficulty) { run.difficulty = raw.difficulty; }
  if (typeof raw.treeId === 'string' && raw.treeId) { run.treeId = raw.treeId; }
  if (typeof raw.createdAt === 'string' && raw.createdAt) { run.createdAt = raw.createdAt; }
  if (raw.demo === true) { run.demo = true; }
  run.rejectionCount = Math.max(0, Number(raw.rejectionCount) || 0);
  const lv = isObj(raw.levels) ? raw.levels : {};
  Object.keys(lv).forEach(function (id) {
    const x = lv[id];
    if (!isObj(x)) { repaired.push(id + ':drop'); return; }
    const st = STATUSES.indexOf(x.status) >= 0 ? x.status : 'locked';
    run.levels[id] = {
      status: st,
      evidence: Array.isArray(x.evidence) ? x.evidence.filter(isObj) : [],
      xp: Math.max(0, Math.min(100, Number(x.xp) || 0)),
      rejectCount: Math.max(0, Number(x.rejectCount) || 0),
      tasks: Array.isArray(x.tasks) ? x.tasks.filter(isObj) : [],
      updatedAt: typeof x.updatedAt === 'string' ? x.updatedAt : nowIso()
    };
  });
  return { ok: true, run: run, repaired: repaired };
}

function statusOf(run, id, order) {
  const st = run && run.levels && run.levels[id];
  if (st && STATUSES.indexOf(st.status) >= 0) { return st.status; }
  const idx = (order || []).indexOf(id);
  return idx === 0 ? 'open' : 'locked';
}

function ensureLevel(run, id) {
  if (!run.levels[id]) {
    run.levels[id] = { status: 'open', evidence: [], xp: 0, rejectCount: 0, tasks: [], updatedAt: nowIso() };
  }
  return run.levels[id];
}

function setStatus(run, id, status) {
  if (STATUSES.indexOf(status) < 0) { return { ok: false, error: 'BAD_STATUS' }; }
  const x = ensureLevel(run, id);
  x.status = status;
  x.updatedAt = nowIso();
  return { ok: true, run: run };
}

// 证据：{ type:'junior'|'mid'|'senior', kind:'note'|'link'|'income', value, quote, at }
const XP_BY_TYPE = { junior: 30, mid: 70, senior: 100 };
function addEvidence(run, id, ev) {
  if (!isObj(ev) || !ev.type || !XP_BY_TYPE[ev.type]) { return { ok: false, error: 'BAD_EVIDENCE_TYPE' }; }
  if (typeof ev.value !== 'string' || ev.value.trim().length < 4) { return { ok: false, error: 'EMPTY_EVIDENCE' }; }
  const x = ensureLevel(run, id);
  const item = { type: ev.type, kind: ev.kind || 'note', value: String(ev.value).trim(), quote: String(ev.quote || '').trim(), at: nowIso() };
  x.evidence.push(item);
  x.xp = Math.max(x.xp, XP_BY_TYPE[ev.type]);
  x.updatedAt = nowIso();
  return { ok: true, run: run, evidence: item };
}

function bumpReject(run, id) {
  const x = ensureLevel(run, id);
  x.rejectCount += 1;
  x.updatedAt = nowIso();
  return x.rejectCount;
}

function stats(run, order) {
  const list = order || [];
  const done = list.filter(function (id) { return statusOf(run, id, order) === 'done'; }).length;
  const openCnt = list.filter(function (id) { return statusOf(run, id, order) === 'open'; }).length;
  let xp = 0;
  Object.keys(run.levels || {}).forEach(function (k) { xp += Number(run.levels[k].xp) || 0; });
  return { levels: list.length, done: done, open: openCnt, xp: xp };
}

// 全局拒绝计数（UI 层在证据被拒时调用；达到 2 由 UI 弹转职提示，判定器保持纯净）
function bumpRejection(run) {
  run.rejectionCount = (Number(run.rejectionCount) || 0) + 1;
  return run.rejectionCount;
}

// 体验版/正式版落点（体验版绝不写 run.json）
function fileNameFor(demo) { return demo ? '.ldt/run-demo.json' : '.ldt/run.json'; }

// 体验版一键升级：目标已有数据则拒绝（不合并、不覆盖）
function promoteDemo(run, existing) {
  const has = existing && existing.levels && Object.keys(existing.levels).length > 0;
  if (has) { return { ok: false, error: 'TARGET_NOT_EMPTY', hint: '正式数据已存在：先导出/清空，再升级' }; }
  const out = JSON.parse(JSON.stringify(run));
  out.demo = false;
  out.promotedAt = nowIso();
  return { ok: true, run: out };
}

module.exports = { VERSION: VERSION, STATUSES: STATUSES, defaults: defaults, normalize: normalize, statusOf: statusOf, setStatus: setStatus, addEvidence: addEvidence, bumpReject: bumpReject, stats: stats, XP_BY_TYPE: XP_BY_TYPE, bumpRejection: bumpRejection, fileNameFor: fileNameFor, promoteDemo: promoteDemo };
