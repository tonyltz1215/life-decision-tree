/* migrate.js — 旧树 → 3–5 张 unverified 卡（W5）
 * 纯函数：不改入参、无 IO、不取时钟（generated_at 由 opts 传入）。
 * 口径：契约 v2.2 §1/§4 ＋ schema v2.1 ＋ NEG-W5-FINAL.md
 */
'use strict';
var DOMAINS8 = ['获客/流量', '产品/交付', '销售/转化', '内容/表达', '技术/工具', '管理/统筹', '分析/洞察', '风控/财务'];
var PACK_KEYS = ['schema', 'generated_at', 'mode', 'summary', 'domains', 'skills', 'levels', 'routes', 'diff', 'runs', 'archives', 'generated_by'];
var RE_AMOUNT = /\d+\s*(元|万|块|人民币)/;
var RULES = [
  { key: 'coord', name: '协调组织', domain: ['管理/统筹', '产品/交付'], type: '能力', re: /协调|组织|场地|活动|安排|统筹/ },
  { key: 'analyze', name: '梳理分析', domain: ['分析/洞察', '产品/交付'], type: '能力', re: /理清|乱账|梳理|分析|盘点|对账/ },
  { key: 'tech', name: '技术动手', domain: ['技术/工具'], type: '资源', re: /修电脑|IT|工具|代码|脚本|系统/ },
  { key: 'content', name: '表达输出', domain: ['内容/表达'], type: '能力', re: /写|模板|文章|汇报|讲解|分享/ },
  { key: 'risk', name: '风险约束', domain: ['风控/财务'], type: '风险', re: /存款|房贷|反对|放弃|不确定|风险/ },
  { key: 'sell', name: '成交转化', domain: ['销售/转化', '获客/流量'], type: '证据', re: /卖|赞助|成交|客户|订单|拉人/ }
];
function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
function txt(n) { return String((n && (n.quote || n.text)) || '').trim(); }

function migrateLegacy(model, opts) {
  var o = opts || {};
  if (typeof o.generated_at !== 'string' || !o.generated_at) { return { ok: false, error: 'NO_GENERATED_AT' }; }
  var rawNodes = model && Array.isArray(model.nodes) ? model.nodes : [];
  var nodes = rawNodes.filter(function (n) { return txt(n) !== ''; });
  if (!nodes.length) { return { ok: false, error: 'NO_NODES' }; }
  var warnings = [];
  var cards = [];
  RULES.forEach(function (r) {
    if (cards.length >= 5) { return; }
    var hit = nodes.filter(function (n) { return r.re.test(txt(n)); });
    if (!hit.length) { return; }
    var evidence = hit.map(txt).filter(Boolean).slice(0, 3);
    cards.push({
      id: 'sk-mig-' + r.key,
      name: r.name,
      domain: r.domain.slice(),
      type: r.type,
      evidence: evidence,
      level: 0,
      upgrade_condition: '补一条带日期的具体证据（做了什么、结果如何）即可升级',
      status: 'unverified',
      source: 'migrated-v1'
    });
  });
  if (!cards.length) { return { ok: false, error: 'NO_RULE_HIT' }; }
  var underfilled = cards.length < 3;
  var domains = [];
  cards.forEach(function (c) { c.domain.forEach(function (d) { if (domains.indexOf(d) < 0) { domains.push(d); } }); });
  var levels = [
    { id: 'lv-pmf', title: '0→1 验证', condition: '获得第一笔真实收入', gate_type: '验证型', kind: 'main',
      ui_copy: { amount_text: '金额由 AI 按你的处境生成', helper: '先做一次，再决定要不要做' }, status: 'open',
      evidence_refs: cards.slice(0, 2).map(function (c) { return c.id; }) },
    { id: 'lv-stable', title: '稳定获客', condition: '连续 4 周每周至少 1 单', gate_type: '生存型', kind: 'main',
      ui_copy: { amount_text: '门槛金额由 AI 按你的生活成本生成', helper: '看稳定性，不看单笔大小' }, status: 'locked',
      evidence_refs: [(cards[1] || cards[0]).id] }
  ];
  levels.forEach(function (lv) {
    ['condition', 'unlock_condition'].forEach(function (f) {
      if (typeof lv[f] === 'string' && RE_AMOUNT.test(lv[f])) { warnings.push({ code: 'W_AMOUNT_IN_CONDITION', where: 'levels.' + lv.id + '.' + f }); }
    });
  });
  cards.forEach(function (c) {
    (c.evidence || []).forEach(function (e, i) {
      if (RE_AMOUNT.test(String(e))) { warnings.push({ code: 'W_AMOUNT_IN_EVIDENCE', where: 'skills.' + c.id + '.evidence[' + i + ']' }); }
    });
  });
  var pack = {
    schema: 'ldt-assets-v2',
    generated_at: o.generated_at,
    mode: 'migrated',
    summary: '从旧版决策树迁移：' + cards.length + ' 张卡，全部待核实（unverified）。跑一次「增量指令」即可洗白。' + (underfilled ? '（本次命中不足 3 类，如实出 ' + cards.length + ' 张，未凑数）' : ''),
    domains: domains,
    skills: cards,
    levels: levels
  };
  return { ok: true, pack: pack, warnings: warnings, underfilled: underfilled };
}

module.exports = { DOMAINS8: DOMAINS8, PACK_KEYS: PACK_KEYS, RULES: RULES, RE_AMOUNT: RE_AMOUNT, migrateLegacy: migrateLegacy };
