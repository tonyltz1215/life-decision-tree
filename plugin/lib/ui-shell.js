/* ui-shell.js - 页面外壳（纯字符串）：顶栏＋标签条＋画布＋状态条 */
'use strict';
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
const TABS = [['assets', '资产库'], ['levels', '工作台'], ['cases', '破局推演'], ['brain', '第二大脑']];
const BTNS = ['<span class="ldt-pill btool" data-act="brain-model">⚙ 模型连接</span>', '<span class="ldt-pill btool" data-act="brain-guide">▤ 使用教程</span>', '<span class="ldt-pill btool" data-act="brain-version">◈ 人生决策树 v0.1.23</span>', '<span class="ldt-pill btool" data-act="brain-search-open">⌕ 搜索</span>', '<span class="ldt-pill btool" data-act="brain-switch">⇄ 切换</span>'].join('');
function pageShellHtml(o) {
  const opts = o || {};
  const st = opts.stats || {};
  const tabHtml = TABS.map(function (t) { return '<span class="ldt-tab' + (opts.tab === t[0] ? ' is-active' : '') + '"' + (opts.tab === t[0] ? ' aria-current="page"' : '') + ' data-act="nav-' + t[0] + '">' + t[1] + '</span>'; }).join('');
  const status = (st.cards != null) ? (st.cards + ' 张卡 · 待核实 ' + (st.unverified || 0)) : '';
  return '<div class="ldt-shell"><div class="ldt-pagehead">'
    + '<div class="ldt-topbar"><div class="ldt-brand"><span class="ldt-logo">◈</span><div><div class="ldt-title">' + esc(opts.title) + '</div><div class="ldt-sub">' + esc(opts.sub || '') + '</div></div></div>'
    + '<div class="ldt-actions"><span class="ldt-pill" data-act="selfcheck">自检</span><span class="ldt-pill" data-act="popout">新窗口</span>' + BTNS + '<span class="ldt-pill primary">' + esc(opts.pill || '') + '</span></div></div>'
    + '<div class="ldt-tabs">' + tabHtml + '</div></div>'
    + '<div class="ldt-body single"><div class="ldt-canvas">' + (opts.html || '') + '</div></div>'
    + '<div class="ldt-statusbar"><span>' + status + '</span><span class="ldt-spacer"></span><span>本地 JSON · 只读</span></div>'
    + '</div>';
}
module.exports = { pageShellHtml: pageShellHtml, TABS: TABS };
