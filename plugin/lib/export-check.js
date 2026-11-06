/* export-check.js - 导出前检查（M1 补红项）：三项全勾才允许复制路径 */
'use strict';
const CHECKLIST = [
  { id: 'name', text: '人名/花名：已替换成「本人 / 熟人A」或打码' },
  { id: 'org', text: '公司名/部门：已替换成「原公司 / 原部门」' },
  { id: 'money', text: '金额与联系方式：已改成区间或删除' }
];

function canCopy(checked) {
  const c = checked || {};
  return CHECKLIST.every(function (x) { return c[x.id] === true; });
}

function summary(checked) {
  const c = checked || {};
  return CHECKLIST.map(function (x) { return { id: x.id, ok: c[x.id] === true }; });
}

function hintText() {
  return '导出前请逐项核对：' + CHECKLIST.map(function (x) { return x.text; }).join('；') + '；分享截图请打码。';
}

module.exports = { CHECKLIST: CHECKLIST, canCopy: canCopy, summary: summary, hintText: hintText };
