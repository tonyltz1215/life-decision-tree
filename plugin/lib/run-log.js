/* run-log.js — 合并留痕（W3）：append-only、八字段白名单、hash 可复算
 * 纯函数：无 IO、无时钟、不改入参。
 * 口径：契约 v2.2 §2 ＋ NEG-W3-FINAL.md；hash 复用 W1 packH16（去 runs 段规范化 JSON 前 16 位）。
 */
'use strict';
var VF = require('./verify.js');
var FIELDS = ['run_id', 'at', 'prompt_version', 'model', 'input_hash', 'output_hash', 'verify_result', 'merged'];
function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function packH16(pack) { return VF.packH16(pack); }

// appendRun(pack, meta) -> { ok, pack, row } | { ok:false, error }
// pack＝合并后资产包；meta 必带 run_id/at/prompt_version/model/input_hash
function appendRun(pack, meta) {
  if (!pack || typeof pack !== 'object') { return { ok: false, error: 'NEED_PACK' }; }
  if (!meta || typeof meta !== 'object') { return { ok: false, error: 'NEED_META' }; }
  var missing = ['run_id', 'at', 'prompt_version', 'model', 'input_hash'].filter(function (k) { return typeof meta[k] !== 'string' || !meta[k]; });
  if (missing.length) { return { ok: false, error: 'META_MISSING:' + missing.join(',') }; }
  var runs = Array.isArray(pack.runs) ? pack.runs : [];
  for (var i = 0; i < runs.length; i += 1) {
    if (runs[i] && runs[i].run_id === meta.run_id) { return { ok: false, error: 'RUN_ID_DUP' }; }
  }
  // 链式：新行 input_hash 必须等于上一行 output_hash（首行由 meta 的基准承担）
  if (runs.length) {
    var tail = runs[runs.length - 1];
    if (tail && typeof tail.output_hash === 'string' && meta.input_hash !== tail.output_hash) {
      return { ok: false, error: 'CHAIN_MISMATCH', want: tail.output_hash, got: meta.input_hash };
    }
  }
  var row = {
    run_id: meta.run_id,
    at: meta.at,
    prompt_version: meta.prompt_version,
    model: meta.model,
    input_hash: meta.input_hash,
    output_hash: packH16(pack),
    verify_result: { pass: true, codes: [] },
    merged: true
  };
  var out = clone(pack);
  out.runs = (Array.isArray(pack.runs) ? clone(pack.runs) : []).concat([row]);
  return { ok: true, pack: out, row: row };
}

// 链式自检：每行 input_hash 应等于上一行 output_hash（首行对基准）
function chainOk(pack, baseHash) {
  var runs = Array.isArray(pack && pack.runs) ? pack.runs : [];
  var prev = baseHash;
  for (var i = 0; i < runs.length; i += 1) {
    if (prev !== undefined && runs[i].input_hash !== prev) { return { ok: false, at: i, want: prev, got: runs[i].input_hash }; }
    prev = runs[i].output_hash;
  }
  return { ok: true, rows: runs.length, tail: prev, firstUnchecked: baseHash === undefined && runs.length > 0 };
}

module.exports = { FIELDS: FIELDS, appendRun: appendRun, chainOk: chainOk, packH16: packH16 };
