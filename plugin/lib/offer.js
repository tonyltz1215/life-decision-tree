/* offer.js - 商品页文案（纯函数）：价格三档 + 前 50 名承诺按销量隐藏 */
'use strict';
const PRICE = { original: 129, intro: 99, friend: 0 };
const PROMISE_LIMIT = 50;

function promiseVisible(sold) { return Number(sold || 0) < PROMISE_LIMIT; }

function buildOffer(opts) {
  const o = opts || {};
  const sold = Math.max(0, Number(o.sold || 0));
  const show = promiseVisible(sold);
  const promise = '前 50 名含一次 15 分钟异步文本诊断（微信/邮箱提交，当天回）';
  const lines = [
    '# 人生决策树 · 你的个人商业 RPG',
    '',
    '选一个身份，看清下一步。12 关职业骨架，证据够了才点亮。',
    '',
    '## 价格',
    '',
    '| 档 | 价格 | 说明 |',
    '|---|---|---|',
    '| 原价 | **¥' + (o.original || PRICE.original) + '** | 买断，永久更新 |',
    '| 内测价 | **¥' + (o.intro || PRICE.intro) + '** | 前 50 名 |',
    '| 熟人 | 免费 | 私聊我拿码 |',
    ''
  ];
  if (show) { lines.push('## 内测权益', '', '- ' + promise + '（已售 ' + sold + '/' + PROMISE_LIMIT + '）', ''); }
  lines.push('## 你会得到什么', '');
  lines.push('- 12 关职业骨架（4 类职业 × 0→1／小成／大成）');
  lines.push('- 每关：目标、通关判据、示例凭据、反例、护身符');
  lines.push('- 本地数据：`.ldt/` 目录，导出即走；默认不联网');
  lines.push('- 体验版：可生成 1 次正式树，之后只出草稿；12 关只开第一关');
  lines.push('');
  lines.push('## 怎么激活', '');
  lines.push('1. 付款后拿到兑换码 `SB-XXXX-…`');
  lines.push('2. 打开 Obsidian → 设置 → 人生决策树 → 填入兑换码 → 保存');
  lines.push('3. 顶部徽标从「未激活」变为「已激活」；体验版限制解除');
  lines.push('');
  lines.push('## 退款', '');
  lines.push('虚拟商品，安装后不支持退款；可先用体验版或 3 天体验。');
  lines.push('');
  lines.push('> 本页由工具生成，不承诺结果、不做心理诊断。');
  return { showPromise: show, sold: sold, promise: show ? promise : '', md: lines.join('\n') };
}

module.exports = { PRICE: PRICE, PROMISE_LIMIT: PROMISE_LIMIT, promiseVisible: promiseVisible, buildOffer: buildOffer };
