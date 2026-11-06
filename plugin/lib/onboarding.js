/* onboarding.js - 首次使用引导：陌生人装完先做这三件事（只首跑出现，关掉不再出现）
 * 纯函数，不 require obsidian；插件与门共用。
 */
'use strict';
const KEY = 'seenGuide';
const STEPS = [
  { id: 'sample', n: 1, title: '先看一棵真的', btn: '看样例树', act: 'guide-sample', text: '打开「决策树」：16 个节点、3 条分支、1 条红线——存款只够 2 个月，「裸辞」那条是锁着的。' },
  { id: 'interview', n: 2, title: '回答 15 个问题', btn: '去访谈入库', act: 'guide-interview', text: '约 15 分钟，当场生成你自己的 18 个节点和三层记忆；填一半也能存草稿，关窗不丢。' },
  { id: 'data', n: 3, title: '数据是你的', btn: '先看导出', act: 'guide-export', text: '全部写在库目录 .ldt/（3 个文件）；一键导出会自动脱敏手机号／邮箱／身份证，也可以一键删干净。' }
];

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
  });
}
function shouldShow(settings) { return !(settings && settings[KEY] === true); }
function dismiss(settings) {
  const s = Object.assign({}, settings || {});
  s[KEY] = true;
  return s;
}
function buildGuideHtml() {
  const p = [];
  p.push('<div class="ldt-guide"><div class="ldt-guide-head"><b>3 步上手</b>（约 3 分钟）<span class="ldt-op" data-act="guide-dismiss">知道了，以后不再显示</span></div>');
  p.push('<div class="ldt-guide-grid">');
  STEPS.forEach(function (s) {
    p.push('<div class="ldt-guide-card"><div class="ldt-guide-n">' + s.n + '</div><div class="ldt-guide-t">' + esc(s.title) + '</div><div class="ldt-guide-x">' + esc(s.text) + '</div>');
    p.push('<span class="ldt-op primary" data-act="' + s.act + '">' + esc(s.btn) + '</span></div>');
  });
  p.push('</div></div>');
  return p.join('');
}

module.exports = { KEY: KEY, STEPS: STEPS, shouldShow: shouldShow, dismiss: dismiss, buildGuideHtml: buildGuideHtml, esc: esc };
