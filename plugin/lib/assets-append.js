/* assets-append.js - 纯函数：案例 → 3 个递进备用关卡（0→1 / 1→10 / 放大）
 * 2026-11-11：枚举只用 v2.1 允许的 验证型/生存型；金额只进 ui_copy（condition 不写金额）；
 * 第一关 open（可点亮），后两关 locked，由 markLevelDone 逐关推进；不再写 source_case（不在契约键集）。
 */
'use strict';
function clone(v) { return JSON.parse(JSON.stringify(v == null ? null : v)); }
function makeId(caseId) { return 'lv-from-' + String(caseId || '').replace(/[^a-z0-9-]/gi, '').slice(0, 24); }
function appendThreeLevels(pack, c, nowIso) {
  if (!pack || typeof pack !== 'object') { return { ok: false, error: 'NO_PACK' }; }
  if (!c || !c.case_id) { return { ok: false, error: 'NO_CASE' }; }
  var out = clone(pack);
  out.levels = Array.isArray(out.levels) ? out.levels : [];
  var base = 'lv-case-' + String(c.case_id || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
  var one = String(c.one_liner || '').slice(0, 60);
  var rev = (c.revenue && c.revenue.amount_range) || '';
  var defs = [
    { key: '-1', title: '0→1 · 先卖一次', cond: '7 天内把「' + (one || c.case_name) + '」做成一次可验证的最小交付，并拿到 1 个真实反馈', gate: '验证型', status: 'open', amount: '先卖一次，金额自定' },
    { key: '-2', title: '1→10 · 收到第一笔钱', cond: '30 天内收到第一笔真实收款，并留下到账凭证', gate: '验证型', status: 'locked', amount: rev ? ('参考区间：' + rev) : '自定' },
    { key: '-3', title: '放大 · 跑通同类 3 单', cond: '90 天内同类交付做到 3 单，且收入有账可查', gate: '生存型', status: 'locked', amount: rev ? ('参考区间：' + rev) : '3 单，收入有账' }
  ];
  var added = [];
  defs.forEach(function (d) {
    var id = base + d.key;
    if (out.levels.some(function (l) { return l && l.id === id; })) { return; }
    out.levels.push({
      id: id, title: d.title, condition: d.cond, gate_type: d.gate, kind: 'backup', status: d.status,
      ui_copy: { amount_text: d.amount, helper: '从案例透视转入（' + (c.case_name || '') + '）' },
      detail: { goal: d.title, why: '照抄案例的递进路径：先交付、再收钱、再放大', evidence_required: [d.key === '-1' ? '一次真实交付的记录（截图/链接/客户回话）' : (d.key === '-2' ? '到账凭证 + 一条客户反馈' : '3 单的交付记录与收入明细')], next_action: d.key === '-1' ? '今天找 3 个熟人报价' : (d.key === '-2' ? '把最小交付挂到可收款的地方' : '把前两单的流程写成模板'), related_skills: [] }
    });
    added.push(id);
  });
  if (nowIso) { out.generated_at = nowIso; }
  return { ok: true, pack: out, added: added.length, ids: added };
}
module.exports = { appendThreeLevels: appendThreeLevels, makeId: makeId };
