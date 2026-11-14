/* ai-call.js - 直连 AI 的请求计划（纯函数，不联网、不读文件）
 * 2026-11-11：案例→关卡支持「直连 API」；无 Key 必须 fail-closed，不许静默降级。
 */
'use strict';
const PB = require('./provider-b.js');
const URL = 'https://api.deepseek.com/chat/completions';
function plan(key, prompt, opts) {
  const k = String(key == null ? '' : key).trim();
  if (!k) { return { ok: false, code: 'NEED_USER_KEY', message: '还没有填 DeepSeek Key：设置 → 人生决策树 → AI 增强 Key（或用复制方式）' }; }
  const p = String(prompt == null ? '' : prompt);
  if (p.trim().length < 50) { return { ok: false, code: 'PROMPT_TOO_SHORT', message: 'Prompt 太短，拒绝发送' }; }
  const body = PB.buildBody(p, { maxTokens: (opts && opts.maxTokens) || 8192, temperature: (opts && typeof opts.temperature === 'number') ? opts.temperature : 0.2 });
  body.thinking = { type: 'disabled' }; // 2026-11-11 实测：不关思考会吃掉 ~9.5k 字符预算，正文被截断
  return { ok: true, url: URL, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + k }, body: body };
}
module.exports = { URL: URL, plan: plan };
