/* assets-pack.js - 资产包（v2.1）读写与校验；纯函数，不 require obsidian */
'use strict';
const SCHEMA = 'ldt-assets-v2';
const SCHEMA_ALIASES = ['ldt-assets-v2', 'ldt-assets-v2.1'];
const DOMAINS = ['获客/流量', '产品/交付', '销售/转化', '内容/表达', '技术/工具', '管理/统筹', '分析/洞察', '风控/财务'];
const STATUS = ['verified', 'unverified'];
const KINDS = ['main', 'backup', 'hidden'];

function empty() { return { schema: SCHEMA, generated_at: '', mode: 'empty', domains: DOMAINS.slice(), skills: [], levels: [], routes: [] }; }
function arr(v) { return Array.isArray(v) ? v : []; }
function isStr(v) { return typeof v === 'string' && v.trim().length > 0; }

// 返回 { ok, pack, errors:[{code,path,msg}] }；不抛异常
function normalize(raw) {
  const errors = [];
  if (raw == null) { return { ok: false, pack: empty(), errors: [{ code: 'E_JSON', path: '$', msg: '资产包为空' }] }; }
  if (typeof raw !== 'object' || Array.isArray(raw)) { return { ok: false, pack: empty(), errors: [{ code: 'E_JSON', path: '$', msg: '不是 JSON 对象' }] }; }
  if (!SCHEMA_ALIASES.includes(raw.schema)) { errors.push({ code: 'E_SCHEMA', path: '$.schema', msg: '期望 ' + SCHEMA + '，实为 ' + String(raw.schema) }); }
  const out = {
    schema: SCHEMA,
    generated_at: isStr(raw.generated_at) ? raw.generated_at : '',
    mode: isStr(raw.mode) ? raw.mode : 'sample',
    domains: arr(raw.domains).filter(isStr).length ? arr(raw.domains).filter(isStr) : DOMAINS.slice(),
    skills: [], levels: [], routes: []
  };
  const ids = Object.create(null);
  arr(raw.skills).forEach(function (s, i) {
    const p = '$.skills[' + i + ']';
    if (!s || typeof s !== 'object') { errors.push({ code: 'E_FIELDS', path: p, msg: '不是对象' }); return; }
    if (!isStr(s.id) || !isStr(s.name)) { errors.push({ code: 'E_FIELDS', path: p, msg: '缺 id/name' }); }
    if (ids['s:' + s.id]) { errors.push({ code: 'E_DUP_ID', path: p, msg: '重复 id ' + s.id }); }
    ids['s:' + s.id] = 1;
    if (!STATUS.includes(s.status)) { errors.push({ code: 'E_ENUM', path: p + '.status', msg: '非法 status ' + String(s.status) }); }
    if (!arr(s.domain).length) { errors.push({ code: 'E_FIELDS', path: p + '.domain', msg: '缺领域' }); }
    if (s.status !== 'unverified' && !arr(s.evidence).length) { s.status = 'unverified'; s.autoDowngraded = true; }
    out.skills.push({ id: s.id, name: s.name, domain: arr(s.domain).filter(isStr), type: isStr(s.type) ? s.type : '能力', evidence: arr(s.evidence).filter(isStr), level: Number(s.level) || 0, upgrade_condition: isStr(s.upgrade_condition) ? s.upgrade_condition : '', status: s.status, source: isStr(s.source) ? s.source : 'interview' });
  });
  arr(raw.levels).forEach(function (l, i) {
    const p = '$.levels[' + i + ']';
    if (!l || typeof l !== 'object') { errors.push({ code: 'E_FIELDS', path: p, msg: '不是对象' }); return; }
    if (!isStr(l.id) || !isStr(l.title)) { errors.push({ code: 'E_FIELDS', path: p, msg: '缺 id/title' }); }
    if (ids['l:' + l.id]) { errors.push({ code: 'E_DUP_ID', path: p, msg: '重复 id ' + l.id }); }
    ids['l:' + l.id] = 1;
    out.levels.push({ id: l.id, title: l.title, condition: isStr(l.condition) ? l.condition : '', gate_type: isStr(l.gate_type) ? l.gate_type : '', kind: KINDS.includes(l.kind) ? l.kind : 'main', ui_copy: (l.ui_copy && typeof l.ui_copy === 'object') ? l.ui_copy : {}, status: isStr(l.status) ? l.status : 'open' });
  });
  arr(raw.routes).forEach(function (r, i) {
    const p = '$.routes[' + i + ']';
    if (!r || typeof r !== 'object') { errors.push({ code: 'E_FIELDS', path: p, msg: '不是对象' }); return; }
    if (!isStr(r.from) || !isStr(r.to)) { errors.push({ code: 'E_FIELDS', path: p, msg: '缺 from/to' }); return; }
    out.routes.push({ id: isStr(r.id) ? r.id : 'rt-' + (i + 1), from: r.from, to: r.to, trigger: isStr(r.trigger) ? r.trigger : '' });
  });
  out.routes.forEach(function (r, i) {
    if (!ids['l:' + r.from]) { errors.push({ code: 'E_DANGLING_REF', path: '$.routes[' + i + '].from', msg: '指向不存在的关卡 ' + r.from }); }
    if (!ids['l:' + r.to]) { errors.push({ code: 'E_DANGLING_REF', path: '$.routes[' + i + '].to', msg: '指向不存在的关卡 ' + r.to }); }
  });
  return { ok: errors.length === 0, pack: out, errors: errors };
}

function stats(pack) {
  const p = pack || empty();
  const skills = arr(p.skills);
  const levels = arr(p.levels);
  return {
    cards: skills.length,
    main: levels.filter(function (l) { return l && l.kind === 'main'; }).length,
    backup: levels.filter(function (l) { return l && l.kind === 'backup'; }).length,
    hidden: levels.filter(function (l) { return l && l.kind === 'hidden'; }).length,
    unverified: skills.filter(function (s) { return s && s.status === 'unverified'; }).length,
    domains: (arr(p.domains).length ? arr(p.domains) : DOMAINS).length
  };
}

module.exports = { SCHEMA: SCHEMA, SCHEMA_ALIASES: SCHEMA_ALIASES, DOMAINS: DOMAINS, empty: empty, normalize: normalize, stats: stats };
