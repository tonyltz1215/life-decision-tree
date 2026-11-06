/* demo-policy.js - 体验版边界（纯函数）：off / draft / once 三档
 * 背景：体验版原来只锁关卡地图（第 2 关起），但访谈生成与导出完全不看 demo——等于把核心白送。
 * 这里把「能不能生成正式树」「导出要不要打体验标记」抽成纯函数，插件与门共用；默认 off（保持现状），
 * 要收紧时改一个设置（demoStrict）即可，不用改代码。
 */
'use strict';
const MODES = ['off', 'draft', 'once'];
function policy(input) {
  const s = input || {};
  const licensed = s.licensed === true;
  const demo = s.demo === true || !licensed;
  const strict = MODES.indexOf(s.demoStrict) >= 0 ? s.demoStrict : 'off';
  if (!demo) {
    return { demo: false, licensed: true, strict: strict, canGenerate: true, mode: 'licensed', message: '' };
  }
  if (strict === 'draft') {
    return { demo: true, licensed: false, strict: strict, canGenerate: false, mode: 'draft', message: '体验版只出草稿，不生成正式树；填兑换码后无限生成' };
  }
  if (strict === 'once') {
    const used = s.demoUsed === true;
    return used
      ? { demo: true, licensed: false, strict: strict, canGenerate: false, mode: 'draft', message: '体验额度已用完（可生成 1 次）；填兑换码后无限生成' }
      : { demo: true, licensed: false, strict: strict, canGenerate: true, mode: 'trial', message: '体验额度：可生成 1 次正式树，之后只出草稿' };
  }
  return { demo: true, licensed: false, strict: 'off', canGenerate: true, mode: 'open', message: '' };
}
function exportStamp(input) {
  const p = policy(input);
  return p.demo ? { demo: true, stamp: '体验版导出（未激活）：数据可用，正式版解锁无限生成与更新' } : { demo: false, stamp: '' };
}
module.exports = { MODES: MODES, policy: policy, exportStamp: exportStamp };
