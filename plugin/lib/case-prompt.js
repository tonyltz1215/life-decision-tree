/* case-prompt.js - 案例卡 → 外部 AI 关卡 Prompt（纯函数，无 IO）
 * 2026-11-11：老板拍板的变现闭环——看别人的案例 → 生成 Prompt → 外部 AI 出关卡 JSON → 导入插件。
 * 输出契约与 verify.js PACK_RULES 对齐：level.id ^lv-[a-z0-9-]{2,40}$，gate_type∈{验证型,生存型}，status∈{locked,open,done}，kind∈{main,backup,hidden}。
 */
'use strict';

function skillsBrief(pack) {
  const sk = (pack && Array.isArray(pack.skills)) ? pack.skills : [];
  return sk.map(function (s) { return { id: s.id, name: s.name, domain: s.domain, level: s.level, status: s.status }; });
}

function buildPrompt(c, pack) {
  const cc = c || {};
  const skills = skillsBrief(pack);
  const ids = skills.map(function (s) { return s.id; });
  const L = [];
  L.push('我是「人生决策树」的用户。我通过外部 AI 拆解了案例卡【' + (cc.case_name || cc.case_id) + '】，现在要把这张卡变成我自己的关卡。');
  L.push('');
  L.push('【案例】' + (cc.case_name || '') + '（' + (cc.archetype || '未标注') + '）');
  if (cc.one_liner) { L.push('一句话：' + cc.one_liner); }
  L.push('核心因子 core_factor：' + JSON.stringify(cc.core_factor || {}, null, 0));
  L.push('收入模型 revenue：' + JSON.stringify(cc.revenue || {}, null, 0));
  L.push('成本 cost：' + JSON.stringify(cc.cost || {}, null, 0));
  if (Array.isArray(cc.pitfalls) && cc.pitfalls.length) { L.push('已知的坑：' + cc.pitfalls.join('；')); }
  L.push('');
  L.push('【我现在的资产库 skills】');
  L.push(JSON.stringify(skills, null, 0));
  L.push('（可引用 id：' + (ids.join('、') || '无') + '）');
  L.push('');
  L.push('请以此案例为目标，对比我目前的差距，为我生成 3 个具体的「关卡挑战」。');
  L.push('要求：');
  L.push('1. 3 个关卡按难度递进：第 1 关 7 天内可做，第 3 关 30–90 天可做；');
  L.push('2. 每关必须写清：所需调用技能、通关判据（可验证的结果，如「赚到第一块钱」）、预计时间（eta_days）；');
  L.push('3. 通关判据禁止写「提升能力」「了解行业」这类空话，必须是金额/数量/交付物；');
  L.push('4. related_skills 只能引用上面出现过的 sk- 开头 id，不要新造；');
  L.push('5. 只输出 JSON，不要 Markdown 代码块、不要解释。');
  L.push('6. 顶层再加 "scorecard"：{ "new_events": 数字, "new_tags": ["标签"], "skill_upgrades": [{"id":"sk-…","level":数字}], "new_strategies": ["路线"] }，按本次实际增量填；没有就填 0 / 空数组。');
  L.push('');
  L.push('输出格式：');
  L.push('{');
  L.push('  "skills": [],');
  L.push('  "levels": [');
  L.push('    { "id": "lv-<小写英文与短横>", "title": "≤20 字", "condition": "通关判据", "gate_type": "验证型", "kind": "backup", "status": "open", "eta_days": 7,');
  L.push('      "ui_copy": { "amount_text": "一句话目标", "helper": "为什么这关值得做" },');
  L.push('      "evidence_refs": [], "detail": { "goal": "", "why": "", "evidence_required": [""], "next_action": "", "related_skills": ["sk-…"] } }');
  L.push('  ]');
  L.push('}');
  return L.join('\n');
}

const LEVEL_ENUM = { gate_type: ['验证型', '生存型'], status: ['locked', 'open', 'done'], kind: ['main', 'backup', 'hidden'] };
const RE_LEVEL = /^lv-[a-z0-9-]{2,40}$/;

function parseLevels(text) {
  let t = String(text == null ? '' : text).trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const i = t.indexOf('{'); const j = t.lastIndexOf('}');
  if (i < 0) { return { ok: false, error: '找不到 JSON 对象' }; }
  if (j <= i) { return { ok: false, error: '回包被截断（max_tokens 不足或网络中断）' }; }
  let o = null;
  try { o = JSON.parse(t.slice(i, j + 1)); } catch (e) {
    const raw = String(t.slice(i));
    const truncated = !/}\s*$/.test(raw);
    return { ok: false, error: (truncated ? '回包被截断（max_tokens 不足或网络中断）' : 'JSON 解析失败：' + ((e && e.message) || e)) };
  }
  const levels = Array.isArray(o.levels) ? o.levels : null;
  if (!levels) { return { ok: false, error: '缺 levels 数组' }; }
  if (levels.length !== 3) { return { ok: false, error: '关卡数应为 3，实为 ' + levels.length }; }
  const seen = {};
  for (let n = 0; n < levels.length; n += 1) {
    const l = levels[n] || {};
    if (!RE_LEVEL.test(String(l.id || ''))) { return { ok: false, error: '关卡 id 不合规：' + l.id }; }
    if (seen[l.id]) { return { ok: false, error: '关卡 id 重复：' + l.id }; }
    seen[l.id] = 1;
    const miss = ['id', 'title', 'condition', 'gate_type', 'status', 'kind'].filter(function (k) { return !l[k]; });
    if (miss.length) { return { ok: false, error: '关卡缺字段 ' + miss.join(',') + '：' + l.id }; }
    const bad = Object.keys(LEVEL_ENUM).filter(function (k) { return LEVEL_ENUM[k].indexOf(l[k]) < 0; });
    if (bad.length) { return { ok: false, error: bad.join('/') + ' 越界：' + l.id }; }
  }
  return { ok: true, pack: { skills: Array.isArray(o.skills) ? o.skills : [], levels: levels } };
}

// 外部 AI 只回传 {skills:[], levels:[...]}：空 skills 表示「不新增技能」，应继承用户当前资产库，
// 否则七码校验会把 related_skills 全判成「本包未收录」（2026-11-11 实测踩到）。
function preparePatch(prev, patch) {
  const p = (prev && typeof prev === 'object') ? prev : {};
  const c = Object.assign({}, patch || {});
  ['schema', 'mode', 'domains', 'generated_at', 'summary'].forEach(function (k) { if (!(k in c) && (k in p)) { c[k] = p[k]; } });
  const okSkill = function (s) { return s && typeof s === 'object' && s.id && s.name && Array.isArray(s.domain) && s.domain.length && typeof s.level === 'number' && s.status; };
  const kept = Array.isArray(c.skills) ? c.skills.filter(okSkill) : [];
  if (!kept.length) { c.skills = Array.isArray(p.skills) ? p.skills : []; } else { c.skills = kept; }
  return c;
}

module.exports = { buildPrompt: buildPrompt, parseLevels: parseLevels, skillsBrief: skillsBrief, preparePatch: preparePatch };
