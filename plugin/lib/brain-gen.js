/* brain-gen.js - 把人生决策树的数据生成九段知识卡（纯 Node，不 require obsidian）
 * 数据源：.ldt/person-model.json ＋ .ldt/cases.json ＋ .ldt/assets.json（缺就给 null，缺的段写「未取」）
 * 输出：[{ id,type,title,summary,...,relates,md }]；与我的第二大脑（my-second-brain）同构，便于互相迁移。
 */
'use strict';
const SECTIONS = ['一句话结论', '解释', '为什么值得记住', '适用范围', '成立条件', '不适用与边界', '反例', '内容身份', '来源锚点'];
const KIND_WHY = { evidence: '一条真实发生过的证据，是「能力推断」的地基', skill: '由证据推出来的能力假设，需要再验一次', risk: '已知的约束或红线，决策时先扣掉', resource: '可动用的现成资源，降低启动成本' };
function esc(v) { return String(v == null ? '' : v); }
function sectionBody(c, name) {
  const map = { '一句话结论': c.summary, '解释': c.explain, '为什么值得记住': c.worth, '适用范围': c.scope, '成立条件': c.conditions, '不适用与边界': c.boundary, '反例': c.counter, '内容身份': c.identity, '来源锚点': c.anchor };
  const v = map[name];
  return (typeof v === 'string' && v.trim()) ? v.trim() : '未取（原始材料没给这一段）';
}
function cardMd(c) {
  const L2 = [];
  L2.push('---');
  L2.push('id: ' + c.id);
  L2.push('type: ' + c.type);
  L2.push('profile: ldt');
  L2.push('epistemic: ' + (c.epistemic || 'unknown'));
  L2.push('anchor: ' + (c.anchor || ''));
  if (c.relates && c.relates.length) { L2.push('relates: ' + c.relates.join(',')); }
  L2.push('---', '');
  L2.push('# ' + (c.title || c.summary || c.id), '');
  SECTIONS.forEach(function (s) { L2.push('## ' + s, '', sectionBody(c, s), ''); });
  return L2.join('\n');
}
function fromNodes(pm) {
  const out = [];
  ((pm && pm.nodes) || []).forEach(function (n) {
    out.push({
      id: 'ldt-' + n.id, type: n.kind || 'node', title: n.text, summary: n.text,
      explain: n.quote ? '原话：' + n.quote : '未取（该节点没有原文引述）',
      worth: KIND_WHY[n.kind] || '未取（未知节点类型 ' + n.kind + '）',
      scope: n.happened_on ? '发生于 ' + n.happened_on : '未取（原始材料没记时间）',
      conditions: 'epistemic=' + (n.epistemic || '?') + ' · confidence=' + (n.confidence == null ? '?' : n.confidence),
      boundary: n.kind === 'risk' ? '仅在该情境成立；换环境要重新验证' : '未取（未提供边界说明）',
      counter: n.kind === 'evidence' ? '反例未取（需要第二条独立证据才算稳）' : '未取',
      identity: 'ldt/person-model/' + n.id + ' · ' + (n.epistemic || 'unknown'),
      anchor: 'ldt://person-model#' + n.id,
      relates: (n.derived_from || []).map(function (x) { return 'ldt-' + x; }),
      epistemic: n.epistemic || 'unknown'
    });
  });
  return out;
}
function fromBranches(pm) {
  return ((pm && pm.branches) || []).map(function (b) {
    return {
      id: 'ldt-branch-' + b.id, type: 'branch', title: b.title, summary: b.title,
      explain: b.unlocked ? '当前可走（条件已满足）' : '当前锁着，缺：' + ((b.needs || []).join('、') || '未取'),
      worth: '一条可选路径，用来对照当前选择',
      scope: '父分支 ' + (b.parent || '无'),
      conditions: (b.needs && b.needs.length) ? b.needs.join('；') : '无前置条件',
      boundary: '未取（分支没有写退出条件）', counter: '未取',
      identity: 'ldt/person-model/branches/' + b.id,
      anchor: 'ldt://person-model#branch/' + b.id,
      relates: b.parent ? ['ldt-branch-' + b.parent] : []
    };
  });
}
function fromSkills(assets) {
  return ((assets && assets.skills) || []).map(function (s) {
    return {
      id: 'ldt-asset-' + s.id, type: 'carry', title: s.name,
      summary: s.name + (s.level ? '（当前 ' + s.level + ' 级）' : ''),
      explain: (s.evidence && s.evidence.length) ? '证据：' + s.evidence.join('；') : '未取（资产卡没带证据）',
      worth: '可迁移的能力资产，领域：' + ((s.domain || []).join('、') || '未取'),
      scope: '状态 ' + (s.status || '?') + ' · 来源 ' + (s.source || '?'),
      conditions: s.upgrade_condition || '未取（没写升级条件）',
      boundary: '未取（资产卡未给边界）', counter: '未取',
      identity: 'ldt/assets/skills/' + s.id,
      anchor: 'ldt://assets#skills/' + s.id, relates: []
    };
  });
}
function fromCases(cases) {
  return (cases || []).map(function (c, i) {
    const meta = (c && c.caseMeta) || {};
    return {
      id: 'ldt-case-' + (meta.id || (i + 1)), type: 'case',
      title: meta.title || ('案例 ' + (i + 1)),
      summary: meta.title || ('案例 ' + (i + 1)) + '（' + ((c.person && c.person.alias) || '匿名') + '）',
      explain: '人物：' + ((c.person && c.person.alias) || '未取'),
      worth: '别人的路径，用来校准自己的判断',
      scope: '访谈于 ' + ((c.person && c.person.interviewed_at) || '未取'),
      conditions: '节点 ' + ((c.nodes || []).length) + ' 条',
      boundary: '个案，不可当规律用', counter: '未取',
      identity: 'ldt/case/' + (meta.id || (i + 1)),
      anchor: 'ldt://case#' + (meta.id || (i + 1)), relates: []
    };
  });
}
function buildCards(input) {
  const i = input || {};
  const all = [].concat(fromNodes(i.personModel), fromBranches(i.personModel), fromSkills(i.assets), fromCases(i.cases));
  const seen = {};
  return all.filter(function (c) { if (seen[c.id]) { return false; } seen[c.id] = true; return true; }).map(function (c) {
    const card = Object.assign({}, c);
    card.md = cardMd(card);
    return card;
  });
}
module.exports = { SECTIONS: SECTIONS, buildCards: buildCards, cardMd: cardMd };
