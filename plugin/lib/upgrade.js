/* upgrade.js - 体验版升级引导（产品内提示）：只在未激活时出现，一键打开设置去填码
 * 纯函数，不 require obsidian；插件与门共用。
 */
'use strict';
const PRICE = { original: 129, intro: 99 };
function shouldShow(settings) {
  const s = settings || {};
  return s.demo === true || s.licensed !== true;
}
function buildHtml(opts) {
  const o = opts || {};
  const left = o.remaining;
  const used = o.used === true;
  const p = [];
  p.push('<div class="ldt-upgrade">');
  p.push('<div class="ldt-upgrade-t">体验版 · 解锁全部 12 关与不限次生成</div>');
  p.push('<div class="ldt-upgrade-x">' + (used ? '体验额度已用完：填码后可继续生成正式树（不限次）。' : (left ? ('体验额度还剩 ' + left + ' 次。') : '')) + '内测 ¥99（原价 ¥129）· 买断不订阅 · 老朋友免费</div>');
  p.push('<div class="ldt-upgrade-ops"><span class="ldt-op primary" data-act="open-license">填兑换码</span><span class="ldt-op" data-act="copy-code-path">码在哪</span></div>');
  p.push('</div>');
  return p.join('');
}
module.exports = { PRICE: PRICE, shouldShow: shouldShow, buildHtml: buildHtml };
