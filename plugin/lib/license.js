/* license.js - 离线兑换码（MVP）：SB- + 36 hex = 12 hex 授权号 + 24 hex HMAC
 * 说明：MVP 用对称 HMAC（密钥内置），能挡随手改码，挡不住逆向；正式版再换非对称签名。
 */
'use strict';
const crypto = require('crypto');
const SECRET = 'LDT-MVP-2026-offline-license-v1';
const PREFIX = 'SB-';

function norm(code) {
  let s = String(code || '').toUpperCase().trim();
  if (s.indexOf('SB-') === 0) { s = s.slice(3); }
  else if (s.indexOf('SB') === 0) { s = s.slice(2); }
  return s.replace(/[^0-9A-F]/g, '');
}
function idOf(code) { return norm(code).slice(0, 12); }
function sigOf(code) { return norm(code).slice(12, 36); }
function sign(idHex) {
  return crypto.createHmac('sha256', SECRET).update('LDT|' + String(idHex).toUpperCase()).digest('hex').slice(0, 24).toUpperCase();
}
function make(idHex) {
  const id = String(idHex || crypto.randomBytes(6).toString('hex')).toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 12).padEnd(12, '0');
  const full = id + sign(id);
  return PREFIX + full.match(/.{6}/g).join('-');
}
function verify(code) {
  const raw = norm(code);
  if (raw.length !== 36) { return { ok: false, error: 'BAD_LENGTH' }; }
  const id = raw.slice(0, 12);
  const sig = raw.slice(12);
  if (!/^[0-9A-F]{12}$/.test(id) || !/^[0-9A-F]{24}$/.test(sig)) { return { ok: false, error: 'BAD_FORMAT' }; }
  const want = sign(id);
  const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want));
  return ok ? { ok: true, id: id, tier: 'standard' } : { ok: false, error: 'BAD_SIGNATURE' };
}
module.exports = { PREFIX: PREFIX, normalize: function (c) { return norm(c); }, make: make, verify: verify, sign: sign, idOf: idOf };
