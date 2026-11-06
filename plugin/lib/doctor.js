/* doctor.js - 一键自检（纯函数）：买家装不上/生成不了时，输出一段可直接复制的短报告
 * 铁律：只报数量与状态，绝不带节点原文、原话、邮箱、手机号。
 */
'use strict';
const VERSION = '0.1.0';
const LEVEL = { pass: '通过', warn: '提醒', fail: '失败' };
function line(c) { return '[' + LEVEL[c.level] + '] ' + c.title + '：' + c.detail; }
function diagnose(input) {
  const s = input || {};
  const f = s.files || {};
  const st = s.settings || {};
  const checks = [];
  checks.push({ id: 'version', level: 'pass', title: '插件版本', detail: 'v' + (s.version || VERSION) + '（桌面端常驻）' });
  const m = f.model || {};
  if (!m.exists) {
    checks.push({ id: 'model', level: 'warn', title: '模型文件', detail: '没找到 .ldt/person-model.json —— 重新打开「决策树」会自动放入样例；若仍没有，说明插件目录不完整，请整包重装' });
  } else if (m.bad) {
    checks.push({ id: 'model', level: 'fail', title: '模型文件', detail: '.ldt/person-model.json 不是合法 JSON —— 用「一键导出」旁边那份备份 .backup-iv-*.json 恢复，或重新跑一次访谈生成' });
  } else {
    checks.push({ id: 'model', level: 'pass', title: '模型文件', detail: '.ldt/person-model.json 可读，共 ' + (m.nodes || 0) + ' 个节点' });
  }
  const mem = f.memory || {};
  if (!mem.exists) { checks.push({ id: 'memory', level: 'warn', title: '三层记忆', detail: '没找到 .ldt/memory.json —— 打开「三层记忆」会自动生成样例' }); }
  else if (mem.bad) { checks.push({ id: 'memory', level: 'fail', title: '三层记忆', detail: '.ldt/memory.json 损坏 —— 打开三层记忆后重新保存一次，或从备份恢复' }); }
  else { checks.push({ id: 'memory', level: 'pass', title: '三层记忆', detail: 'L1 ' + (mem.L1 || 0) + ' · L2 ' + (mem.L2 || 0) + ' · L3 ' + (mem.L3 || 0) }); }
  const run = f.run || {};
  checks.push({ id: 'run', level: 'pass', title: '进度文件', detail: run.exists ? ('已记录 ' + (run.levels || 0) + ' 关') : '还没有进度（第一次进关卡地图会自动创建）' });
  if (st.licensed === true) { checks.push({ id: 'license', level: 'pass', title: '兑换码', detail: '已激活（' + (st.tier || 'standard') + '）' }); }
  else { checks.push({ id: 'license', level: 'warn', title: '兑换码', detail: '未激活，当前是体验版 —— 设置 → 人生决策树 → 兑换码，粘贴 SB- 开头的码' }); }
  const strict = st.demoStrict || 'off';
  checks.push({ id: 'strict', level: 'pass', title: '体验版边界', detail: strict === 'draft' ? 'draft（只出草稿）' : strict === 'once' ? 'once（可生成 1 次）' : 'off（体验版可生成）' });
  checks.push({ id: 'data', level: 'pass', title: '数据位置', detail: '全部在库目录 .ldt/（3 个文件）；导出与删除在「三层记忆」页底部' });
  const fails = checks.filter(function (c) { return c.level === 'fail'; });
  const warns = checks.filter(function (c) { return c.level === 'warn'; });
  const status = fails.length ? 'fail' : (warns.length ? 'warn' : 'pass');
  const head = '人生决策树 自检 · v' + (s.version || VERSION) + ' · ' + (s.at || '') + '｜结果：' + (status === 'pass' ? '全部正常' : status === 'warn' ? ('有 ' + warns.length + ' 条提醒') : ('失败 ' + fails.length + ' 条'));
  const tail = status === 'pass' ? '不用处理，直接用。' : '把下面这段整段复制给卖家，别自己改文件。';
  const text = [head].concat(checks.map(line)).concat(['—— ' + tail]).join('\n');
  return { ok: fails.length === 0, status: status, checks: checks, text: text, lines: checks.length + 2 };
}
module.exports = { VERSION: VERSION, LEVEL: LEVEL, diagnose: diagnose, line: line };
