/* archives.js — archives 六类目录契约渲染（W4）
 * 纯函数：无 IO、无时间依赖、不改入参。
 * 口径：契约 v2.2 §3/§4 ＋ NEG-W4-FINAL；隐私：证件档命中号码时脱敏不回显（增补 §5 P4）。
 */
'use strict';
var CONTRACT_DIRS = [
  { name: '00-索引', required_files: ['index.json', 'index.md'] },
  { name: '01-个人信息', required_files: ['身份.md', '履历.md', '性格与偏好.md'] },
  { name: '02-社会关系', required_files: ['关系图谱.md', '关键人物.md', '社群.md'] },
  { name: '03-证件档案', required_files: ['证件清单.md'] },
  { name: '04-知识库', required_files: ['主题/index.md'] },
  { name: '05-负债与财务', required_files: ['资产.md', '负债.md', '现金流.md'] },
  { name: '06-经历事迹', required_files: ['时间线.md', '成就.md'] }
];
var CREDIBILITY = ['本人陈述', '第三方记录', 'AI 推断'];
var RE_CARD = /^sk-[a-z0-9-]{2,40}$/;
var RE_DIGITS6 = /\d{6,}/;
var FIELDS = ['path', 'source', 'credibility', 'linked_card'];
function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function badPath(p) {
  if (typeof p !== 'string' || !p) { return true; }
  if (/^[\/\\]/.test(p)) { return true; }
  if (/^[A-Za-z]:/.test(p)) { return true; }
  if (p.split(/[\\/]/).indexOf('..') >= 0) { return true; }
  return false;
}

function renderArchives(archives) {
  if (archives === undefined || archives === null) { return { ok: true, root: null, dirs: [], errors: [] }; }
  if (typeof archives !== 'object' || Array.isArray(archives)) {
    return { ok: false, root: null, dirs: [], errors: [{ code: 'E_ARCHIVE', field: 'archives' }] };
  }
  var errors = [];
  var root = typeof archives.root === 'string' && archives.root ? archives.root : null;
  if (!root) { errors.push({ code: 'E_ARCHIVE', field: 'root' }); }
  var inputDirs = Array.isArray(archives.dirs) ? archives.dirs : [];
  var byName = Object.create(null);
  var dupNames = [];
  inputDirs.forEach(function (d) {
    if (!d || typeof d.name !== 'string') { return; }
    if (d.name in byName) { if (dupNames.indexOf(d.name) < 0) { dupNames.push(d.name); } }
    byName[d.name] = d;
  });
  dupNames.forEach(function (nm) { errors.push({ code: 'E_ARCHIVE', dir: nm, field: 'dirs' }); });
  var missing = CONTRACT_DIRS.filter(function (c) { return !(c.name in byName); }).map(function (c) { return c.name; });
  if (missing.length) { errors.push({ code: 'E_ARCHIVE', missing: missing }); }
  var dirs = [];
  CONTRACT_DIRS.forEach(function (c) {
    var src = byName[c.name];
    var entries = [];
    if (src && Array.isArray(src.entries)) {
      src.entries.forEach(function (e, idx) {
        if (!e || typeof e !== 'object' || Array.isArray(e)) { errors.push({ code: 'E_ARCHIVE', dir: c.name, index: idx, field: 'entry' }); return; }
        var out = { path: e.path, source: e.source, credibility: e.credibility, linked_card: e.linked_card === undefined ? null : e.linked_card };
        if (typeof e.path !== 'string' || !e.path) { errors.push({ code: 'E_ARCHIVE', dir: c.name, index: idx, field: 'path' }); }
        else if (badPath(e.path)) { errors.push({ code: 'E_ARCHIVE', dir: c.name, index: idx, field: 'path' }); }
        if (typeof e.source !== 'string' || !e.source) { errors.push({ code: 'E_ARCHIVE', dir: c.name, index: idx, field: 'source' }); }
        if (CREDIBILITY.indexOf(e.credibility) < 0) { errors.push({ code: 'E_ARCHIVE', dir: c.name, index: idx, field: 'credibility' }); }
        if (!('linked_card' in e)) { errors.push({ code: 'E_ARCHIVE', dir: c.name, index: idx, field: 'linked_card' }); }
        else if (!(e.linked_card === null || (typeof e.linked_card === 'string' && RE_CARD.test(e.linked_card)))) { errors.push({ code: 'E_ARCHIVE', dir: c.name, index: idx, field: 'linked_card' }); }
        if (c.name === '03-证件档案') {
          var hit = false;
          FIELDS.forEach(function (f) {
            var v = e[f];
            if (v === undefined || v === null) { return; }
            var isObj = typeof v === 'object';
            var s = typeof v === 'string' ? v : (isObj ? JSON.stringify(v) : String(v));
            var m = s.match(RE_DIGITS6);
            if (m) { hit = true; errors.push({ code: 'E_ARCHIVE', dir: c.name, index: idx, field: f, offset: m.index }); }
            // 非原始类型一律不回显；命中串所在的原始字段也打码
            if (isObj || (m && f !== 'credibility')) { out[f] = '[redacted]'; }
            if (m && f === 'credibility') { out[f] = '[redacted]'; }
          });
          if (hit) { out.path = '[redacted]'; }
        }
        entries.push(out);
      });
    } else if (src && src.entries !== undefined && !Array.isArray(src.entries)) {
      errors.push({ code: 'E_ARCHIVE', dir: c.name, field: 'entries' });
    }
    dirs.push({ name: c.name, required_files: c.required_files.slice(), entries: entries });
  });
  return { ok: errors.length === 0, root: root, dirs: dirs, errors: errors };
}

module.exports = { CONTRACT_DIRS: CONTRACT_DIRS, FIELDS: FIELDS, renderArchives: renderArchives };
