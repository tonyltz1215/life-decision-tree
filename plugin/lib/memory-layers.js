/* memory-layers.js - 三层记忆（骨架 v2 §12）：L1 原始记录 -> L2 摘要 -> L3 综合
 * 纯函数，不 require obsidian；插件 / 工具 / 门脚本共用同一份。
 * 铁律：
 *  ① L1 只软删（deleted=true），绝不物理删；
 *  ② 删 L1 后依赖它的 L2/L3 标 lostSource，界面显示「已失去来源」，不静默删结论；
 *  ③ L1 可改错字但保留 original_hash（首次写入时的原文哈希），改完仍能对回原话；
 *  ④ 每层都能一键展开下一层；每行可追溯来源链（L3 -> L2 -> L1）。
 */
'use strict';
const crypto = require('crypto');

const LAYERS = ['L1', 'L2', 'L3'];
const LABEL = { L1: '原始记录', L2: '摘要', L3: '综合' };
const LOST = '已失去来源';
const EMPTY = {
  L1: '还没有原始记录：先在访谈里记下用户原话（逐字）',
  L2: '还没有摘要：每条摘要要指向 ≥2 条原始记录',
  L3: '还没有综合：每条综合要指向 ≥2 条摘要'
};

function blank() { return { L1: [], L2: [], L3: [] }; }
function list(x) { return Array.isArray(x) ? x : []; }
function sha1(s) { return crypto.createHash('sha1').update(String(s == null ? '' : s), 'utf8').digest('hex'); }
function text(v) { return String(v == null ? '' : v).trim(); }

function nextId(rows, layer) {
  let max = 0;
  list(rows).forEach(function (r) {
    const m = String((r && r.id) || '').match(/^L[123]-(\d+)$/);
    if (m) { max = Math.max(max, parseInt(m[1], 10)); }
  });
  return layer + '-' + String(max + 1).padStart(3, '0');
}

function normalize(store) {
  const s = store || {};
  const out = blank();
  LAYERS.forEach(function (L) {
    list(s[L]).forEach(function (r) {
      const o = Object.assign({}, r || {});
      o.id = text(o.id) || nextId(out[L], L);
      o.text = text(o.text);
      o.from = list(o.from).map(String);
      o.deleted = o.deleted === true;
      o.lostSource = o.lostSource === true;
      o.lostFrom = list(o.lostFrom).map(String);
      o.edited = o.edited === true;
      out[L].push(o);
    });
  });
  return recompute(out);
}

// 依赖重算：L2 失去 L1、L3 失去 L2（传递）都标 lostSource；恢复后自动清掉
function recompute(store) {
  const s = store || blank();
  const alive = {};
  LAYERS.forEach(function (L) { list(s[L]).forEach(function (r) { alive[r.id] = r.deleted !== true; }); });
  list(s.L2).forEach(function (r) {
    r.lostFrom = r.from.filter(function (id) { return alive[id] !== true; });
    r.lostSource = r.lostFrom.length > 0;
  });
  const byL2 = {};
  list(s.L2).forEach(function (r) { byL2[r.id] = r; });
  list(s.L3).forEach(function (r) {
    r.lostFrom = r.from.filter(function (id) {
      const p = byL2[id];
      return !p || p.deleted === true || p.lostSource === true;
    });
    r.lostSource = r.lostFrom.length > 0;
  });
  return s;
}

function add(store, layer, item) {
  const s = normalize(store);
  const it = item || {};
  if (LAYERS.indexOf(layer) < 0) { return { ok: false, error: '没有这一层：' + layer }; }
  if (!text(it.text)) { return { ok: false, error: '内容不能为空' }; }
  if (layer === 'L1') {
    const row = { id: nextId(s.L1, 'L1'), text: text(it.text), quote: text(it.quote) || text(it.text),
      happened_on: it.happened_on || null, source: it.source || 'interview', deleted: false,
      original_hash: sha1(text(it.text)), edited: false, created_at: it.created_at || new Date().toISOString() };
    s.L1.push(row);
    return { ok: true, store: recompute(s), id: row.id, layer: layer };
  }
  const raw = list(it.from).map(String).filter(Boolean);
  const from = raw.filter(function (x, i) { return raw.indexOf(x) === i; });
  const parentLayer = layer === 'L2' ? 'L1' : 'L2';
  if (from.length < 2) { return { ok: false, error: layer + ' 至少要指向 2 条不同的 ' + parentLayer + '（现在 ' + from.length + ' 条）' }; }
  const pool = {};
  list(s[parentLayer]).forEach(function (r) { pool[r.id] = r; });
  for (let i = 0; i < from.length; i += 1) {
    const p = pool[from[i]];
    if (!p) { return { ok: false, error: '来源不存在：' + from[i] }; }
    if (p.deleted === true) { return { ok: false, error: '来源已删除：' + from[i] }; }
    if (p.lostSource === true) { return { ok: false, error: '来源已失去来源：' + from[i] }; }
  }
  const row = { id: nextId(s[layer], layer), text: text(it.text), from: from, deleted: false,
    lostSource: false, lostFrom: [], edited: false, created_at: it.created_at || new Date().toISOString() };
  s[layer].push(row);
  return { ok: true, store: recompute(s), id: row.id, layer: layer };
}

function find(store, layer, id) {
  return list((store || {})[layer]).filter(function (r) { return r.id === id; })[0] || null;
}

function edit(store, layer, id, newText) {
  const s = normalize(store);
  const row = find(s, layer, id);
  if (!row) { return { ok: false, error: '找不到：' + id }; }
  if (!text(newText)) { return { ok: false, error: '内容不能为空' }; }
  if (layer === 'L1' && !row.original_hash) { row.original_hash = sha1(row.text); }
  row.text = text(newText);
  row.edited = true;
  row.edited_at = new Date().toISOString();
  return { ok: true, store: recompute(s), row: row };
}

function removeL1(store, id) {
  const s = normalize(store);
  const row = find(s, 'L1', id);
  if (!row) { return { ok: false, error: '找不到：' + id }; }
  row.deleted = true;
  row.deleted_at = new Date().toISOString();
  const before = {};
  list(s.L2).concat(list(s.L3)).forEach(function (r) { if (r.lostSource) { before[r.id] = true; } });
  recompute(s);
  const affected = [];
  list(s.L2).concat(list(s.L3)).forEach(function (r) { if (r.lostSource && !before[r.id]) { affected.push(r.id); } });
  return { ok: true, store: s, affected: affected };
}

function restoreL1(store, id) {
  const s = normalize(store);
  const row = find(s, 'L1', id);
  if (!row) { return { ok: false, error: '找不到：' + id }; }
  row.deleted = false;
  delete row.deleted_at;
  return { ok: true, store: recompute(s) };
}

function children(store, layer, id) {
  const next = layer === 'L1' ? 'L2' : (layer === 'L2' ? 'L3' : null);
  if (!next) { return []; }
  return list((store || {})[next]).filter(function (r) { return list(r.from).indexOf(id) >= 0; });
}

// 追溯：从任意一条往上走到 L1，返回链路（含自己）
function trace(store, id) {
  const s = normalize(store);
  const chain = [id];
  let cur = id;
  let guard = 0;
  while (guard < 8) {
    guard += 1;
    let row = find(s, 'L3', cur) || find(s, 'L2', cur);
    if (!row) { break; }
    const up = list(row.from)[0];
    if (!up) { break; }
    chain.push(up);
    cur = up;
  }
  return chain.reverse();
}

function check(store, opts) {
  const o = opts || {};
  const s = o.recompute === false ? JSON.parse(JSON.stringify(store || blank())) : normalize(store);
  const errors = [];
  const ids = {};
  LAYERS.forEach(function (L) {
    list(s[L]).forEach(function (r) {
      if (ids[r.id]) { errors.push('重复 id：' + r.id); }
      ids[r.id] = L;
    });
  });
  list(s.L1).forEach(function (r) {
    if (!r.quote) { errors.push('L1 ' + r.id + ' 缺原话（quote）'); }
  });
  list(s.L2).forEach(function (r) {
    if (r.from.length < 2) { errors.push('L2 ' + r.id + ' 只指向 ' + r.from.length + ' 条 L1（要 ≥2）'); }
    r.from.forEach(function (f) { if (ids[f] !== 'L1') { errors.push('L2 ' + r.id + ' 的来源不是 L1：' + f); } });
  });
  list(s.L3).forEach(function (r) {
    if (r.from.length < 2) { errors.push('L3 ' + r.id + ' 只指向 ' + r.from.length + ' 条 L2（要 ≥2）'); }
    r.from.forEach(function (f) { if (ids[f] !== 'L2') { errors.push('L3 ' + r.id + ' 的来源不是 L2：' + f); } });
  });
  list(s.L2).forEach(function (r) {
    const dead = r.from.filter(function (f) { const p = find(s, 'L1', f); return !p || p.deleted === true; });
    if (dead.length && r.lostSource !== true) { errors.push('L2 ' + r.id + ' 的来源已删但没标已失去来源'); }
  });
  return { ok: errors.length === 0, errors: errors };
}

function stats(store) {
  const s = normalize(store);
  const out = { total: 0, lost: 0, layers: {} };
  LAYERS.forEach(function (L) {
    const rows = list(s[L]);
    const alive = rows.filter(function (r) { return r.deleted !== true; }).length;
    const lost = rows.filter(function (r) { return r.lostSource === true; }).length;
    out.layers[L] = { n: rows.length, alive: alive, lost: lost };
    out.total += alive;
    out.lost += lost;
  });
  return out;
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
  });
}

function rowHtml(store, layer, r, ui) {
  const u = ui || {};
  const kids = children(store, layer, r.id);
  const open = list(u.expand).indexOf(r.id) >= 0;
  const editing = u.editing === r.id;
  const lost = r.lostSource === true;
  const p = [];
  p.push('<div class="ldt-mem-row' + (lost ? ' is-lost' : '') + '" data-mem="' + esc(r.id) + '">');
  p.push('<div class="ldt-mem-main">');
  p.push('<div class="ldt-mem-id">' + esc(r.id) + (r.edited ? '<i class="ldt-mem-edited">已编辑</i>' : '') + (lost ? '<i class="ldt-mem-lost">' + LOST + '</i>' : '') + '</div>');
  if (editing) {
    p.push('<textarea class="ldt-mem-ta" data-mem-ta="' + esc(r.id) + '">' + esc(r.text) + '</textarea>');
    p.push('<div class="ldt-mem-ops"><span class="ldt-op primary" data-act="mem-save" data-layer="' + layer + '" data-id="' + esc(r.id) + '">保存</span>');
    p.push('<span class="ldt-op" data-act="mem-cancel">取消</span></div>');
  } else {
    p.push('<div class="ldt-mem-t">' + esc(r.text) + '</div>');
    if (layer === 'L1' && r.quote && r.quote !== r.text) { p.push('<div class="ldt-mem-q">原话：「' + esc(r.quote) + '」</div>'); }
    if (layer !== 'L1') { p.push('<div class="ldt-mem-m">来源：' + r.from.map(esc).join('、') + '</div>'); }
    if (layer === 'L1') { p.push('<div class="ldt-mem-m">' + esc(r.happened_on || '未记日期') + ' · ' + esc(r.source || 'interview') + (r.original_hash ? ' · 原文哈希 ' + esc(String(r.original_hash).slice(0, 8)) : '') + '</div>'); }
    if (lost) { p.push('<div class="ldt-mem-lostinfo">已失去来源：' + r.lostFrom.map(esc).join('、') + '（下层被删，结论保留但不可再引用）</div>'); }
    p.push('<div class="ldt-mem-ops">');
    if (kids.length) { p.push('<span class="ldt-op" data-exp="' + esc(r.id) + '">' + (open ? '收起' : '展开') + ' ' + kids.length + ' 条上层</span>'); }
    p.push('<span class="ldt-op" data-edit="' + esc(r.id) + '" data-layer="' + layer + '">编辑</span>');
    if (layer === 'L1') {
      p.push(r.deleted === true ? '<span class="ldt-op" data-restore="' + esc(r.id) + '">恢复</span>' : '<span class="ldt-op danger" data-del="' + esc(r.id) + '">删除</span>');
    }
    p.push('<span class="ldt-op quiet">追溯 ' + esc(trace(store, r.id).join(' → ')) + '</span>');
    p.push('</div>');
  }
  p.push('</div>');
  if (open && kids.length) {
    p.push('<div class="ldt-mem-kids">' + kids.map(function (k) { return rowHtml(store, layer === 'L1' ? 'L2' : 'L3', k, u); }).join('') + '</div>');
  }
  p.push('</div>');
  return p.join('');
}

function renderHtml(store, ui) {
  const s = normalize(store);
  const u = ui || {};
  const st = stats(s);
  const p = [];
  p.push('<div class="ldt-mem">');
  p.push('<div class="ldt-mem-head"><b>三层记忆</b> · L1 原始 ' + st.layers.L1.alive + ' · L2 摘要 ' + st.layers.L2.n + ' · L3 综合 ' + st.layers.L3.n + ' · 已失去来源 ' + st.lost + '</div>');
  p.push('<div class="ldt-mem-note">L1 只软删（可恢复）；删 L1 后依赖它的 L2／L3 显示「' + LOST + '」，结论不静默消失。每行可展开上层、可编辑、可追溯来源链。</div>');
  LAYERS.forEach(function (L) {
    const rows = list(s[L]);
    p.push('<section class="ldt-mem-layer" data-layer="' + L + '">');
    p.push('<h3 class="ldt-mem-h">' + L + ' · ' + LABEL[L] + '<i>' + rows.length + ' 条</i></h3>');
    p.push(rows.length ? rows.map(function (r) { return rowHtml(s, L, r, u); }).join('') : '<div class="ldt-mem-empty">' + EMPTY[L] + '</div>');
    p.push('</section>');
  });
  p.push('</div>');
  return p.join('');
}

module.exports = {
  LAYERS: LAYERS, LABEL: LABEL, LOST: LOST, EMPTY: EMPTY,
  blank: blank, normalize: normalize, recompute: recompute, add: add, edit: edit,
  removeL1: removeL1, restoreL1: restoreL1, children: children, trace: trace,
  check: check, stats: stats, renderHtml: renderHtml, sha1: sha1, nextId: nextId, find: find
};
