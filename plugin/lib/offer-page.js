/* offer-page.js - 商品页 HTML v2（深色工坊风、两张真机截图、价格三档、承诺按销量显示）
 * 纯函数，不 require obsidian；与 offer.js 共用同一套价格与承诺口径，避免两处文案分叉。
 * 对外件纪律：不放外链、不承诺收益、不做心理诊断、不提无关平台。
 */
'use strict';
const PRICE = { original: 129, intro: 99 };
const PROMISE_LIMIT = 50;
const IMAGES = {
  diag: 'assets/diag-panel.png',
  tree: 'assets/tree-branches.png',
  lost: 'assets/mem-lost.png'
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
  });
}

function buildHtml(opts) {
  const o = opts || {};
  const sold = Math.max(0, Number(o.sold || 0));
  const showPromise = sold < (o.limit || PROMISE_LIMIT);
  const original = Number(o.original || PRICE.original);
  const intro = Number(o.intro || PRICE.intro);
  const img = Object.assign({}, IMAGES, o.images || {});
  const p = [];
  p.push('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">');
  p.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
  p.push('<title>人生决策树 · 工作几年后卡住的人，先别急着辞职</title>');
  p.push('<style>');
  p.push('*{box-sizing:border-box}body{margin:0;background:#05090e;color:#dbe7f3;font:15px/1.75 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif}');
  p.push('.wrap{max-width:1080px;margin:0 auto;padding:0 24px}');
  p.push('.hero{padding:64px 0 40px;background:radial-gradient(900px 420px at 78% -10%,#0d2436 0%,#081420 55%,#05090e 100%)}');
  p.push('.eyebrow{display:inline-flex;gap:10px;align-items:center;font-size:13px;color:#7f97ab;border:1px solid rgba(120,180,220,.22);border-radius:999px;padding:5px 12px}');
  p.push('.dot{width:7px;height:7px;border-radius:50%;background:#22d3ee;display:inline-block}');
  p.push('h1{font-size:44px;line-height:1.25;margin:22px 0 14px;letter-spacing:-.5px}');
  p.push('.lede{font-size:18px;color:#a9c0d3;max-width:720px}');
  p.push('.cta{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin:30px 0 8px}');
  p.push('.btn{display:inline-block;padding:13px 26px;border-radius:999px;font-weight:700;font-size:16px;text-decoration:none;color:#04121a;background:linear-gradient(135deg,#22d3ee,#38bdf8)}');
  p.push('.btn.ghost{background:transparent;color:#a5f3fc;border:1px solid rgba(34,211,238,.45)}');
  p.push('.note{font-size:13px;color:#7f97ab}');
  p.push('.shot{margin:40px 0;border:1px solid rgba(120,180,220,.18);border-radius:16px;overflow:hidden;background:#081420}');
  p.push('.shot img{display:block;width:100%;height:auto}');
  p.push('.cap{padding:10px 16px;font-size:13px;color:#7f97ab;border-top:1px solid rgba(120,180,220,.12)}');
  p.push('h2{font-size:26px;margin:56px 0 8px}');
  p.push('.pains{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}');
  p.push('.pain{border:1px solid rgba(120,180,220,.18);border-radius:14px;padding:18px;background:rgba(12,22,33,.88)}');
  p.push('.pain b{display:block;color:#fca5a5;font-size:13px;margin-bottom:6px}');
  p.push('.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}');
  p.push('.card{border:1px solid rgba(120,180,220,.18);border-radius:14px;padding:20px;background:rgba(12,22,33,.88)}');
  p.push('.card h3{margin:0 0 8px;font-size:17px;color:#a5f3fc}');
  p.push('.card p{margin:0;color:#a9c0d3;font-size:14px}');
  p.push('table{width:100%;border-collapse:collapse;margin:18px 0;font-size:15px}');
  p.push('th,td{text-align:left;padding:12px 14px;border-bottom:1px solid rgba(120,180,220,.14)}');
  p.push('th{color:#7f97ab;font-weight:600;font-size:13px}');
  p.push('.price{font-size:22px;color:#a5f3fc;font-weight:800}');
  p.push('ol.steps{padding-left:20px;color:#c7d8e6}ol.steps li{margin:10px 0}');
  p.push('.faq{margin:18px 0}.faq q{display:block;color:#a5f3fc;margin-top:16px;quotes:none;font-weight:600}');
  p.push('.faq p{margin:6px 0 0;color:#a9c0d3;font-size:14px}');
  p.push('footer{margin:64px 0 40px;padding-top:22px;border-top:1px solid rgba(120,180,220,.14);color:#7f97ab;font-size:13px}');
  p.push('@media(max-width:820px){h1{font-size:32px}.pains,.grid3{grid-template-columns:1fr}}');
  p.push('</style></head><body>');

  p.push('<section class="hero"><div class="wrap">');
  p.push('<span class="eyebrow"><i class="dot"></i>本地运行 · 不联网 · Obsidian 插件 v0.1.0</span>');
  p.push('<h1>工作几年后卡住的人，<br>先别急着辞职</h1>');
  p.push('<p class="lede">把你说过的事摊开：<b>16 个节点、3 条分支、1 条红线</b>——哪条路真的能走，树上看。证据不够，它拒绝给你结论。</p>');
  p.push('<div class="cta"><a class="btn" href="#buy">¥' + intro + ' 内测（前 ' + PROMISE_LIMIT + ' 名）</a>');
  p.push('<a class="btn ghost" href="#how">先玩体验版</a>');
  p.push('<span class="note">原价 ¥' + original + ' · 买断 · 无订阅 · 数据在你电脑上</span></div>');
  p.push('<div class="shot"><img src="' + esc(img.diag) + '" alt="诊断三态"><div class="cap">同一根分支，答一次和答两次不是一个可信度：已掌握／需要再验证／待补强</div></div>');
  p.push('</div></section>');

  p.push('<section class="wrap"><h2>卡住的样子，通常是这三种</h2><div class="pains">');
  p.push('<div class="pain"><b>钱先说话</b>存款只够 2 个月，房贷每月 7000。你想裸辞，但这条分支在树上是锁着的——它写着「需要：存款≥6 个月」。</div>');
  p.push('<div class="pain"><b>说不清为什么</b>面试官问「你为什么想转行」，你答了三分钟，自己都不太信。你缺的不是口才，是一条能指回原话的证据。</div>');
  p.push('<div class="pain"><b>收藏了 40 篇</b>转行攻略存了 40 篇，一篇没照着做。你需要的是下一步做什么，不是再看一遍别人的故事。</div>');
  p.push('</div>');

  p.push('<h2>它做三件事</h2><div class="grid3">');
  p.push('<div class="card"><h3>三层记忆</h3><p>L1 是你当时说的原话，L2 是访谈摘要（每条指向 ≥2 条原话），L3 是「你是谁」的结论（每条指向 ≥2 条摘要）。删掉一条 L1，上层不消失，标「已失去来源」——你能看见哪句话一撤，结论就虚了。</p></div>');
  p.push('<div class="card"><h3>诊断三态</h3><p>第一次就答对＝已掌握；一错一对＝需要再验证；连续两错＝待补强，并往前追一层先修。追到根或追到已掌握为止。</p></div>');
  p.push('<div class="card"><h3>数据只在你电脑</h3><p>全部写在你库目录的 .ldt/ 里：memory.json、person-model.json、run.json。不点「AI 增强」就永远不联网；一键导出前自动脱敏手机号／邮箱／身份证。</p></div>');
  p.push('</div>');

  p.push('<div class="shot"><img src="' + esc(img.lost) + '" alt="删掉一条原话"><div class="cap">删掉「两周理清三年乱账」这句原话后：上层的摘要没有消失，而是标上「已失去来源」——你能看见哪句话一撤，结论就虚了</div></div>');
  p.push('<div class="shot"><img src="' + esc(img.tree) + '" alt="决策树"><div class="cap">左边是节点（蓝＝事实／黄＝推测／红＝未验证风险），下面是 3 条分支；「裸辞」被财务红线锁住</div></div>');

  p.push('<h2 id="buy">多少钱</h2><table><tr><th>档</th><th>价格</th><th>说明</th></tr>');
  p.push('<tr><td>原价</td><td class="price">¥' + original + '</td><td>买断，后续版本免费更新</td></tr>');
  p.push('<tr><td>内测价</td><td class="price">¥' + intro + '</td><td>前 ' + PROMISE_LIMIT + ' 名，锁价</td></tr>');
  p.push('<tr><td>熟人</td><td class="price">免费</td><td>私聊我拿码</td></tr></table>');
  if (showPromise) {
    p.push('<p class="note">内测权益：前 ' + PROMISE_LIMIT + ' 名含一次 15 分钟异步文本诊断（提交文字，当天回）——已售 ' + sold + '/' + PROMISE_LIMIT + '。</p>');
  }

  p.push('<h2 id="how">怎么开始</h2><ol class="steps">');
  p.push('<li>先玩体验版：装 Obsidian（1.11.0 以上，免费），把插件文件夹放进 <code>.obsidian/plugins/</code>，启用后按 Ctrl/Cmd+P 输入「人生决策树」。体验版可生成 1 次正式树，之后只出草稿。</li>');
  p.push('<li>看完样例后打开「访谈入库」：15 题、约 15 分钟，当场生成你自己的树（18 个节点、三层记忆一次生成，旧文件自动备份）。</li>');
  p.push('<li>付款后拿兑换码（SB- 开头）→ 设置 → 人生决策树 → 粘贴保存 → 顶部徽标从「未激活」变「已激活」。</li>');
  p.push('</ol>');

  p.push('<h2>你可能想问</h2><div class="faq">');
  p.push('<q>要装 Obsidian 吗？我不会折腾。</q><p>要装，但不用命令行：建一个空库，把插件文件夹整个复制进 .obsidian/plugins/，重开、启用，六步约 10 分钟。装不上最常见的原因是多套了一层文件夹。</p>');
  p.push('<q>会不会瞎编？</q><p>证据不够它直接拒绝：少于 5 条带原话的证据、或节点少于 15 个，就出「数据不足，再给 2 个具体案例」，不硬给结论。发版前我们自己跑 32 道门，全绿才发。</p>');
  p.push('<q>我的数据会被上传吗？</q><p>不会。除非你自己点「AI 增强」并勾选同意，那一次要分析的文字才发出去。断网也能用。</p>');
  p.push('<q>能退吗？</q><p>虚拟商品，装好后不支持退款——所以先给体验版，玩法看明白了再买。装不上属于我们的问题，私聊我处理。</p>');
  p.push('</div>');

  p.push('<footer><div class="wrap">不提供心理诊断、不保证转行成功、只做沙盘推演。如果你持续两周睡不好、吃不下，先去找专业的人，这件事比换工作急。<br>本页不承诺任何收益；数据默认只在本地。</div></footer>');
  p.push('</body></html>');
  return p.join('\n');
}

module.exports = { PRICE: PRICE, PROMISE_LIMIT: PROMISE_LIMIT, IMAGES: IMAGES, buildHtml: buildHtml, esc: esc };
