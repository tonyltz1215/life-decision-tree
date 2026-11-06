/* interview.js - 访谈入库（v0.2 判据：一份访谈 → ≥15 节点且 check 8/8 PASS）
 * 15 题：八件做成的事（evidence）＋ 三句关于你的话（skill）＋ 三条现实（risk/resource）。
 * 节点全部来自用户原话（quote）；技能是 inferred 并挂 derived_from；最紧的约束标 redline。
 * 同时生成三层记忆（L1 原话 → L2 摘要 → L3 综合），保证「树」和「记忆」是同一份访谈。
 * 纯函数，不 require obsidian；插件 / 工具 / 门共用。
 */
'use strict';
const MEM = require('./memory-layers.js');

const QUESTIONS = [
  { id: 1, sec: 'A', text: '写一件你亲手做成的事：什么时候 + 你做了什么 + 结果', hint: '例：去年十月帮社团协调了个一百人的场地，还在预算内' },
  { id: 2, sec: 'A', text: '第二件做成的事', hint: '例：把部门三年的乱账在两周内理清了' },
  { id: 3, sec: 'A', text: '第三件做成的事', hint: '例：同事老是找我修电脑，说我比 IT 快' },
  { id: 4, sec: 'A', text: '第四件（小事也行，但要具体）', hint: '例：我做的周报模板，后来全组都在用' },
  { id: 5, sec: 'A', text: '第五件：一次你把别人搞不定的事摆平了', hint: '例：客户临时改需求，我通宵把方案重排了' },
  { id: 6, sec: 'A', text: '第六件：一次你主动发起、不是被安排的事', hint: '例：我自己提议做了个自动对账表，省了每周两小时' },
  { id: 7, sec: 'A', text: '第七件：一次你拿到过具体数字结果的事', hint: '例：活动报名从 40 人做到 120 人' },
  { id: 8, sec: 'A', text: '第八件：一次别人因此记住你的事', hint: '例：半年后还有人问我那个模板怎么做的' },
  { id: 9, sec: 'B', text: '别人最常找你帮什么忙？举一个具体例子', hint: '例：同事遇到表格和流程问题先找我' },
  { id: 10, sec: 'B', text: '做什么事的时候你会忘了时间？', hint: '例：整理一堆乱七八糟的资料，一坐就是三小时' },
  { id: 11, sec: 'B', text: '三年后你希望别人怎么描述你？', hint: '例：希望别人说我这人能把复杂的事讲明白' },
  { id: 12, sec: 'C', text: '现在最紧的约束是什么？写数字', hint: '例：存款只够 2 个月，房贷每月 7000' },
  { id: 13, sec: 'C', text: '最怕失去什么？', hint: '例：怕失去现在的稳定收入，我妈说你要敢辞就别回家' },
  { id: 14, sec: 'C', text: '手里能用的资源或人，具体是谁或什么？', hint: '例：我表哥在做企业服务，认识不少老板' },
  { id: 15, sec: 'C', text: '一次没做成、被人劝退的事', hint: '例：大二想做社团公众号，做了三期没人看就停了' }
];
const MIN_LEN = 4;
const SEC_NAME = { A: '八件做成的事', B: '三句关于你的的话', C: '三条现实' };

function list(x) { return Array.isArray(x) ? x : []; }
function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function short(s, n) { const t = clean(s); return t.length <= (n || 18) ? t : t.slice(0, n || 18) + '…'; }
function dateOf(s) {
  const m = clean(s).match(/(20\d\d)[-年./](\d{1,2})/);
  return m ? (m[1] + '-' + String(m[2]).padStart(2, '0')) : null;
}

function missing(answers) {
  const a = list(answers);
  const out = [];
  QUESTIONS.forEach(function (q) {
    const v = clean(a[q.id - 1]);
    if (v.length < MIN_LEN) { out.push(q.id); }
  });
  return out;
}

// 从八件做成的事里抽能力（inferred，挂 derived_from）；抽不到就不硬造
const RULES = [
  { re: /(协调|组织|带队|拉人|安排|场地|活动)/, text: '跨部门协调' },
  { re: /(整理|梳理|规范|模板|流程|清账|理清|对账)/, text: '把混乱结构化' },
  { re: /(修|装|调|技术|电脑|系统|代码|脚本)/, text: '技术排障' },
  { re: /(谈|卖|成交|客户|销售|赞助|报价)/, text: '对外谈判与成交' },
  { re: /(写|文档|报告|PPT|方案|文案)/, text: '写作与表达' },
  { re: /(教|带人|培训|讲解|分享)/, text: '教学与讲解' }
];
function deriveSkills(evNodes) {
  const hits = [];
  RULES.forEach(function (r) {
    const from = evNodes.filter(function (n) { return r.re.test(n.quote); }).map(function (n) { return n.id; });
    if (from.length) { hits.push({ text: r.text, from: from }); }
  });
  return hits.slice(0, 3);
}

function build(answers, opts) {
  const o = opts || {};
  const a = list(answers);
  const miss = missing(a);
  if (miss.length) {
    return { ok: false, error: '还差 ' + miss.length + ' 题没填：' + miss.map(function (i) { return 'Q' + i; }).join('、') + '（每题至少写 ' + MIN_LEN + ' 个字）', missing: miss };
  }
  const alias = clean(o.alias) || '我的树';
  const today = o.today || new Date().toISOString().slice(0, 10);
  const v = a.map(clean);
  const nodes = [];
  const l1 = [];
  for (let i = 1; i <= 8; i += 1) {
    nodes.push({ id: 'E-00' + i, kind: 'evidence', text: short(v[i - 1], 20), quote: v[i - 1], happened_on: dateOf(v[i - 1]), source: 'interview', epistemic: 'fact', confidence: 0.9 });
  }
  nodes.push({ id: 'S-001', kind: 'skill', text: '别人常找我：' + short(v[8], 16), quote: v[8], happened_on: dateOf(v[8]), source: 'interview', epistemic: 'inferred', confidence: 0.7, derived_from: ['E-001', 'E-002'] });
  nodes.push({ id: 'S-002', kind: 'skill', text: '忘了时间的事：' + short(v[9], 16), quote: v[9], happened_on: null, source: 'interview', epistemic: 'inferred', confidence: 0.7, derived_from: ['E-003', 'E-004'] });
  nodes.push({ id: 'S-003', kind: 'skill', text: '三年后想被描述成：' + short(v[10], 16), quote: v[10], happened_on: null, source: 'interview', epistemic: 'inferred', confidence: 0.6, derived_from: ['S-001', 'S-002'] });
  nodes.push({ id: 'R-001', kind: 'risk', text: '最紧的约束：' + short(v[11], 18), quote: v[11], happened_on: null, source: 'interview', epistemic: 'redline', confidence: 1 });
  nodes.push({ id: 'R-002', kind: 'risk', text: '最怕失去：' + short(v[12], 16), quote: v[12], happened_on: null, source: 'interview', epistemic: 'fact', confidence: 0.9 });
  nodes.push({ id: 'P-001', kind: 'resource', text: '能用的人／资源：' + short(v[13], 16), quote: v[13], happened_on: null, source: 'interview', epistemic: 'fact', confidence: 0.9 });
  nodes.push({ id: 'R-003', kind: 'risk', text: '没做成的事：' + short(v[14], 16), quote: v[14], happened_on: dateOf(v[14]), source: 'interview', epistemic: 'fact', confidence: 0.7 });
  const derived = deriveSkills(nodes.filter(function (n) { return n.kind === 'evidence'; }));
  derived.forEach(function (d, i) {
    nodes.push({ id: 'S-00' + (4 + i), kind: 'skill', text: d.text, quote: null, happened_on: null, source: 'interview', epistemic: 'inferred', confidence: 0.6, derived_from: d.from });
  });

  const branches = [
    { id: 'B-01', title: '主业保底＋副业轻试错', unlocked: true, needs: [], parent: null },
    { id: 'B-02', title: '裸辞/全职创业', unlocked: false, needs: ['存款≥6 个月', '1 次预售成交'], parent: 'B-01' },
    { id: 'B-03', title: '内部转岗做流程/效率', unlocked: true, needs: [], parent: 'B-01' }
  ];
  const locked = branches.filter(function (b) { return !b.unlocked; });
  const diagnosis = { branches: {
    'B-01': { attempts: [true], question: '当年为什么留在主业？' },
    'B-02': { attempts: [false, false], question: '你为裸辞做过哪一次真实尝试？' },
    'B-03': { attempts: [false, true], question: '上次转岗/换组为什么没成？' }
  } };
  const model = {
    status: 'ok', schemaVersion: 2,
    person: { alias: alias, interviewed_at: today },
    nodes: nodes, branches: branches, hidden_skills: [{ text: '隐藏技能：' + short(v[8], 12) + ' × ' + short(v[9], 12), derived_from: ['S-001', 'S-002'], verify_questions: ['这件事你最享受的是解决问题，还是被人需要？', '如果没人看见，你还会做吗？', '上一次做到最好时，你具体做了什么？'] }],
    refusals: locked.map(function (b) { return b.id + ' 已被财务红线锁定：先补存款与一次真实成交'; }),
    diagnosis: diagnosis
  };

  // 三层记忆：L1 十五条原话；L2 五条摘要；L3 两条综合
  let mem = MEM.blank();
  const l1Ids = [];
  v.forEach(function (ans, i) {
    const r = MEM.add(mem, 'L1', { text: short(ans, 24), quote: ans, happened_on: i < 8 ? dateOf(ans) : null, source: 'interview', created_at: today + 'T00:00:00.000Z' });
    if (r.ok) { mem = r.store; l1Ids.push(r.id); }
  });
  const l2 = [];
  const GROUPS = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9, 10], [11, 12, 14]];
  GROUPS.forEach(function (g) {
    const from = g.map(function (i) { return l1Ids[i]; }).filter(Boolean);
    if (from.length < 2) { return; }
    const r = MEM.add(mem, 'L2', { text: '关于「' + short(v[g[0]], 10) + '」这几件事的摘要', from: from, created_at: today + 'T00:00:00.000Z' });
    if (r.ok) { mem = r.store; l2.push(r.id); }
  });
  const l3 = [];
  [[0, 1], [1, 2]].forEach(function (pair) {
    const from = pair.map(function (i) { return l2[i]; }).filter(Boolean);
    if (from.length < 2) { return; }
    const r = MEM.add(mem, 'L3', { text: '系统认为你：' + short(v[pair[0] * 2], 12) + ' ＋ ' + short(v[pair[1] * 2], 12), from: from, created_at: today + 'T00:00:00.000Z' });
    if (r.ok) { mem = r.store; l3.push(r.id); }
  });

  const fact = nodes.filter(function (n) { return n.epistemic === 'fact'; }).length;
  const inf = nodes.filter(function (n) { return n.epistemic === 'inferred'; }).length;
  const red = nodes.filter(function (n) { return n.epistemic === 'redline'; }).length;
  return {
    ok: true, error: null, model: model, layers: mem,
    stats: { nodes: nodes.length, evidence: nodes.filter(function (n) { return n.kind === 'evidence'; }).length, skills: nodes.filter(function (n) { return n.kind === 'skill'; }).length, risk: nodes.filter(function (n) { return n.kind === 'risk'; }).length, resource: nodes.filter(function (n) { return n.kind === 'resource'; }).length, fact: fact, inferred: inf, redline: red, L1: l1Ids.length, L2: l2.length, L3: l3.length }
  };
}


// ===== 草稿（关视图不丢；先填 3 题可存）=====
const MIN_DRAFT = 3;
const DRAFT_SCHEMA = 'ldt-interview-draft-v1';

function draftOf(answers) {
  const a = list(answers);
  const out = [];
  for (let i = 0; i < QUESTIONS.length; i += 1) { out.push(clean(a[i])); }
  return { schema: DRAFT_SCHEMA, saved_at: new Date().toISOString(), answers: out, filled: out.filter(function (x) { return x.length >= MIN_LEN; }).length };
}

function fromDraft(obj) {
  const o = obj || {};
  if (!o || o.schema !== DRAFT_SCHEMA || !Array.isArray(o.answers)) { return { ok: false, answers: [], filled: 0 }; }
  const out = [];
  for (let i = 0; i < QUESTIONS.length; i += 1) { out.push(clean(o.answers[i])); }
  return { ok: true, answers: out, filled: out.filter(function (x) { return x.length >= MIN_LEN; }).length };
}

// 渐进式：只把「已填的题」变成节点做预览；绝不写正式模型、绝不用空答案补位
function buildDraft(answers) {
  const d = draftOf(answers);
  const v = d.answers;
  if (d.filled < MIN_DRAFT) {
    return { ok: false, error: '至少填 ' + MIN_DRAFT + ' 题才能存草稿（现在 ' + d.filled + ' 题）', filled: d.filled, missing: missing(answers) };
  }
  const nodes = [];
  for (let i = 1; i <= 8; i += 1) {
    if (v[i - 1].length < MIN_LEN) { continue; }
    nodes.push({ id: 'E-00' + i, kind: 'evidence', text: short(v[i - 1], 20), quote: v[i - 1], happened_on: dateOf(v[i - 1]), source: 'interview', epistemic: 'fact', confidence: 0.9 });
  }
  const map = { 9: 'S-001', 10: 'S-002', 11: 'S-003' };
  Object.keys(map).forEach(function (k) {
    const i = Number(k);
    if (v[i - 1].length < MIN_LEN) { return; }
    nodes.push({ id: map[k], kind: 'skill', text: short(v[i - 1], 20), quote: v[i - 1], happened_on: null, source: 'interview', epistemic: 'inferred', confidence: 0.6, derived_from: [] });
  });
  if (v[11].length >= MIN_LEN) { nodes.push({ id: 'R-001', kind: 'risk', text: short(v[11], 18), quote: v[11], happened_on: null, source: 'interview', epistemic: 'redline', confidence: 1 }); }
  if (v[12].length >= MIN_LEN) { nodes.push({ id: 'R-002', kind: 'risk', text: short(v[12], 16), quote: v[12], happened_on: null, source: 'interview', epistemic: 'fact', confidence: 0.9 }); }
  if (v[13].length >= MIN_LEN) { nodes.push({ id: 'P-001', kind: 'resource', text: short(v[13], 16), quote: v[13], happened_on: null, source: 'interview', epistemic: 'fact', confidence: 0.9 }); }
  if (v[14].length >= MIN_LEN) { nodes.push({ id: 'R-003', kind: 'risk', text: short(v[14], 16), quote: v[14], happened_on: null, source: 'interview', epistemic: 'fact', confidence: 0.7 }); }
  const stats = {
    nodes: nodes.length,
    evidence: nodes.filter(function (n) { return n.kind === 'evidence'; }).length,
    skills: nodes.filter(function (n) { return n.kind === 'skill'; }).length,
    risk: nodes.filter(function (n) { return n.kind === 'risk'; }).length,
    resource: nodes.filter(function (n) { return n.kind === 'resource'; }).length,
    filled: d.filled,
    missingCount: QUESTIONS.length - d.filled,
    enough: nodes.length >= 15 && d.filled === QUESTIONS.length
  };
  return { ok: true, draft: true, filled: d.filled, missing: missing(answers), stats: stats, model: { status: 'insufficient', draft: true, nodes: nodes, branches: [] } };
}
module.exports = { QUESTIONS: QUESTIONS, SEC_NAME: SEC_NAME, MIN_LEN: MIN_LEN, MIN_DRAFT: MIN_DRAFT, DRAFT_SCHEMA: DRAFT_SCHEMA, missing: missing, build: build, buildDraft: buildDraft, draftOf: draftOf, fromDraft: fromDraft, deriveSkills: deriveSkills, clean: clean, short: short, dateOf: dateOf };
