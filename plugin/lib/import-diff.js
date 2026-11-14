/* import-diff.js — 资产包导入 Diff 与幂等合并（W2）
 * 纯函数：无 IO、无时间依赖、不改入参。
 * 口径：契约 v2.2 §1/§2 ＋ schema v2.1 properties.diff ＋ negotiation/NEG-W2-FINAL.md
 */
'use strict';
var DIFF_KEYS = ['new_skills', 'updated_skills', 'new_levels', 'unlocked_levels', 'new_routes'];
var ADVANCE = { 'locked>open': 1, 'open>done': 1, 'locked>done': 1 };
var REGRESS = { 'done>open': 1, 'done>locked': 1, 'open>locked': 1 };
function emptyDiff() {
  var d = {};
  DIFF_KEYS.forEach(function (k) { d[k] = []; });
  return d;
}
function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function _sort(v) {
  if (Array.isArray(v)) { return v.map(_sort); }
  if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = _sort(v[k]); }); return o; }
  return v;
}
function canon(v) { return JSON.stringify(_sort(v)); }
function same(a, b) { return canon(a) === canon(b); }

// 同 id 卡按 schema 全部 properties 深比较（数组按原序、不填默认值）
function skillChanged(prevS, nextS) { return !same(prevS, nextS); }

function mergeLevel(prevL, nextL) {
  var out = clone(nextL);
  var ps = prevL && prevL.status;
  var ns = nextL && nextL.status;
  if (ps && ns && ps !== ns && ADVANCE[ps + '>' + ns]) { out.status = ns; return { level: out, advanced: true }; }
  if (ps && ns && ps !== ns && REGRESS[ps + '>' + ns]) { out.status = ps; return { level: out, regression: true }; }
  if (ps) { out.status = ps; }
  return { level: out };
}

// mergePacks(prev, next) -> { ok, pack, diff, warnings }
function mergePacks(prev, next) {
  if (!prev || !next || typeof prev !== 'object' || typeof next !== 'object') { return { ok: false, error: 'NEED_BOTH_PACKS' }; }
  var diff = emptyDiff();
  var warnings = [];
  var out = clone(prev);
  ['schema', 'mode', 'summary', 'domains', 'archives'].forEach(function (k) { if (k in next) { out[k] = clone(next[k]); } });
  // ---- skills
  var byId = Object.create(null);
  (prev.skills || []).forEach(function (s) { if (s && s.id) { byId[s.id] = s; } });
  var skills = (prev.skills || []).map(clone);
  var idx = Object.create(null);
  skills.forEach(function (s, i) { if (s && s.id) { idx[s.id] = i; } });
  (next.skills || []).forEach(function (s) {
    if (!s || !s.id) { return; }
    if (!(s.id in byId)) { diff.new_skills.push(s.id); if (!(s.id in idx)) { skills.push(clone(s)); idx[s.id] = skills.length - 1; } }
    else if (skillChanged(byId[s.id], s)) { diff.updated_skills.push(s.id); if (s.id in idx) { skills[idx[s.id]] = clone(s); } }
  });
  out.skills = skills;
  // ---- levels
  var lvById = Object.create(null);
  (prev.levels || []).forEach(function (l) { if (l && l.id) { lvById[l.id] = l; } });
  var levels = (prev.levels || []).map(clone);
  var lidx = Object.create(null);
  levels.forEach(function (l, i) { if (l && l.id) { lidx[l.id] = i; } });
  (next.levels || []).forEach(function (l) {
    if (!l || !l.id) { return; }
    if (!(l.id in lvById)) { diff.new_levels.push(l.id); if (!(l.id in lidx)) { levels.push(clone(l)); lidx[l.id] = levels.length - 1; } return; }
    var r = mergeLevel(lvById[l.id], l);
    if (r.advanced) { diff.unlocked_levels.push(l.id); }
    if (r.regression) { warnings.push({ code: 'W_STATUS_REGRESSION', level_id: l.id }); }
    if (l.id in lidx) { levels[lidx[l.id]] = r.level; }
  });
  out.levels = levels;
  // ---- routes
  var rById = Object.create(null);
  (prev.routes || []).forEach(function (r) { if (r && r.id) { rById[r.id] = r; } });
  var routes = (prev.routes || []).map(clone);
  var ridx = Object.create(null);
  routes.forEach(function (r, i) { if (r && r.id) { ridx[r.id] = i; } });
  (next.routes || []).forEach(function (r) {
    if (!r || !r.id) { return; }
    if (!(r.id in rById)) { diff.new_routes.push(r.id); if (!(r.id in ridx)) { routes.push(clone(r)); ridx[r.id] = routes.length - 1; } }
    else if (!same(rById[r.id], r)) { if (r.id in ridx) { routes[ridx[r.id]] = clone(r); } }
  });
  if ('routes' in prev || 'routes' in next) { out.routes = routes; }
  // append-only 面：从 prev 继承，不写不删
  if ('runs' in prev) { out.runs = clone(prev.runs); }
  if (prev.generated_at !== undefined) { out.generated_at = clone(prev.generated_at); }
  if (prev.generated_by !== undefined) { out.generated_by = clone(prev.generated_by); }
  out.diff = diff;
  return { ok: true, pack: out, diff: diff, warnings: warnings };
}

function diffPacks(prev, next) { var r = mergePacks(prev, next); return r.ok ? r.diff : null; }
function isEmptyDiff(d) { return DIFF_KEYS.every(function (k) { return Array.isArray(d[k]) && d[k].length === 0; }); }

module.exports = {
  DIFF_KEYS: DIFF_KEYS, emptyDiff: emptyDiff, mergePacks: mergePacks, diffPacks: diffPacks,
  isEmptyDiff: isEmptyDiff, canon: canon
};
