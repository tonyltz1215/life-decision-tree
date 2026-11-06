/* provider-contract.js - 联动契约（骨架 v2 §11）：provider 不可用 ⇒ 拒绝态，不静默降级
 * 本轮只做契约与拒绝态判定，不发起任何网络调用、不读 Key（令 §3：不接真实外部模型）。
 * 门 gate-T7 直接 require 本模块跑用例，证据不是文档自述。
 */
'use strict';
const PROVIDERS = {
  A: {
    id: 'workbuddy-mcp',
    label: 'A · 插件 → 本地 stdio MCP → WorkBuddy',
    transport: 'stdio-jsonrpc',
    needsUser: ['已安装 WorkBuddy', 'WorkBuddy 已开启 MCP（stdio）'],
    timeoutMs: 20000,
    dataLeavesMachine: false
  },
  B: {
    id: 'deepseek-api',
    label: 'B · 插件 → DeepSeek API（用户填 key）',
    transport: 'https',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-flash',
    needsUser: ['一个用户自己的 API Key'],
    timeoutMs: 60000,
    dataLeavesMachine: true
  }
};
const DEFAULT_PROVIDER = 'A';   // 骨架 §11：WorkBuddy 优先，DeepSeek 可替（替换由用户在设置里显式操作）
const REFUSAL_CODES = {
  PROVIDER_UNAVAILABLE: {
    ui: '⛔ 未连上 WorkBuddy：本地 MCP 进程没有起来',
    fix: '确认 WorkBuddy 已安装并开启 stdio MCP，然后点「重试」；不想装就手动切到 B'
  },
  NEED_USER_KEY: { ui: '⛔ 还没有填 API Key', fix: '设置 → 人生决策树 → 填 DeepSeek API Key（只存在本机）' },
  AUTH_FAILED: { ui: '⛔ Key 无效或已过期（401）', fix: '重新生成 Key 后填入；不要用别人的 Key' },
  RATE_LIMITED: { ui: '⛔ 被限流（429）', fix: '等 1 分钟再试；连续两次同错就停报，别硬刷' },
  PROVIDER_ERROR: { ui: '⛔ 服务端错误（5xx）', fix: '稍后重试；连续两次同错请上报' },
  BAD_RESPONSE: { ui: '⛔ 返回结构不合契约（四类节点/quote/三色缺项）', fix: '重跑一次；仍失败就上报，禁止手工改库凑数' }
};

function refuse(code, providerId) {
  const c = REFUSAL_CODES[code] || { ui: '⛔ 未知拒绝态', fix: '上报' };
  return { ok: false, code: code, ui: c.ui, fix: c.fix, providerId: providerId, fallback: null, switched: false };
}

function decide(input) {
  const x = input || {};
  const providerId = x.provider || DEFAULT_PROVIDER;
  if (!PROVIDERS[providerId]) { return refuse('PROVIDER_UNAVAILABLE', providerId); }
  if (providerId === 'A' && x.available !== true) { return refuse('PROVIDER_UNAVAILABLE', providerId); }
  if (providerId === 'B' && x.hasKey !== true) { return refuse('NEED_USER_KEY', providerId); }
  const st = Number(x.status || 0);
  if (st === 401 || st === 403) { return refuse('AUTH_FAILED', providerId); }
  if (st === 429) { return refuse('RATE_LIMITED', providerId); }
  if (st >= 500) { return refuse('PROVIDER_ERROR', providerId); }
  if (x.hydrated === false) { return refuse('BAD_RESPONSE', providerId); }
  return { ok: true, code: null, providerId: providerId, transport: PROVIDERS[providerId].transport, fallback: null, switched: false };
}

module.exports = { PROVIDERS: PROVIDERS, REFUSAL_CODES: REFUSAL_CODES, DEFAULT_PROVIDER: DEFAULT_PROVIDER, decide: decide, refuse: refuse };
