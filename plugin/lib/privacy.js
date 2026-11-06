/* privacy.js - 隐私三件（诊断件 P0）：隐私政策 / 一键导出 / 删除
 * 铁律：数据只在本机；不收集、不上传、不训练；联网只在用户点了「AI 增强」并同意后发生；
 *       导出件必须含全部节点（含三层记忆），但先脱敏；删除后本地库与导出件都不含 PII。
 * 纯函数，不 require obsidian。
 */
'use strict';
const POLICY_VERSION = 'v1-20261105';
const PII_KINDS = [
  { kind: '手机号', re: /1[3-9]\d{9}/g },
  { kind: '邮箱', re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/g },
  { kind: '身份证', re: /\b\d{17}[\dXx]\b/g },
  { kind: '密钥', re: /\b(sk-[A-Za-z0-9]{8,}|SB-[A-Fa-f0-9]{16,})\b/g }
];
const MASK = '[已脱敏]';

const POLICY = [
  '人生决策树 隐私政策（' + POLICY_VERSION + '）',
  '1. 数据存在哪：只存在你自己电脑上的 .ldt/ 目录（person-model.json、memory.json、run.json）。不上传、不入云、不进任何服务器。',
  '2. 收集什么：只收集你亲口给的访谈原话、日记、计划与进度；不收集通讯录、不收集位置、不收集设备信息，也不读取你的其它笔记。',
  '3. 上传与训练：默认完全离线；我们不会把你的内容用于训练，也不会转给第三方。',
  '4. 联网只有一种情况：你主动点「AI 增强」并勾选同意后，才会把当次需要分析的文字发给 AI 服务；不点就永远不联网。',
  '5. 导出：一键导出会把全部节点、三层记忆、分支与进度写成一个 JSON 到 .ldt/export/，导出前自动脱敏手机号／邮箱／身份证／密钥。',
  '6. 删除：一键删除会清空本地库（节点、证据、三层记忆、进度），删除后不可恢复；已导出的文件需要你自己删。',
  '7. 不做心理诊断：只做沙盘推演，不提供心理诊断、不保证转行成功。',
  '8. 你能随时核对：设置页可看当前存了几个节点、几条证据、是否有 PII（应为 0）。',
  '9. 政策变更：改版会在设置页显示新版本号；改版前的导出件仍可读，不会因为换版打不开。',
  '10. 出问题怎么办：发现数据被误传，先在设置页「删除我的数据」清库并导出诊断包，把包发给主理人；我们按上面的删除承诺处理。',
].join('\n');

function list(x) { return Array.isArray(x) ? x : []; }
function clone(v) { return JSON.parse(JSON.stringify(v == null ? null : v)); }

function scanText(s) {
  const hits = [];
  const str = String(s == null ? '' : s);
  PII_KINDS.forEach(function (k) {
    const re = new RegExp(k.re.source, 'g');
    let m;
    while ((m = re.exec(str)) !== null) { hits.push({ kind: k.kind, sample: m[0].slice(0, 4) + '***' }); }
  });
  return hits;
}

function walk(node, path, out) {
  if (node == null) { return; }
  if (typeof node === 'string') {
    scanText(node).forEach(function (h) { out.push({ path: path, kind: h.kind }); });
    return;
  }
  if (typeof node === 'number' || typeof node === 'boolean') { return; }
  if (Array.isArray(node)) { node.forEach(function (v, i) { walk(v, path + '[' + i + ']', out); }); return; }
  Object.keys(node).forEach(function (k) { walk(node[k], path + '.' + k, out); });
}

function piiScan(obj) { const out = []; walk(obj, '$', out); return out; }

function redactDeep(node) {
  if (node == null) { return node; }
  if (typeof node === 'string') {
    let s = node;
    PII_KINDS.forEach(function (k) { s = s.replace(new RegExp(k.re.source, 'g'), MASK); });
    return s;
  }
  if (Array.isArray(node)) { return node.map(redactDeep); }
  if (typeof node === 'object') {
    const o = {};
    Object.keys(node).forEach(function (k) { o[k] = redactDeep(node[k]); });
    return o;
  }
  return node;
}

function exportPack(input, now) {
  const i = input || {};
  const model = i.model || {};
  const pack = {
    schema: 'ldt-export-v1',
    exported_at: (now || new Date()).toISOString(),
    policy_version: POLICY_VERSION,
    person: model.person || null,
    nodes: list(model.nodes),
    branches: list(model.branches),
    hidden_skills: list(model.hidden_skills),
    refusals: list(model.refusals),
    layers: i.layers || { L1: [], L2: [], L3: [] },
    run: i.run || { levels: {}, rejectionCount: 0 }
  };
  const red = redactDeep(pack);
  red.redacted = true;
  return red;
}

// 导出件完整性：全部节点 id 都在 + 三张表都在 + 0 PII
function checkExport(pack, model) {
  const p = pack || {};
  const m = model || {};
  const out = { ok: true, errors: [], nodesIn: 0, nodesOut: 0, pii: piiScan(p).length, layers: 0 };
  const ids = {};
  list(p.nodes).forEach(function (n) { if (n && n.id) { ids[n.id] = true; } });
  out.nodesIn = list(m.nodes).length;
  out.nodesOut = list(p.nodes).length;
  list(m.nodes).forEach(function (n) { if (n && n.id && !ids[n.id]) { out.errors.push('导出件缺节点：' + n.id); } });
  ['L1', 'L2', 'L3'].forEach(function (L) { if (!Array.isArray((p.layers || {})[L])) { out.errors.push('导出件缺 ' + L); } else { out.layers += p.layers[L].length; } });
  if (out.pii > 0) { out.errors.push('导出件含 PII ' + out.pii + ' 处'); }
  out.ok = out.errors.length === 0;
  return out;
}

function purge() {
  return {
    model: { status: 'ok', schemaVersion: 2, person: { alias: '已删除' }, nodes: [], branches: [], hidden_skills: [], refusals: [] },
    run: { levels: {}, rejectionCount: 0 },
    layers: { L1: [], L2: [], L3: [] }
  };
}

function verifyPurge(state) {
  const s = state || {};
  const nodes = list((s.model || {}).nodes).length;
  const branches = list((s.model || {}).branches).length;
  const layers = ['L1', 'L2', 'L3'].reduce(function (a, L) { return a + list((s.layers || {})[L]).length; }, 0);
  const runKeys = Object.keys((s.run || {}).levels || {}).length;
  const pii = piiScan(s).length;
  const errors = [];
  if (nodes) { errors.push('库里还有 ' + nodes + ' 个节点'); }
  if (branches) { errors.push('库里还有 ' + branches + ' 个分支'); }
  if (layers) { errors.push('库里还有 ' + layers + ' 条记忆'); }
  if (runKeys) { errors.push('库里还有 ' + runKeys + ' 关进度'); }
  if (pii) { errors.push('库里还有 ' + pii + ' 处 PII'); }
  return { ok: errors.length === 0, errors: errors, nodes: nodes, branches: branches, layers: layers, runKeys: runKeys, pii: pii };
}

module.exports = {
  POLICY_VERSION: POLICY_VERSION, POLICY: POLICY, MASK: MASK, PII_KINDS: PII_KINDS,
  scanText: scanText, piiScan: piiScan, redactDeep: redactDeep, exportPack: exportPack,
  checkExport: checkExport, purge: purge, verifyPurge: verifyPurge, clone: clone
};
