/* store.js - 本地模型文件的写入纪律（落地方案-三项待做 §4：W1/W2/W3）
 * W1 原子写：先写 <file>.tmp-<pid>-<ts>，再 rename 覆盖 —— 断电不会留半截 JSON
 * W2 冲突另存：外部改过（期望 sha256 不符）就不覆盖，另存 *.conflict-<ts>.json
 * W3 迁移备份：schemaVersion 变大时先复制 data.backup-v<n>.json，且备份 sha256 必须等于迁移前
 * 纯 Node（fs/crypto/path），不依赖 obsidian，插件与命令行共用同一份。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let WRITER = (p, s) => fs.writeFileSync(p, s, 'utf8');   // 测试缝：可注入会抛错的写手，验证 W1 不留半截
function __setWriter(fn) { WRITER = fn || ((p, s) => fs.writeFileSync(p, s, 'utf8')); }

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const sha256File = (p) => sha256(fs.readFileSync(p));
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

function readJson(p) {
  if (!fs.existsSync(p)) { return { exists: false, data: null, sha256: null }; }
  const buf = fs.readFileSync(p);
  let data = null, err = null;
  try { data = JSON.parse(buf.toString('utf8').replace(/^\uFEFF/, '')); } catch (e) { err = e; }
  return { exists: true, data: data, sha256: sha256(buf), parseError: err };
}

function atomicWrite(p, text, opts) {
  const o = opts || {};
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
  const tmp = p + '.tmp-' + process.pid + '-' + Date.now();
  try {
    (o.writer || WRITER)(tmp, text);
    fs.renameSync(tmp, p);       // 同一分区上的 rename 是原子的：要么旧件，要么新件
  } catch (e) {
    try { if (fs.existsSync(tmp)) { fs.unlinkSync(tmp); } } catch (e2) {}   // 失败要留干净现场
    throw e;
  }
  return { bytes: Buffer.byteLength(text, 'utf8'), sha256: sha256(Buffer.from(text, 'utf8')), tmp: tmp };
}

function saveModel(p, data, opts) {
  const o = opts || {};
  const before = readJson(p);
  const res = { path: p, written: false, conflict: null, backup: null, backupSha256: null, sha256: null, schemaFrom: null, schemaTo: null };
  if (before.exists && o.expectedSha256 && before.sha256 !== o.expectedSha256) {
    const cp = p.replace(/\.json$/i, '') + '.conflict-' + stamp() + '.json';
    const w = atomicWrite(cp, JSON.stringify(data, null, 1) + '\n');
    res.conflict = cp; res.written = false; res.sha256 = w.sha256; res.originalSha256 = before.sha256;
    return res;
  }
  const oldV = before.exists && before.data ? Number(before.data.schemaVersion || 1) : null;
  const newV = Number((data && data.schemaVersion) || 1);
  if (before.exists && oldV !== null && newV > oldV) {
    const bak = p.replace(/\.json$/i, '') + '.backup-v' + oldV + '.json';
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.copyFileSync(p, bak);
    const bakSha = sha256File(bak);
    if (bakSha !== before.sha256) { throw new Error('W3 备份校验失败：' + bakSha.slice(0, 12) + ' != ' + String(before.sha256).slice(0, 12)); }
    res.backup = bak; res.backupSha256 = bakSha; res.schemaFrom = oldV; res.schemaTo = newV;
  }
  const w = atomicWrite(p, JSON.stringify(data, null, 1) + '\n', o);
  res.written = true; res.sha256 = w.sha256;
  return res;
}

module.exports = { readJson: readJson, atomicWrite: atomicWrite, saveModel: saveModel, sha256: sha256, sha256File: sha256File, __setWriter: __setWriter };
