/* page-ai.js - AI 次级页面：思想会客厅（多角色圆桌）＋人生智囊团（常驻内阁）
 * 纯字符串渲染，不 require obsidian；AI 调用由 main.js 负责，本文件只管结构。
 * 调研来源：①本仓《第二大脑-逆向工程》记录的「思想会客厅」入口；②群策 App「AI 专家组／团队协作／成长看板」；③SkillHub「个人内阁系统·人生决策智囊团」。
 */
'use strict';
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
const TABS = [['salon', '思想会客厅'], ['cabinet', '人生智囊团']];
const SALON_ROLES = [
  { id: 'realist', name: '现实主义者', ask: '只看你手上的证据与时间，这件事现在能不能做？' },
  { id: 'risk', name: '风险官', ask: '最坏会坏到哪一步？哪条红线会被踩？' },
  { id: 'outsider', name: '外部视角', ask: '换成招聘方／买家／客户，会怎么看你这件事？' },
  { id: 'elder', name: '过来人', ask: '做过类似选择的人，最后悔与最庆幸的各是什么？' }
];
const TOPICS = ['该不该辞职', '先补哪条证据', '怎么定价', '下个月做什么', '要不要换城市'];
const ADVISORS = [
  { id: 'career', name: '职业规划师', duty: '把能力映射到岗位与路径', watch: '能力 5 条 / 三条路' },
  { id: 'money', name: '财务顾问', duty: '算现金缓冲与最低收入线', watch: '红线 R-001 / 资源 P-001' },
  { id: 'product', name: '产品教练', duty: '把想法压成一个能验证的最小动作', watch: '证据 5 条 / 关卡 p1' },
  { id: 'mind', name: '心理教练', duty: '拆开拖延与讨好型反应', watch: 'R-003/R-004 / personality' }
];
function tabsHtml(active) {
  return '<div class="ldt-aitabs">' + TABS.map(function (t) {
    return '<span class="ldt-aitab' + (active === t[0] ? ' is-on' : '') + '" role="tab" data-act="ai-tab" data-tab="' + t[0] + '">' + t[1] + '</span>';
  }).join('') + '</div>';
}
function salonHtml(st) {
  const out = (st && st.out) || '';
  const topic = (st && st.topic) || '';
  const hist = (st && st.hist && st.hist.length) ? st.hist : [];
  return '<div class="ldt-aipanel">'
    + '<div class="ldt-aihead"><div class="ldt-aihead-t">思想会客厅</div><span class="ldt-aibadge">只发摘要 · 不传整库</span></div>'
    + '<div class="ldt-ailead">摆一个议题，让四个角色各说一段话；他们只能引用你已有的证据与红线，不许编。</div>'
    + '<div class="ldt-aichips">' + TOPICS.map(function (t) { return '<span class="ldt-aichip' + (topic === t ? ' is-on' : '') + '" data-act="ai-topic" data-topic="' + esc(t) + '">' + esc(t) + '</span>'; }).join('') + '</div>'
    + '<input class="ldt-aiinput" data-act="ai-topic-input" placeholder="或自己写一个议题，例如：我要不要接这个外包？" value="' + esc(topic) + '">'
    + '<div class="ldt-airoles">' + SALON_ROLES.map(function (r) {
        return '<div class="ldt-airole"><b>' + r.name + '</b><span>' + r.ask + '</span></div>';
      }).join('') + '</div>'
    + '<div class="ldt-aiactions"><button class="ldt-pill primary" data-act="ai-salon-run">开圆桌</button><span class="ldt-muted" style="font-size:11px">只发议题＋结构化摘要，不传整库</span></div>'
    + (out ? '<div class="ldt-aioutwrap"><div class="ldt-aiout-t">圆桌纪要</div><div class="ldt-aiout">' + esc(out) + '</div></div>' : '<div class="ldt-aiempty">还没开过圆桌。点上面一个议题，或自己写一个。</div>')
    + (hist.length ? '<div class="ldt-aihist"><div class="ldt-aihist-t">最近 ' + hist.length + ' 次</div>' + hist.map(function (h) { return '<div class="ldt-aihist-i"><b>' + esc(h.topic || '议题') + '</b><span>' + esc(String(h.out || '').slice(0, 60)) + '…</span></div>'; }).join('') + '</div>' : '')
    + '</div>';
}
function cabinetHtml(st) {
  const out = (st && st.out) || '';
  return '<div class="ldt-aipanel">'
    + '<div class="ldt-aihead"><div class="ldt-aihead-t">人生智囊团</div><span class="ldt-aibadge">四位常驻 · 各看一摊</span></div>'
    + '<div class="ldt-ailead">四位常驻顾问。每人只回答一件事：基于你现有的证据与风险，下一步做什么、别做什么。</div>'
    + '<div class="ldt-aicab">' + ADVISORS.map(function (a) {
        return '<div class="ldt-aiadv" data-act="ai-adv" data-adv="' + a.id + '"><b>' + a.name + '</b><span class="ldt-aiadv-duty">' + a.duty + '</span><span class="ldt-aiadv-watch">看：' + a.watch + '</span><span class="ldt-aiadv-go">单独问 →</span></div>';
      }).join('') + '</div>'
    + '<div class="ldt-aiactions"><button class="ldt-pill primary" data-act="ai-cabinet-run">开内阁会</button><span class="ldt-muted" style="font-size:11px">四位各给 1 条建议＋1 条反对意见</span></div>'
    + (out ? '<div class="ldt-aioutwrap"><div class="ldt-aiout-t">内阁建议</div><div class="ldt-aiout">' + esc(out) + '</div></div>' : '<div class="ldt-aiempty">还没开过内阁会。点「开内阁会」，或点某位顾问单独问。</div>')
    + '</div>';
}
function buildAiHtml(o) {
  const opts = o || {};
  const tab = opts.tab === 'cabinet' ? 'cabinet' : 'salon';
  const hasKey = opts.hasKey === true;
  const st = opts.state || {};
  let body;
  if (!hasKey) {
    body = '<div class="ldt-aiempty"><b>还没有接入模型</b><div style="margin-top:6px">先在「模型连接」里填 DeepSeek Key。填好之后，这两个 tab 才会真正出话。</div><div style="margin-top:10px"><button class="ldt-pill primary" data-act="ai-goto-model">去接入模型</button></div></div>';
  } else {
    body = tab === 'salon' ? salonHtml(st.salon) : cabinetHtml(st.cabinet);
  }
  return { ok: true, html: tabsHtml(tab) + body, tab: tab };
}
module.exports = { buildAiHtml: buildAiHtml, TABS: TABS, SALON_ROLES: SALON_ROLES, ADVISORS: ADVISORS, TOPICS: TOPICS };
// build-tag: 0
