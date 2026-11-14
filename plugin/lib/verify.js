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

// ================================================================
// 资产包契约校验（W1 · 七码）—— 纯函数：无文件读写、无全局状态
// 口径：契约 v2.2 §1–§4 ＋ schema v2.1（required/枚举）＋ negotiation/NEG-W1-FINAL.md
// ================================================================
var PACK_RULES = {
  SCHEMA: 'ldt-assets-v2',
  DOMAINS: ['获客/流量', '产品/交付', '销售/转化', '内容/表达', '技术/工具', '管理/统筹', '分析/洞察', '风控/财务'],
  TOP: ['schema', 'generated_at', 'skills', 'levels'],
  SKILL: ['id', 'name', 'domain', 'level', 'upgrade_condition', 'status'],
  LEVEL: ['id', 'title', 'condition', 'gate_type', 'status', 'kind'],
  ROUTE: ['id', 'from', 'to'],
  RUN: ['run_id', 'at', 'prompt_version', 'model', 'input_hash', 'output_hash', 'verify_result', 'merged'],
  ARCHIVE_DIRS: ['00-索引', '01-个人信息', '02-社会关系', '03-证件档案', '04-知识库', '05-负债与财务', '06-经历事迹'],
  ENTRY: ['path', 'source', 'credibility', 'linked_card'],
  CREDIBILITY: ['本人陈述', '第三方记录', 'AI 推断'],
  ENUMS: {
    mode: ['init', 'increment', 'migrated'],
    'skill.type': ['能力', '证据', '资源', '风险'],
    'skill.status': ['verified', 'unverified'],
    'skill.source': ['interview', 'ai', 'migrated-v1'],
    'level.gate_type': ['验证型', '生存型'],
    'level.status': ['locked', 'open', 'done'],
    'level.kind': ['main', 'backup', 'hidden']
  },
  BLOCKING: { E_FIELDS: 1, E_ENUM: 1, E_DUP_ID: 1, E_ARCHIVE: 1, E_HASH: 1 },
  RE_SKILL: /^sk-[a-z0-9-]{2,40}$/,
  RE_LEVEL: /^lv-[a-z0-9-]{2,40}$/,
  RE_DIGITS: /\d{6,}/
};

function _str(x) { return typeof x === 'string'; }
function _obj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
function _add(f, code, where, msg) { f.push({ code: code, where: where, msg: msg, blocking: !!PACK_RULES.BLOCKING[code] }); }
function _sortKeys(v) {
  if (Array.isArray(v)) { return v.map(_sortKeys); }
  if (_obj(v)) { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = _sortKeys(v[k]); }); return o; }
  return v;
}
// 口径：去 runs 段后的规范化 JSON（键排序、紧凑分隔、不转义中文）sha256 前 16 位
function packH16(pack) {
  var crypto = require('crypto');
  var payload = {};
  Object.keys(pack).forEach(function (k) { if (k !== 'runs') { payload[k] = pack[k]; } });
  return crypto.createHash('sha256').update(Buffer.from(JSON.stringify(_sortKeys(payload)), 'utf8')).digest('hex').slice(0, 16);
}

function checkPack(pack) {
  var f = [];
  if (!_obj(pack)) { _add(f, 'E_FIELDS', '$', '顶层不是对象'); return f; }
  var i, j, k, w;
  PACK_RULES.TOP.forEach(function (key) { if (!(key in pack)) { _add(f, 'E_FIELDS', '$', '顶层缺必填字段 ' + key); } });
  if ('schema' in pack && pack.schema !== PACK_RULES.SCHEMA) { _add(f, 'E_ENUM', '$.schema', 'schema 应为常量 ' + PACK_RULES.SCHEMA); }
  if ('mode' in pack && PACK_RULES.ENUMS.mode.indexOf(pack.mode) < 0) { _add(f, 'E_ENUM', '$.mode', 'mode 越界：' + pack.mode); }
  if ('domains' in pack) {
    if (!Array.isArray(pack.domains)) { _add(f, 'E_FIELDS', '$.domains', 'domains 应为数组'); }
    else { pack.domains.forEach(function (d, n) { if (PACK_RULES.DOMAINS.indexOf(d) < 0) { _add(f, 'E_ENUM', '$.domains[' + n + ']', 'domain 越界：' + d); } }); }
  }
  var skillIds = [];
  if ('skills' in pack) {
    if (!Array.isArray(pack.skills)) { _add(f, 'E_FIELDS', '$.skills', 'skills 应为数组'); }
    else {
      pack.skills.forEach(function (s, n) {
        w = '$.skills[' + n + ']';
        if (!_obj(s)) { _add(f, 'E_FIELDS', w, '卡片不是对象'); return; }
        PACK_RULES.SKILL.forEach(function (key) { if (!(key in s)) { _add(f, 'E_FIELDS', w, '卡片缺必填字段 ' + key); } });
        var ev = s.evidence;
        if (!('evidence' in s)) { _add(f, 'E_EVIDENCE', w + '.evidence', 'evidence 缺失 -> 标 unverified'); }
        else if (!Array.isArray(ev)) { _add(f, 'E_FIELDS', w + '.evidence', 'evidence 应为字符串数组'); }
        else if (ev.length === 0 || ev.some(function (x) { return !_str(x) || x.trim() === ''; })) { _add(f, 'E_EVIDENCE', w + '.evidence', 'evidence 为空串/空数组 -> 标 unverified'); }
        if ('id' in s) {
          if (!_str(s.id) || !PACK_RULES.RE_SKILL.test(s.id)) { _add(f, 'E_FIELDS', w + '.id', 'id 格式不合 ^sk-[a-z0-9-]{2,40}$：' + s.id); }
          else { if (skillIds.indexOf(s.id) >= 0) { _add(f, 'E_DUP_ID', w + '.id', 'id 重复：' + s.id); } skillIds.push(s.id); }
        }
        if (_str(s.name) && s.name.length > 30) { _add(f, 'E_FIELDS', w + '.name', 'name 超 30 字（' + s.name.length + '）'); }
        if ('domain' in s) {
          if (!Array.isArray(s.domain) || !s.domain.length) { _add(f, 'E_FIELDS', w + '.domain', 'domain 应为非空数组'); }
          else { s.domain.forEach(function (d, m) { if (PACK_RULES.DOMAINS.indexOf(d) < 0) { _add(f, 'E_ENUM', w + '.domain[' + m + ']', 'domain 越界：' + d); } }); }
        }
        ['type', 'status', 'source'].forEach(function (key) {
          if (key in s && PACK_RULES.ENUMS['skill.' + key].indexOf(s[key]) < 0) { _add(f, 'E_ENUM', w + '.' + key, key + ' 越界：' + s[key]); }
        });
        if ('level' in s) {
          var lv = s.level;
          if (typeof lv !== 'number' || lv % 1 !== 0 || lv < 0 || lv > 5) { _add(f, 'E_FIELDS', w + '.level', 'level 应为 0–5 的整数：' + lv); }
        }
      });
    }
  }
  var levelIds = [];
  if ('levels' in pack) {
    if (!Array.isArray(pack.levels)) { _add(f, 'E_FIELDS', '$.levels', 'levels 应为数组'); }
    else {
      pack.levels.forEach(function (l, n) {
        w = '$.levels[' + n + ']';
        if (!_obj(l)) { _add(f, 'E_FIELDS', w, '关卡不是对象'); return; }
        PACK_RULES.LEVEL.forEach(function (key) { if (!(key in l)) { _add(f, 'E_FIELDS', w, '关卡缺必填字段 ' + key); } });
        if ('id' in l) {
          if (!_str(l.id) || !PACK_RULES.RE_LEVEL.test(l.id)) { _add(f, 'E_FIELDS', w + '.id', 'id 格式不合 ^lv-[a-z0-9-]{2,40}$：' + l.id); }
          else { if (levelIds.indexOf(l.id) >= 0) { _add(f, 'E_DUP_ID', w + '.id', 'id 重复：' + l.id); } levelIds.push(l.id); }
        }
        ['gate_type', 'status', 'kind'].forEach(function (key) {
          if (key in l && PACK_RULES.ENUMS['level.' + key].indexOf(l[key]) < 0) { _add(f, 'E_ENUM', w + '.' + key, key + ' 越界：' + l[key]); }
        });
        ['evidence_refs', 'have_skills'].forEach(function (fld) {
          if (Array.isArray(l[fld])) { l[fld].forEach(function (r) { if (_str(r) && r.indexOf('sk-') === 0 && skillIds.indexOf(r) < 0) { _add(f, 'E_DANGLING_REF', w + '.' + fld, '引用不存在的卡 ' + r + ' -> 标「本包未收录」'); } }); }
        });
        if (_obj(l.detail) && Array.isArray(l.detail.related_skills)) { l.detail.related_skills.forEach(function (r) { if (_str(r) && r.indexOf('sk-') === 0 && skillIds.indexOf(r) < 0) { _add(f, 'E_DANGLING_REF', w + '.detail.related_skills', '引用不存在的卡 ' + r + ' -> 标「本包未收录」'); } }); }
      });
    }
  }
  var routeIds = [];
  if ('routes' in pack) {
    if (!Array.isArray(pack.routes)) { _add(f, 'E_FIELDS', '$.routes', 'routes 应为数组'); }
    else {
      pack.routes.forEach(function (r, n) {
        w = '$.routes[' + n + ']';
        if (!_obj(r)) { _add(f, 'E_FIELDS', w, '路由不是对象'); return; }
        PACK_RULES.ROUTE.forEach(function (key) { if (!(key in r)) { _add(f, 'E_FIELDS', w, '路由缺必填字段 ' + key); } });
        if (_str(r.id)) { if (routeIds.indexOf(r.id) >= 0) { _add(f, 'E_DUP_ID', w + '.id', 'id 重复：' + r.id); } routeIds.push(r.id); }
        ['from', 'to'].forEach(function (key) {
          if (_str(r[key]) && levelIds.length && levelIds.indexOf(r[key]) < 0) { f.push({ code: 'W_DANGLING_LEVEL', where: w + '.' + key, msg: '指向不存在的关卡 ' + r[key] + '（warn，不置码）', blocking: false }); }
        });
      });
    }
  }
  var runs = pack.runs;
  if (pack.mode === 'increment' && (!runs || (Array.isArray(runs) && !runs.length))) { _add(f, 'E_FIELDS', '$.runs', 'mode=increment 时 runs 必填'); }
  if (runs !== undefined && runs !== null) {
    if (!Array.isArray(runs)) { _add(f, 'E_FIELDS', '$.runs', 'runs 应为数组'); }
    else {
      runs.forEach(function (rn, n) {
        w = '$.runs[' + n + ']';
        if (!_obj(rn)) { _add(f, 'E_FIELDS', w, 'run 不是对象'); return; }
        PACK_RULES.RUN.forEach(function (key) { if (!(key in rn)) { _add(f, 'E_FIELDS', w, 'run 缺字段 ' + key); } });
        if ('verify_result' in rn) {
          var vr = rn.verify_result;
          if (!_obj(vr) || !('pass' in vr) || !('codes' in vr)) { _add(f, 'E_FIELDS', w + '.verify_result', 'verify_result 应为 {pass, codes[]}'); }
          else if (!Array.isArray(vr.codes)) { _add(f, 'E_FIELDS', w + '.verify_result.codes', 'codes 应为数组'); }
        }
        if ('merged' in rn && typeof rn.merged !== 'boolean') { _add(f, 'E_FIELDS', w + '.merged', 'merged 应为布尔'); }
        if ('output_hash' in rn && !_str(rn.output_hash)) { _add(f, 'E_FIELDS', w + '.output_hash', 'output_hash 应为字符串'); }
        if (n < runs.length - 1 && _str(rn.output_hash) && !/^[0-9a-f]{16}$/.test(rn.output_hash)) { _add(f, 'E_HASH', w + '.output_hash', '历史 run 的 hash 形态非法（应为 16 位 hex）'); }
      });
      var lastRun = runs.length ? runs[runs.length - 1] : null;
      if (_obj(lastRun) && _str(lastRun.output_hash)) {
        var want = packH16(pack);
        if (lastRun.output_hash !== want) { _add(f, 'E_HASH', '$.runs[-1].output_hash', 'output_hash=' + JSON.stringify(lastRun.output_hash) + ' 与实际包对不上（实测 ' + want + '，口径：去 runs 段规范化 JSON）-> 阻止合并'); }
      }
    }
  }
  if ('archives' in pack && pack.archives !== null) {
    var ar = pack.archives;
    if (!_obj(ar)) { _add(f, 'E_ARCHIVE', '$.archives', 'archives 应为对象'); }
    else {
      if (!_str(ar.root) || !ar.root) { _add(f, 'E_ARCHIVE', '$.archives.root', '缺 root'); }
      if (!Array.isArray(ar.dirs)) { _add(f, 'E_ARCHIVE', '$.archives.dirs', 'dirs 应为数组'); }
      else {
        var names = [];
        ar.dirs.forEach(function (d, n) {
          w = '$.archives.dirs[' + n + ']';
          if (!_obj(d)) { _add(f, 'E_ARCHIVE', w, '目录项不是对象'); return; }
          names.push(d.name);
          if (PACK_RULES.ARCHIVE_DIRS.indexOf(d.name) < 0) { _add(f, 'E_ARCHIVE', w + '.name', '目录名不在契约内：' + d.name); }
          if (!Array.isArray(d.required_files) || !d.required_files.length || d.required_files.some(function (x) { return !_str(x) || !x; })) { _add(f, 'E_ARCHIVE', w + '.required_files', 'required_files 应为非空字符串数组'); }
          if (!Array.isArray(d.entries)) { _add(f, 'E_ARCHIVE', w + '.entries', 'entries 应为数组'); return; }
          d.entries.forEach(function (e, m) {
            var we = w + '.entries[' + m + ']';
            if (!_obj(e)) { _add(f, 'E_ARCHIVE', we, '条目不是对象'); return; }
            PACK_RULES.ENTRY.forEach(function (key) { if (!(key in e)) { _add(f, 'E_ARCHIVE', we, '条目不完整，缺字段 ' + key); } });
            if ('credibility' in e && PACK_RULES.CREDIBILITY.indexOf(e.credibility) < 0) { _add(f, 'E_ARCHIVE', we + '.credibility', '可信度越界：' + e.credibility); }
            if ('linked_card' in e && e.linked_card !== null && !(_str(e.linked_card) && skillIds.indexOf(e.linked_card) >= 0)) {
              f.push({ code: 'W_DANGLING_CARD', where: we + '.linked_card', msg: '关联卡不在本包：' + e.linked_card + '（warn，不置码）', blocking: false });
            }
            if (d.name === '03-证件档案') {
              var blob = PACK_RULES.ENTRY.map(function (key) { return String(e[key] === undefined ? '' : e[key]); }).join(' ');
              if (PACK_RULES.RE_DIGITS.test(blob)) { _add(f, 'E_ARCHIVE', we, '证件档案含 >=6 位连续数字（疑似号码）'); }
            }
          });
        });
        PACK_RULES.ARCHIVE_DIRS.forEach(function (need) { if (names.indexOf(need) < 0) { _add(f, 'E_ARCHIVE', '$.archives.dirs', '目录不全，缺 ' + need); } });
      }
    }
  }
  return f;
}

var SEVEN = ['E_FIELDS', 'E_ENUM', 'E_EVIDENCE', 'E_DUP_ID', 'E_DANGLING_REF', 'E_ARCHIVE', 'E_HASH'];
function packVerdict(findings) {
  var codes = [], warnings = [], blocking = 0;
  findings.forEach(function (x) {
    if (x.blocking) { blocking += 1; }
    if (x.code === 'NOTE_HASH') { return; }
    if (SEVEN.indexOf(x.code) >= 0) { if (codes.indexOf(x.code) < 0) { codes.push(x.code); } }
    else { warnings.push({ where: x.where, msg: x.msg }); }
  });
  codes.sort();
  return { rc: blocking ? 1 : 0, codes: codes, warnings: warnings, blocking: blocking, findings: findings };
}

module.exports = {
  judgeLevel: judgeLevel, gateOf: gateOf, DEFAULT_GATE: DEFAULT_GATE, XP_BY_TYPE: XP_BY_TYPE,
  checkPack: checkPack, packVerdict: packVerdict, packH16: packH16, PACK_RULES: PACK_RULES
};
