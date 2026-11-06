/* provider-b.js - DeepSeek(provider B) 纯函数：请求体 + 响应分类（不联网、不读 Key） */
'use strict';
const MODEL = 'deepseek-flash';
function buildBody(prompt) {
  return { model: MODEL, messages: [{ role: 'user', content: String(prompt || '只回复两个字：连接成功') }], max_tokens: 64, temperature: 0 };
}
function classify(status, body) {
  const s = Number(status || 0);
  let json = null;
  try { json = JSON.parse(body); } catch (e) { json = null; }
  if (s === 401 || s === 403) { return { ok: false, code: 'AUTH_FAILED' }; }
  if (s === 429) { return { ok: false, code: 'RATE_LIMITED' }; }
  if (s >= 500) { return { ok: false, code: 'PROVIDER_ERROR' }; }
  if (s !== 200) { return { ok: false, code: 'PROVIDER_ERROR', detail: String(s) }; }
  const reply = json && json.choices && json.choices[0] && json.choices[0].message ? json.choices[0].message.content : '';
  if (!reply) { return { ok: false, code: 'BAD_RESPONSE' }; }
  return { ok: true, code: null, reply: reply, model: (json && json.model) || MODEL };
}
module.exports = { MODEL: MODEL, buildBody: buildBody, classify: classify };
