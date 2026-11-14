/* eslint-disable */
'use strict';
// build-note: 0.1.11 tabs-6
// main.js - 人生决策树 Obsidian 插件（骨架 v2 形态；界面按「蒸馏工坊」改版：全幅外壳 + 顶部动作条 + 标签条 + 右栏）
// 铁律：只读本地 JSON、只渲染；不联网、不调外部模型。拒绝态：读不到／坏 JSON／数据不足 ⇒ 拒绝条，绝不静默给结论
const obsidian = require('obsidian');
const Plugin = obsidian.Plugin;
const ItemView = obsidian.ItemView;
const PluginSettingTab = obsidian.PluginSettingTab;
const Setting = obsidian.Setting;
const Notice = obsidian.Notice;
let TREE = null; // onload 时按 manifest.dir 绝对路径加载：Obsidian 插件 require 不支持相对路径（实测 Cannot find module './lib/tree-view.js'）
let PAGEA_AI = null;   // AI 次级页面（会客厅/智囊团）
let LEVELS = null; // 同上，关卡地图渲染器
let RUN = null; // 用户进度模型（纯函数）
let VERIFY = null; // 证据判定器（纯函数）
let FEEDBACK = null; // 反馈打包（脱敏）
let STRATEGY = null; // 公共策略库接口（本地、脱敏）
let EXPORT = null; // 导出前检查清单
let LICENSE = null; // 离线兑换码校验
let PB = null; // provider B（DeepSeek）纯函数
let MEM = null; // 三层记忆（骨架 v2 §12）
let DIAG = null; // 诊断三态（§13）
let OBS = null; // 观察模式（§14）
let PRIV = null; // 隐私三件
let IV = null; // 访谈入库（15 题 → 树 + 三层记忆）
let ONB = null; // 首次使用引导
let DEMO = null; // 体验版边界（纯函数）
let UP = null; // 体验版升级引导
let DOC = null; // 一键自检
let PAGEA = null; // 资产库页（纯字符串）
let PAGEC = null; // 案例透视页（纯字符串）
let CASEP = null; // 案例→关卡 Prompt（纯函数）
let AICALL = null; // 直连 AI 的请求计划（纯函数）
let NEWT = null; // 新建树安全清理（可注入 adapter）
let PAGEI = null; // 导入更新页（纯字符串）
let DIFF = null; // 资产包差异合并
let SHELL = null; // 页面外壳（纯）
let BRAIN = null; // 第二大脑页（纯字符串）
let BRAIN_GEN = null;
let HERO = null; // 英雄面板（纯函数） // 决策树→九段卡生成器（纯函数）
let APPEND = null; // 追加备用关卡（纯）
let PACK = null; // 资产包 v2.1 校验/统计
const ASSETS_TYPE = 'ldt-assets';
const CASES_TYPE = 'ldt-cases';
const IMPORT_TYPE = 'ldt-import';
const LEVELS_TYPE = 'ldt-levels';
const MEMORY_TYPE = 'ldt-memory';
const INTERVIEW_TYPE = 'ldt-interview';
const BRAIN_TYPE = 'ldt-brain';
const AI_TYPE = 'ldt-ai';   // 2026-11-14：AI 次级页面（思想会客厅＋人生智囊团）
const APP_TYPE = 'ldt-app';   // 单一容器视图：所有页签在它内部切换，不再逐个开新标签页

const VIEW_TYPE = 'ldt-tree';
const DEFAULT_MODEL_PATH = '.ldt/person-model.json';

class LdtTreeView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return '人生决策树'; }
  getIcon() { return 'git-fork'; }
  async onOpen() { await this.renderModel(); this.plugin.enterImmersive(); }
  async onClose() { this.plugin.exitImmersive(); }
  editNode(id) {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host || typeof host.querySelector !== 'function') { return; }
    const card = host.querySelector('.ldt-card[data-node="' + String(id).replace(/"/g, '') + '"]');
    if (!card) { return; }
    const t = card.querySelector('.ldt-t');
    if (!t || t.querySelector('input')) { return; }
    const old = t.textContent;
    const inp = document.createElement('input');
    inp.value = old;
    inp.style.width = '100%';
    inp.style.fontSize = '13px';
    inp.style.padding = '2px 4px';
    t.textContent = '';
    t.appendChild(inp);
    inp.focus();
    inp.select();
    let closed = false;
    const finish = async (save) => {
      if (closed) { return; }
      closed = true;
      const v = String(inp.value || '').trim();
      if (save && v && v !== old) { await this.plugin.updateNodeText(id, v); this.renderModel(); }
      else { t.textContent = old; }
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } if (e.key === 'Escape') { finish(false); } });
    inp.addEventListener('blur', () => { finish(true); });
  }
  async renderModel() {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host) { return; }
    host.empty();
    host.addClass('ldt-view');
    const loaded = await this.plugin.loadModel();
    const hero = await this.plugin.heroStats();
    host.innerHTML = this.plugin.shellHtml(loaded, hero);
    if (typeof host.querySelector === 'function') {
      const bind = (sel, fn) => { const el = host.querySelector(sel); if (el && typeof el.addEventListener === 'function') { el.addEventListener('click', fn); } };
      bind('[data-act="reload"]', () => { this.renderModel(); });
      bind('[data-act="new"]', () => { this.plugin.newTree(); });
      if (typeof host.querySelectorAll === 'function') {
        host.querySelectorAll('[data-act="node-edit"]').forEach((el) => {
          el.addEventListener('click', (ev) => { if (ev && ev.stopPropagation) { ev.stopPropagation(); } this.editNode(el.getAttribute('data-node')); });
        });
        host.querySelectorAll('.ldt-card').forEach((card) => {
          card.addEventListener('dblclick', () => this.editNode(card.getAttribute('data-node')));
        });
      }
      bind('[data-act="open-memory"]', () => { this.plugin.activateMemory(); });
      const eachHero = (sel, fn) => { if (typeof host.querySelectorAll !== 'function') { return; } host.querySelectorAll(sel).forEach((el) => { el.addEventListener('click', (ev) => { if (ev && ev.preventDefault) { ev.preventDefault(); } fn(el); }); }); };
      eachHero('[data-act="hero-events"]', () => { this.plugin.activateMemory(); });
      eachHero('[data-act="hero-skills"]', () => { this.plugin.activateLevels(); });
      eachHero('[data-act="hero-map"]', () => { this.plugin.activateView(); });
      eachHero('[data-act="hero-tags"]', () => { const pop = host.querySelector('.ldt-hero-tags-pop'); if (pop && pop.classList) { pop.classList.toggle('is-open'); } });
      eachHero('[data-act="hero-tag"]', (el) => { this.plugin.toggleAssetFilter(el.getAttribute('data-domain')); this.plugin.activateLevels(); });
      host.querySelectorAll('[data-act="go-interview"]').forEach((el) => { el.addEventListener('click', async () => { await this.plugin.activateInterview(); }); });
      bind('[data-act="guide-dismiss"]', async () => { await this.plugin.dismissGuide(); this.renderModel(); });
      bind('[data-act="guide-interview"]', () => { this.plugin.activateInterview(); });
      bind('[data-act="guide-export"]', async () => { await this.plugin.exportAll(); this.renderModel(); });
      bind('[data-act="guide-sample"]', () => { this.renderModel(); });
      bind('[data-act="open-license"]', () => { this.openLicense(); });
      bind('[data-act="copy-code-path"]', () => { new Notice('兑换码由卖家发给你（SB- 开头）。填法：设置 → 人生决策树 → 兑换码 → 粘贴 → 保存', 9000); });
      this.plugin.bindPageNav(host);
    }
  }
}

class LdtLevelsView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() { return LEVELS_TYPE; }
  getDisplayText() { return '工作台'; }
  getIcon() { return 'gamepad-2'; }
  async onOpen() { await this.renderMap(); this.plugin.enterImmersive(); }
  async onClose() { this.plugin.exitImmersive(); }
  async renderMap() {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host) { return; }
    host.empty();
    host.addClass('ldt-view');
    const run = await this.plugin.loadRun();
    let model = null;
    try { const rawM = await this.plugin.app.vault.adapter.read(this.plugin.modelPath()); model = JSON.parse(rawM); } catch (e) { model = null; }
    let packLevels = null;
    try { const pg = await this.plugin.loadAssetsPack(); if (pg && !pg.error && pg.pack && Array.isArray(pg.pack.levels) && pg.pack.levels.length) { packLevels = pg.pack.levels; } } catch (e) { packLevels = null; }
    host.innerHTML = this.plugin.mapShellHtml(this.plugin.loadLevels(run, model, packLevels), model);
    this.plugin.enterImmersive();
    if (typeof host.querySelectorAll !== 'function') { return; }
    const self = this;
    const each = (sel, fn) => { host.querySelectorAll(sel).forEach((el) => { el.addEventListener('click', (ev) => { if (ev && ev.preventDefault) { ev.preventDefault(); } fn(el); }); }); };
    const rerender = () => { self.renderMap(); };
    if (self.plugin.ui && self.plugin.ui.drawer) { const d = host.querySelector('.ldt-drawer'); if (d && typeof d.scrollIntoView === 'function') { d.scrollIntoView({ block: 'nearest' }); } }
    each('[data-act="reload"]', rerender);
    each('[data-diff]', async (el) => { await self.plugin.setMapPref('diff', el.getAttribute('data-diff')); rerender(); });
    each('[data-arch]', async (el) => { await self.plugin.setMapPref('arch', el.getAttribute('data-arch')); rerender(); });
    each('[data-act="evidence"]', (el) => { self.plugin.openDrawer(el.getAttribute('data-lv')); rerender(); });
    each('[data-act="lv-done"]', async (el) => { await self.plugin.markLevelDone(el.getAttribute('data-lv')); rerender(); });
    each('[data-act="close"]', () => { self.plugin.closeDrawer(); rerender(); });
    each('[data-act="submit"]', async (el) => {
      const tierEl = host.querySelector('input[name="ldt-tier"]:checked');
      const taEl = host.querySelector('textarea[data-act="ta"]');
      const tier = tierEl ? tierEl.value : 'mid';
      const planEl = host.querySelector('input[name="ldt-plan"]:checked');
      const planType = planEl ? planEl.value : 'other';
      const text = taEl ? String(taEl.value || '') : '';
      await self.plugin.submitEvidence(el.getAttribute('data-lv'), tier, text, planType);
      rerender();
    });
    each('[data-act="license"]', () => { new Notice('设置 → 人生决策树 → 兑换码：粘贴 SB- 开头的码后保存；没有码就先玩体验版。', 9000); });
    each('[data-act="export-close"]', () => { self.plugin.ui.exportCheck = null; rerender(); });
    this.plugin.bindPageNav(host);
    each('[data-act="export-copy"]', async () => {
      const st = self.plugin.ui.exportCheck || {};
      if (!EXPORT.canCopy(st.checked || {})) { new Notice('还差几项没核对：三项全勾才能复制'); return; }
      try { if (navigator && navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText('.ldt/'); new Notice('已复制 .ldt/ 路径'); } } catch (e) { new Notice('复制失败'); }
      self.plugin.ui.exportCheck = null;
      rerender();
    });
    if (self.plugin.ui.exportCheck && self.plugin.ui.exportCheck.open && typeof host.querySelectorAll === 'function') {
      host.querySelectorAll('[data-export]').forEach((el) => {
        el.addEventListener('change', () => {
          const cur = self.plugin.ui.exportCheck || { open: true, checked: {} };
          cur.checked = cur.checked || {};
          cur.checked[el.getAttribute('data-export')] = el.checked === true;
          self.plugin.ui.exportCheck = cur;
          rerender();
        });
      });
    }
    each('[data-act="promote"]', async () => { await self.plugin.promoteDemo(); rerender(); });
    each('[data-act="copy"]', async (el) => { await self.plugin.copyPrompt(el.getAttribute('data-lv')); rerender(); });
    each('[data-act="feedback"]', async (el) => {
      const taEl = host.querySelector('textarea[data-act="ta"]');
      await self.plugin.sendFeedback(el.getAttribute('data-lv'), taEl ? taEl.value : '');
      rerender();
    });
  }
}

class LdtInterviewView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return INTERVIEW_TYPE; }
  getDisplayText() { return '访谈入库'; }
  getIcon() { return 'messages-square'; }
  async onOpen() { await this.plugin.loadDraft(); await this.renderInterview(); }
  async onClose() { await this.plugin.saveDraft(this.plugin.ui.ivAnswers); }
  async renderInterview() {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host) { return; }
    host.empty();
    host.addClass('ldt-view');
    host.innerHTML = this.plugin.interviewShellHtml(this.plugin.ui.ivResult);
    if (typeof host.querySelectorAll !== 'function') { return; }
    const self = this;
    const rerender = () => { self.renderInterview(); };
    const each = (sel, fn) => { host.querySelectorAll(sel).forEach((el) => { el.addEventListener('click', (ev) => { if (ev && ev.preventDefault) { ev.preventDefault(); } fn(el); }); }); };
    each('[data-act="iv-demo"]', () => {
      const demo = self.plugin.demoAnswers();
      self.plugin.ui.ivAnswers = demo.slice();
      host.querySelectorAll('textarea[data-q]').forEach((el) => { const i = Number(el.getAttribute('data-q')) - 1; el.value = demo[i] || ''; });
      new Notice('已填入样例答案：可以逐条改成你自己的');
    });
    each('[data-act="iv-build"]', async () => {
      const answers = [];
      host.querySelectorAll('textarea[data-q]').forEach((el) => { answers[Number(el.getAttribute('data-q')) - 1] = el.value; });
      self.plugin.ui.ivAnswers = answers.slice();
      await self.plugin.buildInterview(answers);
      rerender();
    });
    each('[data-act="iv-save"]', async () => {
      const answers = [];
      host.querySelectorAll('textarea[data-q]').forEach((el) => { answers[Number(el.getAttribute('data-q')) - 1] = el.value; });
      self.plugin.ui.ivAnswers = answers.slice();
      const r = await self.plugin.saveDraft(answers);
      self.plugin.ui.ivResult = r.ok ? { ok: false, saved: true, filled: r.filled } : { ok: false, error: r.error };
      rerender();
    });
    each('[data-act="open-license"]', () => { self.plugin.openLicense(); });
    each('[data-act="copy-code-path"]', () => { new Notice('兑换码由卖家发给你（SB- 开头）。填法：设置 → 人生决策树 → 兑换码 → 粘贴 → 保存', 9000); });
    each('[data-act="iv-open-tree"]', async () => { await self.plugin.activateView(); });
    each('[data-act="iv-open-memory"]', async () => { await self.plugin.activateMemory(); });
  }
}

class LdtMemoryView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return MEMORY_TYPE; }
  getDisplayText() { return '三层记忆'; }
  getIcon() { return 'layers'; }
  async onOpen() { await this.renderMemory(); }
  async renderMemory() {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host) { return; }
    host.empty();
    host.addClass('ldt-view');
    const layers = await this.plugin.loadMemory();
    const model = await this.plugin.loadModelData();
    const ob = null; // 观察模式 UI 已隐藏；不再每次渲染读两个文件（2026-11-11）
    host.innerHTML = this.plugin.memoryShellHtml(layers, model, ob);
    if (typeof host.querySelectorAll !== 'function') { return; }
    const self = this;
    const rerender = () => { self.renderMemory(); };
    const each = (sel, fn) => { host.querySelectorAll(sel).forEach((el) => { el.addEventListener('click', (ev) => { if (ev && ev.preventDefault) { ev.preventDefault(); } fn(el); }); }); };
    each('[data-act="mem-reload"]', rerender);
    each('[data-exp]', (el) => { self.plugin.toggleExpand(el.getAttribute('data-exp')); rerender(); });
    each('[data-edit]', (el) => { self.plugin.ui.memEdit = { id: el.getAttribute('data-edit'), layer: el.getAttribute('data-layer') }; rerender(); });
    each('[data-act="mem-cancel"]', () => { self.plugin.ui.memEdit = null; rerender(); });
    each('[data-act="mem-save"]', async (el) => {
      const id = el.getAttribute('data-id');
      const ta = host.querySelector('textarea[data-mem-ta="' + id + '"]');
      await self.plugin.saveMemoryItem(el.getAttribute('data-layer'), id, ta ? ta.value : '');
      rerender();
    });
    each('[data-del]', async (el) => { await self.plugin.deleteMemoryL1(el.getAttribute('data-del')); rerender(); });
    each('[data-restore]', async (el) => { await self.plugin.restoreMemoryL1(el.getAttribute('data-restore')); rerender(); });
    each('[data-act="privacy-policy"]', () => { self.plugin.ui.policy = !self.plugin.ui.policy; rerender(); });
    each('[data-act="privacy-close"]', () => { self.plugin.ui.policy = false; rerender(); });
    each('[data-act="open-license"]', () => { self.plugin.openLicense(); });
    each('[data-act="copy-code-path"]', () => { new Notice('兑换码由卖家发给你（SB- 开头）。填法：设置 → 人生决策树 → 兑换码 → 粘贴 → 保存', 9000); });
    each('[data-act="export-all"]', async () => { await self.plugin.exportAll(); rerender(); });
    each('[data-act="purge-all"]', async () => { await self.plugin.purgeAll(); rerender(); });
    each('[data-act="mem-tab"]', () => { self.plugin.ui.memTab = 'mem'; rerender(); });
    each('[data-act="diag-tab"]', () => { self.plugin.ui.memTab = 'diag'; rerender(); });
    each('[data-act="open-tree"]', async () => { await self.plugin.activateView(); });
    this.plugin.bindPageNav(host);
  }
}

class LdtSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const c = this.containerEl;
    c.empty();
    c.createEl('h2', { text: '人生决策树设置' });
    new Setting(c)
      .setName('从这里开始')
      .setDesc('找不到入口时，用这三个按钮；Ribbon 图标与状态栏「人生决策树」也能打开')
      .addButton((b) => b.setButtonText('打开决策树').setCta().onClick(() => { this.plugin.activateView(); }))
      .addButton((b) => b.setButtonText('答 15 题').onClick(() => { this.plugin.activateInterview(); }))
      .addButton((b) => b.setButtonText('资产库').onClick(() => { this.plugin.activateAssets(); }));
    new Setting(c)
      .setName('AI 增强 Key（DeepSeek，可选）')
      .setDesc('只存本机；不填也能用（走「复制指令到外部 AI」）。填入后命令面板可跑「测试 AI 增强」')
      .addText((t) => t
        .setPlaceholder('粘贴你的 Key（约 35 位）')
        .setValue(this.plugin.settings.deepseekKey || '')
        .onChange(async (v) => { this.plugin.settings.deepseekKey = String(v || '').trim(); await this.plugin.savePluginData(); }));
    new Setting(c)
      .setName('兑换码（购买后填入）')
      .setDesc('SB- 开头；填入有效码后解锁全部关卡；无效码不会保存')
      .addText((t) => t
        .setPlaceholder('SB-XXXXXX-XXXXXX-…')
        .setValue(this.plugin.settings.license || '')
        .onChange(async (v) => {
          const code = String(v || '').trim();
          if (!code) { this.plugin.settings.license = ''; await this.plugin.savePluginData(); return; }
          const res = require(this.plugin.pluginRoot() + '/lib/license.js').verify(code);
          if (res.ok) { this.plugin.settings.license = code; await this.plugin.savePluginData(); new Notice('已激活：' + res.id); }
          else { new Notice('兑换码无效（未保存）：' + res.error); }
        }));
    new Setting(c)
      .setName('共享破局策略（脱敏，默认关）')
      .setDesc('开启后只在本机记录关卡/类型/结果，用于以后提示「同关卡最高频卡点」；不含任何原文')
      .addToggle((t) => t.setValue(this.plugin.settings.shareStrategy === true).onChange(async (v) => { this.plugin.settings.shareStrategy = v === true; await this.plugin.savePluginData(); }));
    new Setting(c)
      .setName('体验版边界（demoStrict）')
      .setDesc('off＝现状（体验版也能生成正式树）；draft＝只能出草稿；once＝可生成 1 次，之后只出草稿')
      .addDropdown((d) => d.addOptions({ off: 'off（现状）', draft: 'draft（只出草稿）', once: 'once（1 次体验）' }).setValue(this.plugin.settings.demoStrict || 'off').onChange(async (v) => { this.plugin.settings.demoStrict = v; await this.plugin.savePluginData(); }));
    new Setting(c)
      .setName('装不上／用不了？')
      .setDesc('点一下自检，把结果整段发给卖家，比截屏快')
      .addButton((b) => b.setButtonText('运行自检').onClick(async () => { await this.plugin.doctorReport(); }));
    new Setting(c)
      .setName('模型文件路径（相对库根）')
      .setDesc('默认 ' + DEFAULT_MODEL_PATH + '；由 tools/import-model.cjs 或手工粘贴的 person-model JSON 生成')
      .addText((t) => t
        .setPlaceholder(DEFAULT_MODEL_PATH)
        .setValue(this.plugin.settings.modelPath || '')
        .onChange(async (v) => {
          this.plugin.settings.modelPath = String(v || '').trim();
          await this.plugin.savePluginData();
          new Notice('已保存模型路径');
        }));
  }
}

class LdtAssetsView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return ASSETS_TYPE; }
  getDisplayText() { return '资产库'; }
  getIcon() { return 'library'; }
  async onOpen() { await this.renderAssets(); }
  async renderAssets() {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host) { return; }
    host.empty();
    host.addClass('ldt-view');
    const model = await this.plugin.loadModelData();
    const memory = await this.plugin.loadMemory();
    const packGot = await this.plugin.loadAssetsPack();
    const pack = (packGot && !packGot.error && packGot.pack) ? packGot.pack : null;
    const packBuilt = this.plugin.buildAssetsPage(packGot);
    const packHtml = packBuilt && packBuilt.html ? '<div class="ldt-packsec">' + packBuilt.html + '</div>' : '';
    const built = PAGEA.buildGroupsHtml({ model: model, memory: memory, detailId: (this.plugin.ui && this.plugin.ui.assetDetail) || null, pack: pack, packHtml: packHtml, current: { diff: this.plugin.settings && this.plugin.settings.mapDiff, arch: this.plugin.settings && this.plugin.settings.mapArch } });
    host.innerHTML = this.plugin.pageShellHtml({ title: '资产库', sub: '我是谁 · 个人模型 + 履历蒸馏 · 点卡进次级页', tab: 'assets', pill: '资产库', html: built.html, stats: { cards: (built.stats && built.stats.nodes) || 0, unverified: 0 } });
    const self = this;
    const each = (sel, fn) => { if (typeof host.querySelectorAll !== 'function') { return; } host.querySelectorAll(sel).forEach((el) => { el.addEventListener('click', (ev) => { if (ev && ev.preventDefault) { ev.preventDefault(); } fn(el); }); }); };
    each('[data-act="asset-open"]', (el) => { self.plugin.ui.assetDetail = el.getAttribute('data-id'); self.renderAssets(); });
    each('[data-act="asset-back"]', () => { self.plugin.ui.assetDetail = null; self.renderAssets(); });
    each('[data-act="identity-adopt"]', async () => { await self.plugin.adoptIdentity(self); });
    each('[data-act="assets-filter"]', (el) => { self.plugin.toggleAssetFilter(el.getAttribute('data-domain')); self.renderAssets(); });
    each('[data-act="skill-upgrade"]', async (el) => { await self.plugin.upgradeSkill(el.getAttribute('data-skill')); self.renderAssets(); });
    each('[data-act="skill-verify"]', async (el) => { await self.plugin.verifySkill(el.getAttribute('data-skill')); self.renderAssets(); });
    this.plugin.bindPageNav(host);
    this.plugin.enterImmersive();
  }
}

class LdtAiView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return AI_TYPE; }
  getDisplayText() { return 'AI · 会客厅与智囊团'; }
  getIcon() { return 'sparkles'; }
  async onOpen() { await this.renderAi(); }
  async renderAi() {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host) { return; }
    host.empty();
    host.addClass('ldt-view');
    const key = String((this.plugin.settings && this.plugin.settings.deepseekKey) || '').trim();
    const built = PAGEA_AI.buildAiHtml({ tab: this.plugin.ui.aiTab || 'salon', hasKey: !!key, state: this.plugin.ui });
    host.innerHTML = '<div class="ldt-shell"><div class="ldt-pagehead"><div class="ldt-topbar"><div class="ldt-brand"><span class="ldt-logo">✨</span><div><div class="ldt-title">AI · 思想会客厅与人生智囊团</div><div class="ldt-sub">用你的资产与人物模型说话；只发结构化摘要，不传整库</div></div></div>'
      + '<div class="ldt-actions"><span class="ldt-pill" data-act="ai-back">← 回资产库</span><span class="ldt-pill" data-act="ai-goto-model">⚙ 模型连接</span></div></div></div>'
      + '<div class="ldt-body single"><div class="ldt-canvas">' + built.html + '</div></div>'
      + '<div class="ldt-statusbar"><span>' + (this.plugin.ui.aiTab === 'cabinet' ? '人生智囊团' : '思想会客厅') + '</span><span class="ldt-spacer"></span><span>' + (key ? '已接入模型' : '未接入模型') + ' · 本地摘要</span></div>'
      + '</div>';
    const self = this;
    const each = (sel, fn) => { if (typeof host.querySelectorAll !== 'function') { return; } host.querySelectorAll(sel).forEach(function (el) { el.addEventListener('click', function (ev) { if (ev && ev.preventDefault) { ev.preventDefault(); } fn(el); }); }); };
    each('[data-act="ai-back"]', function () { self.plugin.ui.aiOpen = false; self.plugin.activateAssets(); });
    each('[data-act="ai-goto-model"]', function () { self.plugin.openModelPanel(); });
    each('[data-act="ai-tab"]', function (el) { self.plugin.ui.aiTab = el.getAttribute('data-tab') === 'cabinet' ? 'cabinet' : 'salon'; self.renderAi(); });
    each('[data-act="ai-topic"]', function (el) { self.plugin.ui.salon = Object.assign({}, self.plugin.ui.salon, { topic: el.getAttribute('data-topic') || '' }); self.renderAi(); });
    each('[data-act="ai-salon-run"]', function () { self.plugin.runSalon(self); });
    each('[data-act="ai-cabinet-run"]', function () { self.plugin.runCabinet(self); });
    each('[data-act="ai-adv"]', function (el) { self.plugin.askAdvisor(el.getAttribute('data-adv'), self); });
    const inp = (typeof host.querySelector === 'function') ? host.querySelector('[data-act="ai-topic-input"]') : null;
    if (inp) { inp.addEventListener('input', function () { self.plugin.ui.salon = Object.assign({}, self.plugin.ui.salon, { topic: inp.value }); }); }
    if (typeof dispatchEvent === 'function') { try { window.dispatchEvent(new Event('ldt-ai-rendered')); } catch (e) { } }
    this.plugin.enterImmersive();
  }
}

class LdtCasesView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return CASES_TYPE; }
  getDisplayText() { return '破局推演'; }
  getIcon() { return 'layers'; }
  async onOpen() { await this.renderCases(); }
  async renderCases() {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host) { return; }
    host.empty();
    host.addClass('ldt-view');
    const got = await this.plugin.loadCases();
    let caseLevels = [];
    try { const pg = await this.plugin.loadAssetsPack(); caseLevels = (pg && pg.pack && Array.isArray(pg.pack.levels)) ? pg.pack.levels : []; } catch (e) { }
    const built = PAGEC.buildCasesHtml({ raw: got.raw, error: got.error, index: this.plugin.ui.caseIndex || 0, levels: caseLevels });
    host.innerHTML = this.plugin.pageShellHtml({ title: '破局推演', sub: '为什么做 / 怎么做 · 案例卡与分支风险收益', tab: 'cases', pill: '破局推演', html: built.html, stats: { cards: built.cases.length, unverified: built.cases.filter(function (c) { return c.status !== 'verified'; }).length } });
    const self = this;
    const each = (sel, fn) => { if (typeof host.querySelectorAll !== 'function') { return; } host.querySelectorAll(sel).forEach((el) => { el.addEventListener('click', (ev) => { if (ev && ev.preventDefault) { ev.preventDefault(); } fn(el); }); }); };
    each('[data-act="case-pick"]', (el) => { self.plugin.ui.caseIndex = Number(el.getAttribute('data-i')) || 0; self.renderCases(); });
    each('[data-act="case-to-level"]', async (el) => { await self.plugin.caseToLevel(el.getAttribute('data-case'), self); });
    each('[data-act="case-seed3"]', async () => { await self.plugin.seedSampleCases(); await self.renderCases(); });
    each('[data-act="case-prompt"]', async (el) => { await self.plugin.casePrompt(el.getAttribute('data-case')); });
    this.plugin.bindPageNav(host);
    this.plugin.enterImmersive();
  }
}

class LdtImportView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return IMPORT_TYPE; }
  getDisplayText() { return '导入更新'; }
  getIcon() { return 'download'; }
  async onOpen() { await this.renderImport(); }
  async renderImport() {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host) { return; }
    const keep = this.containerEl.querySelector ? this.containerEl.querySelector('.ldt-import-ta') : null;
    const typed = keep ? keep.value : (this.plugin.ui.importText || '');
    host.empty();
    host.addClass('ldt-view');
    const st = this.plugin.ui.importState || { state: 'empty' };
    const built = PAGEI.buildImportHtml(Object.assign({ text: typed }, st));
    host.innerHTML = this.plugin.pageShellHtml({ title: '导入更新', sub: '七码校验 → 看差异 → 确认合并 · 只写本地', tab: 'import', pill: '导入更新', html: built.html, stats: null });
    const self = this;
    const each = (sel, fn) => { if (typeof host.querySelectorAll !== 'function') { return; } host.querySelectorAll(sel).forEach((el) => { el.addEventListener('click', (ev) => { if (ev && ev.preventDefault) { ev.preventDefault(); } fn(el); }); }); };
    if (typeof host.querySelectorAll === 'function') {
      host.querySelectorAll('[data-act="import-text"]').forEach((el) => { el.addEventListener('input', () => { self.plugin.ui.importText = el.value; }); });
    }
    each('[data-act="import-validate"]', () => { self.plugin.ui.importText = self.currentText(host); self.plugin.validateImport().then(() => self.renderImport()); });
    each('[data-act="import-merge"]', () => { self.plugin.mergeImport().then(() => self.renderImport()); });
    each('[data-act="import-goto-assets"]', () => { self.plugin.activateAssets(); });
    this.plugin.bindPageNav(host);
    this.plugin.enterImmersive();
  }
  currentText(host) { const el = host.querySelector ? host.querySelector('.ldt-import-ta') : null; return el ? el.value : (this.plugin.ui.importText || ''); }
}

const LDT_BTNS = '<span class="ldt-pill btool" data-act="brain-model">⚙ 模型连接</span>'
  + '<span class="ldt-pill btool" data-act="brain-guide">▤ 使用教程</span>'
  + '<span class="ldt-pill btool" data-act="brain-version">◈ 人生决策树 v0.1.24</span>'
  + '<span class="ldt-pill btool" data-act="brain-search-open">⌕ 搜索</span>'
  + '<span class="ldt-pill btool" data-act="brain-switch">⇄ 切换</span>';

function tabsBarHtml(active) {
  const TABS = [['assets', '资产库'], ['levels', '工作台'], ['cases', '破局推演'], ['brain', '第二大脑']];
  return '<div class="ldt-tabs">' + TABS.map(function (t) {
    return '<span class="ldt-tab' + (active === t[0] ? ' is-active' : '') + '" role="tab" aria-selected="' + (active === t[0] ? 'true' : 'false') + '" tabindex="0" data-act="nav-' + t[0] + '">' + t[1] + '</span>';
  }).join('') + '</div>';
}
class LdtBrainView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return BRAIN_TYPE; }
  getDisplayText() { return '第二大脑'; }
  getIcon() { return 'brain'; }
  async onOpen() { await this.renderBrain(); this.plugin.enterImmersive(); }
  async onClose() { this.plugin.exitImmersive(); }
  async renderBrain() {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host) { return; }
    host.empty();
    host.addClass('ldt-view');
    const cards = await this.plugin.loadBrainCards();
    const ui = this.plugin.ui || {};
    const html = BRAIN.renderHtml({ cards: cards, sub: ui.brainSub || 'shelf', query: ui.brainQuery || '', current: ui.brainCurrent || '', font: ui.brainFont || 'normal' });
    host.innerHTML = this.plugin.pageShellHtml({ title: '第二大脑', sub: '知识卡 · 九段 · 内容寻址 · 数据在 .mysb/', tab: 'brain', pill: '第二大脑', html: html });
    const self = this;
    const each = (sel, fn) => { if (typeof host.querySelectorAll !== 'function') { return; } host.querySelectorAll(sel).forEach((el) => { el.addEventListener('click', (ev) => { if (ev && ev.preventDefault) { ev.preventDefault(); } fn(el); }); }); };
    ['shelf', 'map', 'search', 'reader'].forEach((id) => {
      each('[data-act="brain-sub-' + id + '"]', () => { self.plugin.ui.brainSub = id; self.renderBrain(); });
    });
    each('[data-act="brain-card"]', (el) => { self.plugin.ui.brainCurrent = el.getAttribute('data-id'); self.plugin.ui.brainSub = 'reader'; self.renderBrain(); });
    each('[data-act="brain-model"]', () => { self.plugin.openModelPanel(); });
    each('[data-act="brain-guide"]', () => { self.plugin.openGuidePanel(); });
    each('[data-act="brain-version"]', () => { self.plugin.openVersionPanel(); });
    each('[data-act="brain-search-open"]', () => { self.plugin.openGlobalSearch(); });
    each('[data-act="brain-switch"]', (el) => { self.plugin.openSwitchMenu(el); });
    const inp = (typeof host.querySelector === 'function') ? host.querySelector('[data-act="brain-input"]') : null;
    if (inp) {
      inp.addEventListener('change', (ev) => { self.plugin.ui.brainQuery = String((ev && ev.target && ev.target.value) || inp.value || ''); self.renderBrain(); });
      inp.addEventListener('keydown', (ev) => { if (ev && ev.key === 'Enter') { self.plugin.ui.brainQuery = String(inp.value || ''); self.renderBrain(); } });
    }
    this.plugin.bindPageNav(host);
  }
}

const PAGE_CTORS = { tree: LdtTreeView, levels: LdtLevelsView, memory: LdtMemoryView, assets: LdtAssetsView, cases: LdtCasesView, import: LdtImportView, brain: LdtBrainView };
const PAGE_RENDER = { tree: 'renderModel', levels: 'renderMap', memory: 'renderMemory', assets: 'renderAssets', cases: 'renderCases', import: 'renderImport', brain: 'renderBrain' };
const TAB_OF_TYPE = {};
TAB_OF_TYPE[VIEW_TYPE] = 'assets'; TAB_OF_TYPE[LEVELS_TYPE] = 'levels'; TAB_OF_TYPE[MEMORY_TYPE] = 'memory';
TAB_OF_TYPE[ASSETS_TYPE] = 'assets'; TAB_OF_TYPE[CASES_TYPE] = 'cases'; TAB_OF_TYPE[IMPORT_TYPE] = 'import'; TAB_OF_TYPE[BRAIN_TYPE] = 'brain';

/* 地基重构：单一容器视图。点页签只换容器里的内容，不 setViewState、不开新标签页、不动侧栏。 */
class LdtAppView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.tab = 'assets'; }
  getViewType() { return APP_TYPE; }
  getDisplayText() { return '人生决策树'; }
  getIcon() { return 'list-tree'; }
  async onOpen() {
    this.plugin.enterImmersive();
    const p = this.plugin;
    try {
      if (typeof this.addAction === 'function') {
        this.addAction('settings', '模型连接', function () { p.openModelPanel(); });
        this.addAction('book-open', '使用教程', function () { p.openGuidePanel(); });
        this.addAction('info', '人生决策树 v0.1.24', function () { p.openVersionPanel(); });
        this.addAction('search', '搜索', function () { p.openGlobalSearch(); });
        this.addAction('arrow-right-left', '切换', function () { p.openSwitchMenu(null); });
      }
    } catch (e) { }
    return this.showPage(this.normTab(this.tab));
  }
  async onClose() { this.plugin.exitImmersive(); }
  getState() { return { tab: this.normTab(this.tab) }; }
  normTab(t) { return (t && t !== 'tree' && PAGE_CTORS[t]) ? t : 'assets'; }  // 2026-11-14：旧决策树页并入资产库，任何 tree 一律归资产库
  async setState(state) { this.tab = this.normTab(state && state.tab); if (this.containerEl) { await this.showPage(this.tab); } }
  hostEl() { return (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl; }
  async showPage(tab) {
    const id = this.normTab(tab);
    this.tab = id;
    const host = this.hostEl();
    if (!host) { return { ok: false, code: 'NO_HOST' }; }
    host.empty();
    host.addClass('ldt-view');
    if (this.plugin.ui && this.plugin.ui.aiOpen && id !== 'assets') { this.plugin.ui.aiOpen = false; }
    if (this.plugin.ui && this.plugin.ui.aiOpen) {
      try {
        const ai = Object.create(LdtAiView.prototype);
        ai.plugin = this.plugin; ai.app = this.app; ai.leaf = this.leaf;
        ai.containerEl = { children: [null, host] };
        await ai.renderAi();
        return { ok: true, tab: 'ai' };
      } catch (eAi) { host.innerHTML = '<div class="ldt-brain-empty">AI 页渲染失败：' + String((eAi && eAi.message) || eAi) + '</div>'; return { ok: false, error: String(eAi) }; }
    }
    try {
      // 关键：不要 new ItemView（它会在叶子里再造一套 view-header，每点一次多一个框）；
      // 用原型副本，只借页面类的渲染方法，容器指向共享 host。
      const page = Object.create(PAGE_CTORS[id].prototype);
      page.plugin = this.plugin;
      page.app = this.app;
      page.leaf = this.leaf;
      page._appPage = true;
      page.containerEl = { children: [null, host] };
      await page[PAGE_RENDER[id]]();
      return { ok: true, tab: id };
    } catch (e) {
      host.innerHTML = '<div class="ldt-brain-empty">页面渲染失败：' + String((e && e.message) || e) + '</div>';
      return { ok: false, tab: id, error: String((e && e.message) || e) };
    }
  }
}

class LdtPlugin extends Plugin {
  async onload() {
    this.ui = { aiTab: 'salon', salon: { topic: '', out: '', hist: [] }, cabinet: { out: '' }, drawer: null, exportCheck: null, memExpand: [], memEdit: null, memTab: 'mem', policy: false, purgeArmed: false, lastExport: null, ivResult: null, ivAnswers: [] };
    this.settings = Object.assign({ modelPath: '', mapArch: 'pipeline', mapDiff: 'standard', demo: false, shareStrategy: false, license: '', soldCount: 0, deepseekKey: '', demoStrict: 'once', demoUsed: false, onboarded: false }, await this.loadData());
    TREE = require(this.pluginRoot() + '/lib/tree-view.js');
    LEVELS = require(this.pluginRoot() + '/lib/level-view.js');
    PAGEA = require(this.pluginRoot() + '/lib/page-assets.js');
    PAGEC = require(this.pluginRoot() + '/lib/page-cases.js');
    CASEP = require(this.pluginRoot() + '/lib/case-prompt.js');
    AICALL = require(this.pluginRoot() + '/lib/ai-call.js');
    NEWT = require(this.pluginRoot() + '/lib/new-tree.js');
    PAGEI = require(this.pluginRoot() + '/lib/page-import.js');
    PAGEA_AI = require(this.pluginRoot() + '/lib/page-ai.js');
    DIFF = require(this.pluginRoot() + '/lib/import-diff.js');
    SHELL = require(this.pluginRoot() + '/lib/ui-shell.js');
    BRAIN = require(this.pluginRoot() + '/lib/page-brain.js');
    BRAIN_GEN = require(this.pluginRoot() + '/lib/brain-gen.js');
    HERO = require(this.pluginRoot() + '/lib/hero-stats.js');
    APPEND = require(this.pluginRoot() + '/lib/assets-append.js');
    PACK = require(this.pluginRoot() + '/lib/assets-pack.js');
    RUN = require(this.pluginRoot() + '/lib/run-model.js');
    VERIFY = require(this.pluginRoot() + '/lib/verify.js');
    FEEDBACK = require(this.pluginRoot() + '/lib/feedback.js');
    STRATEGY = require(this.pluginRoot() + '/lib/strategy.js');
    EXPORT = require(this.pluginRoot() + '/lib/export-check.js');
    LICENSE = require(this.pluginRoot() + '/lib/license.js');
    PB = require(this.pluginRoot() + '/lib/provider-b.js');
    MEM = require(this.pluginRoot() + '/lib/memory-layers.js');
    DIAG = require(this.pluginRoot() + '/lib/diagnosis.js');
    OBS = require(this.pluginRoot() + '/lib/observe.js');
    PRIV = require(this.pluginRoot() + '/lib/privacy.js');
    IV = require(this.pluginRoot() + '/lib/interview.js');
    ONB = require(this.pluginRoot() + '/lib/onboarding.js');
    DEMO = require(this.pluginRoot() + '/lib/demo-policy.js');
    UP = require(this.pluginRoot() + '/lib/upgrade.js');
    DOC = require(this.pluginRoot() + '/lib/doctor.js');
    this.registerView(VIEW_TYPE, (leaf) => new LdtTreeView(leaf, this));
    this.registerView(LEVELS_TYPE, (leaf) => new LdtLevelsView(leaf, this));
    this.registerView(ASSETS_TYPE, (leaf) => new LdtAssetsView(leaf, this));
    this.registerView(CASES_TYPE, (leaf) => new LdtCasesView(leaf, this));
    this.registerView(IMPORT_TYPE, (leaf) => new LdtImportView(leaf, this));
    this.registerView(MEMORY_TYPE, (leaf) => new LdtMemoryView(leaf, this));
    this.registerView(INTERVIEW_TYPE, (leaf) => new LdtInterviewView(leaf, this));
    this.registerView(BRAIN_TYPE, (leaf) => new LdtBrainView(leaf, this));
    this.registerView(AI_TYPE, (leaf) => new LdtAiView(leaf, this));
    this.registerView(APP_TYPE, (leaf) => new LdtAppView(leaf, this));
    this.addRibbonIcon('list-tree', '人生决策树 · 打开', () => { this.activateView(); });

    try {
      this.app.workspace.onLayoutReady(() => {
        try {
          this.statusBar = this.addStatusBarItem();
          this.statusBar.setText('人生决策树');
          this.statusBar.addClass('mod-clickable');
          this.statusBar.setAttribute('aria-label', '打开人生决策树 · 点击打开');
          this.statusBar.addEventListener('click', () => { this.activateView(); });
        } catch (e2) { /* 状态栏不可用不阻塞 */ }
        try { this.repairStaleLeaves(); } catch (e4) { }
      this.heroStats().then((s) => { this._heroPrev = s; }).catch(() => { });
        try { if (!this.settings.onboarded) { this.showWelcome(); } } catch (e) { }
      });
    } catch (e) { /* 无 onLayoutReady 的环境不阻塞 */ }
    this.addCommand({ id: 'open-tree', name: '打开决策树视图', callback: () => { this.activateAssets(); } });
    this.addCommand({ id: 'reload-model', name: '重新读取本地模型', callback: () => { this.refreshViews(); } });
    this.addCommand({ id: 'open-levels', name: '打开关卡地图', callback: () => { this.activateLevels(); } });
    this.addCommand({ id: 'open-assets', name: '打开资产库', callback: () => { this.activateAssets(); } });
    this.addCommand({ id: 'open-ai', name: '打开 AI（会客厅 / 智囊团）', callback: () => { this.activateAiView(); } });
    this.addCommand({ id: 'ui-dump', name: '诊断：导出当前页结构与 AI 页自检', callback: () => { this.dumpUi(); } });
    this.addCommand({ id: 'ai-smoke', name: '诊断：跑一次思想会客厅（真调模型）', callback: () => { this.aiSmoke('先补哪条证据'); } });
    this.addCommand({ id: 'open-cases', name: '打开案例透视', callback: () => { this.activateCases(); } });
    this.addCommand({ id: 'open-import', name: '打开导入更新', callback: () => { this.activateImport(); } });
    this.addCommand({ id: 'open-brain', name: '打开第二大脑', callback: () => { this.activateBrain(); } });
    this.addCommand({ id: 'scan-brain', name: '扫描人生决策树内容 → 知识卡', callback: () => { this.scanBrain(); } });
    this.addCommand({ id: 'ui-selfcheck', name: '诊断：界面自检（写 .ldt/ui-selfcheck.json）', callback: () => { this.runSelfCheck(); } });
    this.addCommand({ id: 'back-to-main', name: '回到主窗（关闭新窗口并打开决策树）', callback: async () => {
      try {
        const ws = this.app.workspace;
        (ws.getLeavesOfType(LEVELS_TYPE) || []).forEach((l) => { if (l && l.getRoot && l.getRoot() !== ws.rootSplit) { try { l.detach(); } catch (e) { } } });
        await this.activateView();
        new Notice('已回到主窗', 3000);
      } catch (e) { new Notice('回到主窗失败：' + ((e && e.message) || e)); }
    } });
    this.addCommand({ id: 'immersive-sidebar', name: '沉浸（收起 / 展开左右侧栏）', callback: () => {
      try {
        const ws = this.app.workspace;
        let done = 0;
        ['leftSplit', 'rightSplit'].forEach((k) => {
          const sp = ws[k];
          if (!sp) { return; }
          try { if (sp.collapsed) { sp.expand(); } else { sp.collapse(); } done += 1; } catch (e) { }
        });
        new Notice(done ? '已切换侧栏（左/右）' : '当前版本不支持自动收起侧栏，可按 F11 全屏', 4000);
      } catch (e) { new Notice('切换侧栏失败：' + ((e && e.message) || e)); }
    } });
    this.addCommand({ id: 'immersive-window', name: '在新窗口打开（可拖动 / 可缩放）', callback: () => { this.openPopout(); } });
    this.addCommand({ id: 'toggle-immersive', name: '沉浸模式（隐藏/恢复左右侧栏）', callback: () => { const r = this.toggleImmersive(); new Notice(r.immersive ? '已进入沉浸模式（侧栏已收起）' : '已退出沉浸模式（侧栏已恢复）', 4000); } });
    this.addCommand({ id: 'enter-demo', name: '进入体验版（数据隔离）', callback: async () => { await this.enterDemo(); } });
    this.addCommand({ id: 'test-provider-b', name: '测试 AI 增强（DeepSeek 真调用）', callback: async () => { await this.testProviderB(); } });
    this.addCommand({ id: 'export-hint', name: '导出数据（先看脱敏检查）', callback: async () => { this.ui.exportCheck = { open: true, checked: {} }; await this.activateLevels(); this.refreshViews(); } });
    this.addCommand({ id: 'open-memory', name: '打开三层记忆', callback: async () => { await this.activateMemory(); } });
    this.addCommand({ id: 'open-interview', name: '访谈入库（15 题，生成我的树）', callback: async () => { await this.activateInterview(); } });
    this.addCommand({ id: 'doctor', name: '自检（复制结果给卖家）', callback: async () => { await this.doctorReport(); } });
    this.addCommand({ id: 'export-all', name: '一键导出（全部节点，先脱敏）', callback: async () => { await this.exportAll(); } });
    this.addCommand({ id: 'purge-all', name: '删除我的数据（清空本地库）', callback: async () => { await this.purgeAll(); } });
    this.addSettingTab(new LdtSettingTab(this.app, this));
  }
  onunload() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => { leaf.detach(); });
    this.app.workspace.getLeavesOfType(LEVELS_TYPE).forEach((leaf) => { leaf.detach(); });
    this.app.workspace.getLeavesOfType(MEMORY_TYPE).forEach((leaf) => { leaf.detach(); });
    this.app.workspace.getLeavesOfType(INTERVIEW_TYPE).forEach((leaf) => { leaf.detach(); });
  }
  pluginRoot() {
    const ad = this.app && this.app.vault && this.app.vault.adapter;
    const base = ad && typeof ad.getBasePath === 'function' ? ad.getBasePath() : '';
    const d = (this.manifest && this.manifest.dir) || '';
    if (/^[A-Za-z]:[\\/]/.test(d)) { return d; }
    if (base) { return base + '/' + (d || (this.app.vault.configDir || '.obsidian') + '/plugins/' + this.manifest.id); }
    return process.cwd() + '/plugin';
  }
  // 关卡地图外壳：顶栏 + 标签条 + 地图 + 状态条
  mapShellHtml(loaded, model) {
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]));
    const st = loaded.stats || { levels: 0, done: 0, archetype: 'pipeline', difficulty: 'standard' };
    const nameOf = (id, list) => { const f = (list || []).filter((x) => x.id === id)[0]; return f ? f.name : id; };
    const archName = st.archName || nameOf(st.archetype, []);
    const diffName = st.diffName || nameOf(st.difficulty, []);
    const p = [];
    p.push('<div class="ldt-shell">');
    p.push('<div class="ldt-topbar"><div class="ldt-brand"><span class="ldt-logo">◈</span><div><div class="ldt-title">我的决策树' + (loaded && loaded.sample ? ' <span style="font-size:11px;color:var(--ldt-inferred);border:1px solid var(--ldt-inferred);border-radius:6px;padding:0 4px">样例·未入库</span>' : '') + '</div><div class="ldt-sub">职业骨架 · ' + (st.total || st.levels || 0) + ' 关 · 本地存储</div></div></div>');
    p.push('<div class="ldt-actions">' + (!this.isLicensed() ? '<span class="ldt-pill" data-act="license">未激活 · 填兑换码</span>' : (this.settings && this.settings.demo === true ? '<span class="ldt-pill" data-act="promote">体验版 · 升级</span>' : '')) + '' + LDT_BTNS + '</div></div>');
    p.push(tabsBarHtml('levels'));
    const mdl = model || {};
    const _nd = Array.isArray(mdl.nodes) ? mdl.nodes : [];
    const _br = Array.isArray(mdl.branches) ? mdl.branches : [];
    const _hd = Array.isArray(mdl.hidden_skills) ? mdl.hidden_skills : [];
    const _lk = _br.filter((b) => b && b.unlocked === false).length;
    const _cell = 'flex:1;min-width:0;background:var(--ldt-dlg);border:1px solid var(--ldt-line);border-radius:10px;padding:10px 14px';
    const _num = 'font:600 20px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--ldt-accent)';
    const _lb = 'font-size:12px;color:var(--ldt-muted);margin-top:2px';
    p.push('<div style="display:flex;gap:8px;margin:10px 14px 0">'
      + '<div style="' + _cell + '"><div style="' + _num + '">' + _nd.length + '</div><div style="' + _lb + '">节点</div></div>'
      + '<div style="' + _cell + '"><div style="' + _num + '">' + _br.length + '</div><div style="' + _lb + '">分支</div></div>'
      + '<div style="' + _cell + '"><div style="' + _num + '">' + _hd.length + '</div><div style="' + _lb + '">隐藏技能</div></div>'
      + '<div style="' + _cell + '"><div style="' + _num + ';color:var(--ldt-inferred)">' + _lk + '</div><div style="' + _lb + '">锁着分支</div></div>'
      + '</div>');
    const _h2 = 'display:flex;align-items:center;gap:8px;font-size:15px;margin:16px 14px 8px;color:var(--ldt-text)';
    const _bar = 'width:3px;height:14px;background:var(--ldt-accent);border-radius:2px;display:inline-block';
    const _entry = 'flex:1;min-width:0;background:var(--ldt-dlg);border:1px solid var(--ldt-line);border-radius:10px;padding:12px 14px';
    const _ico = 'width:22px;height:22px;border-radius:6px;background:rgba(46,230,168,.14);color:var(--ldt-accent);display:flex;align-items:center;justify-content:center;font-size:12px;margin-bottom:8px';
    p.push('<div style="' + _h2 + '"><i style="' + _bar + '"></i>主线关卡 <span style="color:var(--ldt-muted-2);font-size:12px;font-weight:400">备用 ' + _lk + ' 关／隐藏 ' + _hd.length + ' 项（默认不上图）</span></div>');
    p.push('<div class="ldt-body single"><div class="ldt-canvas">' + (loaded.ok ? loaded.html : '<div class="ldt-refusal"><b>⛔ 暂不生成</b><div>' + esc(loaded.refusal || '') + '</div></div>') + '</div></div>');
    p.push('<div class="ldt-statusbar"><span>' + st.levels + ' 关</span><span>已点亮 ' + (st.done || 0) + '</span><span>' + esc(archName) + ' · ' + esc(diffName) + '</span><span class="ldt-spacer"></span><span>本地骨架 · 不联网</span></div>');
    p.push('</div>');
    return p.join('');
  }
  async newTree() {
    const okGo = await this.confirmModal('新建一棵树？', '旧数据会先存到 .ldt/history/<时间>/，确认保存成功后才清空；资产库与案例保留。');
    if (!okGo) { return { ok: false, cancelled: true }; }
    const ad = this.app.vault.adapter;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = '.ldt/history/' + stamp;
    try { await ad.mkdir('.ldt/history'); } catch (e0) { }
    try { await ad.mkdir(dir); } catch (e1) { }
    const r = NEWT ? await NEWT.clearTree(ad, dir) : { ok: false, failed: ['NO_LIB'] };
    if (!r.ok) {
      new Notice('快照写入失败，已中止：什么都没删（失败件 ' + (r.failed || []).join('、') + '）。检查磁盘空间后重试', 12000);
      return { ok: false, error: 'SNAPSHOT_FAILED', failed: r.failed };
    }
    this._run = null; this._runRaw = null;
    if (this.ui) { this.ui.ivResult = null; this.ui.ivAnswers = []; }
    new Notice('已新建：旧数据存到 ' + dir + '（' + r.saved.length + ' 件），树与进度已清空', 9000);
    this.refreshViews();
    return { ok: true, snapshot: dir, saved: r.saved.length };
  }
  async updateNodeText(id, text) {
    const ad = this.app.vault.adapter;
    const p = this.modelPath();
    let raw = null;
    try { raw = await ad.read(p); } catch (e) { new Notice('读不到模型文件'); return { ok: false }; }
    let M = null;
    try { M = JSON.parse(raw); } catch (e) { new Notice('模型不是合法 JSON'); return { ok: false }; }
    const n = (M.nodes || []).filter(function (x) { return x.id === id; })[0];
    if (!n) { new Notice('找不到节点 ' + id); return { ok: false }; }
    try { await ad.write(p + '.bak-' + Date.now(), raw); } catch (e) { }
    const _t = String(text == null ? '' : text);
    if (_t.length > 120) { new Notice('这条太长，已截到 120 字保存', 5000); }
    n.text = _t.slice(0, 120);
    await ad.write(p, JSON.stringify(M, null, 1) + '\n');
    new Notice('已保存节点 ' + id, 4000);
    return { ok: true, node: id };
  }
  askText(title, hint) {
    return new Promise((resolve) => {
      try {
        const modal = new obsidian.Modal(this.app);
        modal.titleEl.setText(title);
        if (hint) { modal.contentEl.createEl('p', { text: hint }); }
        const ta = modal.contentEl.createEl('textarea');
        ta.rows = 4;
        ta.style.width = '100%';
        const row = modal.contentEl.createDiv();
        row.style.marginTop = '10px';
        row.style.display = 'flex';
        row.style.gap = '8px';
        let done = false;
        const finish = (v) => { if (done) { return; } done = true; modal.close(); resolve(v); };
        const ok = row.createEl('button', { text: '保存' });
        ok.addEventListener('click', () => finish(String(ta.value || '').trim() || null));
        const no = row.createEl('button', { text: '取消' });
        no.addEventListener('click', () => finish(null));
        modal.onClose = () => { if (!done) { done = true; resolve(null); } };
        modal.open();
      } catch (e) { resolve(null); }
    });
  }
  async writeAssetsPack(pack) {
    const ad = this.app.vault.adapter;
    const p = this.assetsPath();
    try { const raw = await ad.read(p); await ad.write(p + '.bak-' + Date.now(), raw); } catch (e) { }
    await ad.write(p, JSON.stringify(pack, null, 1) + '\n');
    return { ok: true };
  }
  async verifySkill(id) {
    const got = await this.loadAssetsPack();
    if (!got || got.error) { new Notice('资产包读不了'); return { ok: false }; }
    const pack = got.pack;
    const s = (pack.skills || []).filter(function (x) { return x.id === id; })[0];
    if (!s) { new Notice('找不到这张卡'); return { ok: false }; }
    if (s.status === 'verified') {
      const okOff = await this.confirmModal('改回「待核实」？', s.name + '：已核实的卡会变回红标，证据保留。');
      if (!okOff) { return { ok: false, cancelled: true }; }
      s.status = 'unverified';
      await this.writeAssetsPack(pack);
      new Notice('已改回待核实：' + s.name, 4000);
      return { ok: true, status: 'unverified' };
    }
    if (!Array.isArray(s.evidence) || !s.evidence.length) {
      new Notice('这张卡还没有证据：先用「验证升级」贴一条证据，再标核实（否则整页会判数据不合规）', 9000);
      return { ok: false, error: 'NO_EVIDENCE' };
    }
    const okGo = await this.confirmModal('标为已核实？', s.name + '：核实后红标消失，可在「验证升级」里继续加证据。');
    if (!okGo) { return { ok: false, cancelled: true }; }
    s.status = 'verified';
    s.verified_at = new Date().toISOString();
    await this.writeAssetsPack(pack);
    new Notice('已核实：' + s.name, 4000);
    return { ok: true, status: 'verified' };
    this.heroPing();
  }
  async upgradeSkill(id) {
    const got = await this.loadAssetsPack();
    if (!got || got.error) { new Notice('资产包读不了'); return { ok: false }; }
    const pack = got.pack;
    const s = (pack.skills || []).filter(function (x) { return x.id === id; })[0];
    if (!s) { new Notice('找不到这张卡'); return { ok: false }; }
    new Notice('验证升级：' + (s.upgrade_condition || '补一条新证据'), 5000);
    const text = await this.askText('验证升级 · ' + s.name, '贴一条新证据（一句话或链接）；保存后等级 +1，并转为已核实。');
    if (!text) { return { ok: false, cancelled: true }; }
    if (Number(s.level || 0) >= 5) { new Notice('这张卡已经满级（5 级），不用再升', 5000); return { ok: false, error: 'MAX_LEVEL' }; }
    s.evidence = Array.isArray(s.evidence) ? s.evidence : [];
    s.evidence.push(String(text).slice(0, 200));
    s.level = Math.min(5, Number(s.level || 0) + 1);
    s.status = 'verified';
    s.upgrade_condition = s.level >= 5 ? '已满级；如要再升，先拆出新证据方向' : '再提供一条新证据（现状：' + s.level + ' 级）即可升级';
    await this.writeAssetsPack(pack);
    new Notice('已升级：' + s.name + ' → 等级 ' + s.level, 5000);
    return { ok: true, level: s.level };
    this.heroPing();
  }
  async runSalon(view) {
    const q = String((this.ui.salon && this.ui.salon.topic) || '').trim();
    if (!q) { new Notice('先选一个议题，或自己写一个'); return { ok: false, code: 'NO_TOPIC' }; }
    this.ui.salon = Object.assign({}, this.ui.salon, { out: '圆桌开始了：四位角色正在读你的证据与红线…' });
    if (view && view.renderAi) { await view.renderAi(); }
    const ctx = await this.aiContext();
    const prompt = '你是「思想会客厅」的圆桌主持人。\n议题：' + q + '\n我的资料：\n' + ctx
      + '\n\n四位角色依次发言（每人 2–3 句，必须引用我资料里的 1 个具体编号，例如 E-001/S-002/R-001/P-002）：\n'
      + '① 现实主义者：只看证据与时间，这件事现在能不能做\n'
      + '② 风险官：最坏坏到哪一步、会踩哪条红线\n'
      + '③ 外部视角：招聘方／买家／客户会怎么看\n'
      + '④ 过来人：做过类似选择的人，最后悔与最庆幸的是什么\n\n'
      + '最后给三行：共识／分歧／下一步。不要空话。';
    const res = await this.askAI(prompt);
    const salonOut = (res && res.ok) ? String(res.reply || '') : ('调用失败：' + ((res && (res.code || res.message)) || '未知'));
    const hist = ((this.ui.salon && this.ui.salon.hist) || []).slice(0, 4);
    hist.unshift({ topic: q, out: salonOut.slice(0, 200) });
    this.ui.salon = Object.assign({}, this.ui.salon, { out: salonOut, hist: hist.slice(0, 5) });
    if (view && view.renderAi) { await view.renderAi(); }
    return res;
  }
  async runCabinet(view) {
    this.ui.cabinet = Object.assign({}, this.ui.cabinet, { out: '内阁会开始：四位顾问各自看自己关心的那几张卡…' });
    if (view && view.renderAi) { await view.renderAi(); }
    const ctx = await this.aiContext();
    const prompt = '你是「人生智囊团」的内阁主持人。\n我的资料：\n' + ctx
      + '\n\n四位顾问各说两块，必须引用编号：\n'
      + '① 职业规划师：建议一句／反对一句（看能力与三条路）\n'
      + '② 财务顾问：建议一句／反对一句（看红线与现金缓冲）\n'
      + '③ 产品教练：建议一句／反对一句（看证据与 p1 关卡）\n'
      + '④ 心理教练：建议一句／反对一句（看拖延与讨好型）\n\n'
      + '最后一行：今天就能做的一步（≤15 分钟、不需要任何人同意）。';
    const res = await this.askAI(prompt);
    this.ui.cabinet = Object.assign({}, this.ui.cabinet, { out: (res && res.ok) ? String(res.reply || '') : ('调用失败：' + ((res && (res.code || res.message)) || '未知')) });
    if (view && view.renderAi) { await view.renderAi(); }
    return res;
  }
  async askAdvisor(id, view) {
    const map = { career: '职业规划师', money: '财务顾问', product: '产品教练', mind: '心理教练' };
    const who = map[id] || '顾问';
    this.ui.cabinet = Object.assign({}, this.ui.cabinet, { out: who + '正在看你的资料…' });
    if (view && view.renderAi) { await view.renderAi(); }
    const ctx = await this.aiContext();
    const prompt = '你是「人生智囊团」的' + who + '。只用我资料里的证据说话，必须引用编号。\n我的资料：\n' + ctx
      + '\n\n请给：① 你现在最该做的一件事（一句话、今天能开始）\n② 你最不该做的一件事（一句话）\n③ 你判断的依据（引用 1–2 个编号）';
    const res = await this.askAI(prompt);
    this.ui.cabinet = Object.assign({}, this.ui.cabinet, { out: (res && res.ok) ? String(res.reply || '') : ('调用失败：' + ((res && (res.code || res.message)) || '未知')) });
    if (view && view.renderAi) { await view.renderAi(); }
    return res;
  }
  async aiSmoke(topic) {
    try {
      const q = String(topic || '先补哪条证据');
      this.ui.salon = Object.assign({}, this.ui.salon, { topic: q, out: '' });
      const before = Date.now();
      const res = await this.runSalon(null);
      const out = this.ui.salon.out || '';
      const rec = { at: new Date().toISOString(), topic: q, ok: !!(res && res.ok), code: (res && (res.code || res.message)) || '', ms: Date.now() - before, replyLen: out.length, replyHead: out.slice(0, 400), histLen: ((this.ui.salon && this.ui.salon.hist) || []).length };
      await this.app.vault.adapter.write('.ldt/ai-smoke.json', JSON.stringify(rec, null, 1));
      new Notice(res && res.ok ? ('AI 通了：' + out.length + ' 字') : ('AI 失败：' + ((res && (res.code || res.message)) || '未知')));
      return rec;
    } catch (e) { new Notice('AI 自检异常：' + ((e && e.message) || e)); return { ok: false }; }
  }
  async dumpUi() {
    try {
      const host = this.app.workspace.getLeavesOfType(APP_TYPE)[0];
      const el = host && host.view && typeof host.view.hostEl === 'function' ? host.view.hostEl() : null;
      const before = el ? String(el.innerHTML || '') : '';
      const hadFab = before.indexOf('ldt-fabar') >= 0;
      const hadAi = before.indexOf('ldt-aitabs') >= 0;
      this.ui.aiOpen = true;
      if (host && host.view && typeof host.view.showPage === 'function') { await host.view.showPage('assets'); }
      const el2 = host && host.view && typeof host.view.hostEl === 'function' ? host.view.hostEl() : null;
      const after = el2 ? String(el2.innerHTML || '') : '';
      this.ui.aiTab = 'cabinet';
      if (host && host.view && typeof host.view.showPage === 'function') { await host.view.showPage('assets'); }
      const el3 = host && host.view && typeof host.view.hostEl === 'function' ? host.view.hostEl() : null;
      const cabHtml = el3 ? String(el3.innerHTML || '') : '';
      this.ui.aiTab = 'salon';
      this.ui.aiOpen = false;
      if (host && host.view && typeof host.view.showPage === 'function') { await host.view.showPage('assets'); }
      const out = { at: new Date().toISOString(), hadFab: hadFab, hadAiTabBefore: hadAi, assetsLen: before.length, aiLen: after.length, aiHasTabs: after.indexOf('ldt-aitabs') >= 0, aiHasSalon: after.indexOf('ai-salon-run') >= 0, aiHasBack: after.indexOf('ai-back') >= 0, aiHasHist: after.indexOf('ldt-aihist') >= 0, cabLen: cabHtml.length, cabHasAdvisors: cabHtml.indexOf('ldt-aiadv') >= 0, cabHasRun: cabHtml.indexOf('ai-cabinet-run') >= 0, fabSnippet: (before.match(/ldt-fabar[\s\S]{0,120}/) || [''])[0] };
      await this.app.vault.adapter.write('.ldt/ui-dump.json', JSON.stringify(out, null, 1));
      new Notice('已导出 .ldt/ui-dump.json'); 
      return out;
    } catch (e) { new Notice('dump 失败：' + ((e && e.message) || e)); return { ok: false }; }
  }
  async adoptIdentity(view) {
    const model = await this.loadModelData();
    const pg = await this.loadAssetsPack();
    const rec = PAGEA.recommendIdentity(model, (pg && !pg.error) ? pg.pack : null);
    await this.setMapPref('diff', rec.diff, { silent: true });
    await this.setMapPref('arch', rec.arch, { silent: true });
    new Notice('已采用建议：' + (PAGEA.DIFF_LABEL[rec.diff] || rec.diff) + ' · ' + (PAGEA.ARCH_LABEL[rec.arch] || rec.arch), 6000);
    this.refreshViews();
    return { ok: true, diff: rec.diff, arch: rec.arch };
  }
  openImportModal() {
    const self = this;
    this.modal('导入更新 · 粘贴 → 校验 → 差异 → 合并', function (el, mm) {
      el.addClass('ldt-modal');
      const paint = function () {
        const st = self.ui.importState || { state: 'empty' };
        const built = PAGEI.buildImportHtml(Object.assign({ text: self.ui.importText || '' }, st));
        el.innerHTML = built.html;
        const each = function (sel, fn) { el.querySelectorAll(sel).forEach(function (x) { x.addEventListener('click', function (ev) { if (ev && ev.preventDefault) { ev.preventDefault(); } fn(x); }); }); };
        const ta = el.querySelector('.ldt-import-ta');
        if (ta) { ta.addEventListener('input', function () { self.ui.importText = ta.value; }); }
        each('[data-act="import-validate"]', function () { self.ui.importText = ta ? ta.value : self.ui.importText; Promise.resolve(self.validateImport()).then(paint); });
        each('[data-act="import-merge"]', function () { Promise.resolve(self.mergeImport()).then(function () { paint(); self.refreshViews(); }); });
        each('[data-act="import-goto-assets"]', function () { try { mm.close(); } catch (e) { } self.activateAssets(); });
      };
      paint();
    });
  }
  async aiContext() {
    try {
      const model = await this.loadModelData();
      const mem = await this.loadMemory();
      const nodes = Array.isArray(model.nodes) ? model.nodes : [];
      const br = Array.isArray(model.branches) ? model.branches : [];
      const lines = [];
      lines.push('人物：' + ((model.person && model.person.alias) || '未填'));
      lines.push('节点：' + nodes.map(function (n) { return n.id + '[' + n.epistemic + ']' + (n.text || ''); }).join('；'));
      lines.push('分支：' + br.map(function (b) { return b.id + b.title + (b.unlocked === false ? '(锁)' : '(可走)'); }).join('；'));
      const l3 = (mem && mem.L3) || [];
      if (l3.length) { lines.push('系统结论：' + l3.map(function (x) { return x.text; }).join('；')); }
      return lines.join('\n');
    } catch (e) { return ''; }
  }
  async askAI(prompt) {
    const key = String((this.settings && this.settings.deepseekKey) || '').trim();
    if (!key) { return { ok: false, code: 'NEED_USER_KEY', message: '还没有填 DeepSeek Key' }; }
    try {
      const r = await obsidian.requestUrl({ url: AICALL.URL, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(PB.buildBody(String(prompt || ''), { maxTokens: 3500, temperature: 0.6 })), throw: false });
      return PB.classify(r.status, r.text);
    } catch (e) { return { ok: false, code: 'PROVIDER_ERROR', message: String((e && e.message) || e) }; }
  }
  openAiModal() {
    const self = this;
    const key = String((this.settings && this.settings.deepseekKey) || '').trim();
    this.modal('AI 助手 · 联网调用模型', function (el, mm) {
      el.addClass('ldt-modal');
      if (!key) {
        el.createEl('div', { cls: 'ldt-mrow', text: '还没有接入模型：先在「模型连接」里填 DeepSeek Key，再回来用 AI。' });
        const go = el.createEl('button', { text: '去接入模型' });
        go.addClass('mod-cta');
        go.addEventListener('click', function () { try { mm.close(); } catch (e) { } self.openModelPanel(); });
        return;
      }
      el.createEl('div', { cls: 'ldt-mrow', text: '用你自己的资料回答；只发这一条问题出网，不传整库。' });
      const goals = el.createEl('div', { cls: 'ldt-aigoals' });
      const ta = el.createEl('textarea', { cls: 'ldt-aitext' });
      ta.setAttribute('rows', '4');
      ta.setAttribute('placeholder', '例如：结合我的存款和拖延习惯，这周最该补哪一条证据？');
      const out = el.createEl('div', { cls: 'ldt-aiout' });
      const send = el.createEl('button', { text: '发送' });
      send.addClass('mod-cta');
      ['补一条证据', '推荐下一步', '解释我的局面', '写一段话'].forEach(function (g) {
        const chip = goals.createEl('span', { cls: 'ldt-aichip', text: g });
        chip.addEventListener('click', function () { ta.value = g + '：'; ta.focus(); });
      });
      send.addEventListener('click', async function () {
        const q = String(ta.value || '').trim();
        if (!q) { new Notice('先写一句想问的'); return; }
        out.setText('思考中…');
        const ctx = await self.aiContext();
        const res = await self.askAI('我的资料：\n' + ctx + '\n\n问题：' + q + '\n\n要求：给 3 条以内可执行动作，每条一句话，别空话。');
        if (res && res.ok) { out.setText(String(res.reply || '')); }
        else { out.setText('调用失败：' + ((res && (res.code || res.message)) || '未知') + (res && res.code === 'NEED_USER_KEY' ? '（去「模型连接」填 Key）' : '')); }
      });
    });
  }
  async setMapPref(kind, id, opts) {
    if (kind !== 'diff' && kind !== 'arch') { return { ok: false }; }
    var rec = null;
    try {
      const model = await this.loadModelData();
      const pgR = await this.loadAssetsPack();
      rec = PAGEA.recommendIdentity(model, (pgR && !pgR.error) ? pgR.pack : null);
    } catch (e0) { rec = null; }
    const target = kind === 'diff' ? (rec && rec.diff) : (rec && rec.arch);
    const want = String(id || (kind === 'diff' ? 'standard' : 'pipeline'));
    if (!(opts && opts.silent) && rec && target && want !== target) {
      const tip = kind === 'diff'
        ? ('系统按你的资产与年龄推荐的难度是「' + (PAGEA.DIFF_LABEL[target] || target) + '」。难度决定关卡判据与证据门槛，擅自改会让任务变轻或变重，立卡与证据都对不上。\n\n仍要改成「' + (PAGEA.DIFF_LABEL[want] || want) + '」吗？')
        : ('系统按你的资产推荐的职业大类是「' + (PAGEA.ARCH_LABEL[target] || target) + '」。职业决定关卡模板，尽量选用推荐职业。\n\n仍要改成「' + (PAGEA.ARCH_LABEL[want] || want) + '」吗？');
      const okGo = await this.confirmModal(kind === 'diff' ? '改难度前先看一眼' : '改职业大类前先看一眼', tip);
      if (!okGo) { new Notice('已保留原来的' + (kind === 'diff' ? '难度' : '职业大类')); return { ok: false, cancelled: true }; }
    }
    if (kind === 'diff') { this.settings.mapDiff = want; }
    else { this.settings.mapArch = want; }
    await this.savePluginData();
    let hint = '';
    try {
      const pg = await this.loadAssetsPack();
      const lv = (pg && !pg.error && pg.pack && Array.isArray(pg.pack.levels)) ? pg.pack.levels : [];
      const hasOv = lv.some(function (x) { return x && x.difficultyOverrides && Object.keys(x.difficultyOverrides).length; });
      if (!hasOv) { hint = '；当前资产包没写难度判据，卡面内容不变（只影响骨架/指令）'; }
    } catch (e) { }
    new Notice((kind === 'diff' ? ('难度已切换：' + id) : ('职业大类已切换：' + id)) + hint, 6000);
    return { ok: true };
  }
  async markLevelDone(id) {
    const run = await this.loadRun();
    const curEv = (run.levels && run.levels[id] && Array.isArray(run.levels[id].evidence)) ? run.levels[id].evidence : [];
    if (!curEv.length) {
      const okDone = await this.confirmModal('这关还没有证据', '「' + id + '」的判据还没贴证据；仍要标记完成吗？');
      if (!okDone) { return { ok: false, cancelled: true }; }
    }
    run.levels = run.levels || {};
    const cur = run.levels[id] || {};
    run.levels[id] = Object.assign({}, cur, { status: 'done', updatedAt: new Date().toISOString() });
    let nextId = null;
    try {
      const pg = await this.loadAssetsPack();
      const lv = (pg && !pg.error && pg.pack && Array.isArray(pg.pack.levels)) ? pg.pack.levels : [];
      const mains = lv.filter(function (x) { return x.kind !== 'backup' && x.kind !== 'hidden'; });
      const idx = mains.findIndex(function (x) { return x.id === id; });
      if (idx >= 0 && idx + 1 < mains.length) {
        const nid = mains[idx + 1].id;
        const ncur = run.levels[nid] || {};
        if (!ncur.status || ncur.status === 'locked') { run.levels[nid] = Object.assign({}, ncur, { status: 'open', updatedAt: new Date().toISOString() }); nextId = nid; }
      }
    } catch (e) { }
    const r = await this.saveRun(run);
    let tip = '';
    if (r === 'conflict') { tip = '已另存（检测到外部改动）'; }
    else if (this.effectiveDemo()) { tip = '已点亮：' + id + '（体验版只开放第一关；填兑换码解锁后续关卡）'; }
    else { tip = '已点亮：' + id + (nextId ? '；下一关已开：' + nextId : ''); }
    new Notice(tip, 6000);
    this.refreshViews();
    return { ok: true, id: id, saved: r };
    this.heroPing();
  }
  async testProviderB() {
    const key = String((this.settings && this.settings.deepseekKey) || '').trim();
    if (!key) { new Notice('还没有填 DeepSeek Key：设置 → 人生决策树 → AI 增强 Key'); return { ok: false, code: 'NEED_USER_KEY' }; }
    try {
      const r = await obsidian.requestUrl({
        url: 'https://api.deepseek.com/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify(PB.buildBody('只回复两个字：连接成功')),
        throw: false
      });
      const c = PB.classify(r.status, r.text);
      new Notice(c.ok ? ('AI 通了：' + c.reply + '（' + c.model + '）') : ('AI 失败：' + c.code));
      return c;
    } catch (e) {
      new Notice('AI 调用异常：' + ((e && e.message) || e));
      return { ok: false, code: 'PROVIDER_ERROR' };
    }
  }
  isLicensed() {
    const code = (this.settings && this.settings.license) || '';
    return code ? !!(LICENSE && LICENSE.verify(code).ok) : false;
  }
  effectiveDemo() {
    return (this.settings && this.settings.demo === true) || !this.isLicensed();
  }
  loadLevels(run, model, packLevels) {
    const o = {
      model: model || null,
      archetype: (this.settings && this.settings.mapArch) || 'pipeline',
      difficulty: (this.settings && this.settings.mapDiff) || 'standard',
      run: run || { levels: {} },
      drawer: this.ui && this.ui.drawer ? this.ui.drawer : null,
      exportCheck: this.ui && this.ui.exportCheck ? this.ui.exportCheck : null,
      demoMode: this.effectiveDemo(),
      levels: packLevels || null
    };
    return LEVELS.buildMapHtml(o);
  }
  runPath() { return RUN.fileNameFor(this.settings && this.settings.demo === true); }
  async loadRun() {
    if (this._run) { return this._run; }
    const ad = this.app.vault.adapter;
    const opts = { archetype: (this.settings && this.settings.mapArch) || 'pipeline', difficulty: (this.settings && this.settings.mapDiff) || 'standard', demo: this.settings && this.settings.demo === true };
    const p = this.runPath();
    this._runPath = p;
    try {
      const raw = await ad.read(p);
      this._runRaw = raw;
      this._run = RUN.normalize(JSON.parse(raw), opts).run;
      return this._run;
    } catch (e) {
      this._run = RUN.defaults(opts);
      return this._run;
    }
  }
  async loadFormalRun() {
    const ad = this.app.vault.adapter;
    try { const raw = await ad.read('.ldt/run.json'); return RUN.normalize(JSON.parse(raw), {}).run; } catch (e) { return null; }
  }
  async saveRun(run) {
    this._run = run;
    const ad = this.app.vault.adapter;
    const p = this._runPath || this.runPath();
    if (typeof ad.write !== 'function') { return 'nowrite'; }
    let current = null;
    try { current = await ad.read(p); } catch (e) { current = null; }
    if (current != null && this._runRaw != null && current !== this._runRaw) {
      const cpPath = p.replace(/\.json$/, '') + '.conflict-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
      await ad.write(cpPath, JSON.stringify(run, null, 1));
      new Notice('检测到外部改动：本次已另存为 ' + cpPath + '（未覆盖）');
      return 'conflict';
    }
    try { if (typeof ad.mkdir === 'function') { await ad.mkdir('.ldt'); } } catch (e) { /* 已存在 */ }
    const body = JSON.stringify(run, null, 1);
    await ad.write(p, body);
    this._runRaw = body;
    return 'ok';
  }
  async enterDemo() {
    this.settings.demo = true;
    await this.savePluginData();
    this._run = null; this._runRaw = null;
    await this.loadRun();
    new Notice('已进入体验版：数据写 .ldt/run-demo.json，不碰正式数据');
    this.refreshViews();
    return { ok: true };
  }
  async promoteDemo() {
    if (this.settings.demo !== true) { new Notice('当前已是正式版'); return { ok: false, error: 'NOT_DEMO' }; }
    const demoRun = await this.loadRun();
    const formal = await this.loadFormalRun();
    const res = RUN.promoteDemo(demoRun, formal || { levels: {} });
    if (!res.ok) { new Notice(res.hint || res.error); return res; }
    this.settings.demo = false;
    await this.savePluginData();
    this._run = res.run; this._runPath = '.ldt/run.json'; this._runRaw = null;
    await this.saveRun(res.run);
    new Notice('已升级为正式版：数据已迁入 .ldt/run.json');
    return res;
  }  async recordStrategy(lvId, planType) {
    if (this.settings.shareStrategy !== true) { return false; }
    const ad = this.app.vault.adapter;
    if (typeof ad.write !== 'function') { return false; }
    const p = '.ldt/strategy/strategies.json';
    let store = STRATEGY.blank();
    try { store = JSON.parse(await ad.read(p)); } catch (e) { /* 首次 */ }
    const res = STRATEGY.add(store, {
      levelId: lvId,
      archetype: (this.settings && this.settings.mapArch) || 'pipeline',
      difficulty: (this.settings && this.settings.mapDiff) || 'standard',
      planType: planType || 'other', result: 'done', hoursBand: 'unknown'
    });
    if (!res.ok) { return false; }
    try { if (typeof ad.mkdir === 'function') { await ad.mkdir('.ldt/strategy'); } } catch (e) { /* 已存在 */ }
    await ad.write(p, JSON.stringify(res.store, null, 1));
    return true;
  }
  sk() { if (!this._sk) { this._sk = require(this.pluginRoot() + '/lib/skeleton.js'); } return this._sk; }
  async copyPrompt(lvId) {
    const sk = this.sk();
    const archId = (this.settings && this.settings.mapArch) || 'pipeline';
    const diffId = (this.settings && this.settings.mapDiff) || 'standard';
    const arch = (sk.ARCHETYPES || []).filter(function (a) { return a.id === archId; })[0] || sk.ARCHETYPES[0];
    const diff = (sk.DIFFICULTIES || []).filter(function (d) { return d.id === diffId; })[0] || sk.DIFFICULTIES[0];
    const level = ((sk.LEVELS || {})[archId] || []).filter(function (x) { return x.id === lvId; })[0];
    let text = '';
    if (level) { text = LEVELS.buildPrompt(level, arch, diff); }
    else {
      const pg = await this.loadAssetsPack();
      const pk = (pg && !pg.error && pg.pack && Array.isArray(pg.pack.levels)) ? pg.pack.levels.filter(function (x) { return x.id === lvId; })[0] : null;
      if (!pk) { new Notice('先点一张关卡卡的「复制指令」'); return ''; }
      const d = pk.detail || {};
      text = ['【这一关】' + (pk.title || lvId), '【通关判据】' + (pk.condition || ''), d.goal ? '【目标】' + d.goal : '', Array.isArray(d.evidence_required) && d.evidence_required.length ? '【要的证据】' + d.evidence_required.join('；') : '', d.next_action ? '【已知下一步】' + d.next_action : '', '', '请按这个格式回我，别写空话：', '1) 今天就能开始的 3 个动作（每个 ≤30 分钟能落地）', '2) 每个动作产出什么证据（截图/链接/一句话反馈）', '3) 可能踩的 2 个坑，以及踩了怎么退', '', '证据请按「九段」写：一句话结论／解释／为什么值得记／适用范围／成立条件／边界／反例／内容身份（事实还是推测）／来源锚点（截图或链接）'].filter(Boolean).join('\n');
    }
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); new Notice('指令已复制，粘到你的 AI 里'); }
      else { new Notice('已生成指令（剪贴板不可用，请从详情里复制）'); }
    } catch (e) { new Notice('复制失败：' + ((e && e.message) || e)); }
    return text;
  }
  openDrawer(lv) { this.ui.drawer = { lv: lv, msg: null }; }
  closeDrawer() { this.ui.drawer = null; }
  async submitEvidence(lvId, tier, text, planType) {
    const run = await this.loadRun();
    const sk = LEVELS;
    const arch = (this.settings && this.settings.mapArch) || 'pipeline';
    const diff = (this.settings && this.settings.mapDiff) || 'standard';
    const all = require(this.pluginRoot() + '/lib/skeleton.js');
    const level = ((all.LEVELS || {})[arch] || []).filter(function (x) { return x.id === lvId; })[0];
    if (!level) {
      // 资产包关卡（id 形如 lv-pmf）：没有骨架判据，就只记录证据并给出下一步，不静默返回
      try {
        const pg = await this.loadAssetsPack();
        const pk = (pg && !pg.error && pg.pack && Array.isArray(pg.pack.levels)) ? pg.pack.levels.filter(function (x) { return x.id === lvId; })[0] : null;
        if (pk) {
          const r2 = await this.loadRun();
          r2.levels = r2.levels || {};
          const cur = r2.levels[lvId] || {};
          cur.evidence = Array.isArray(cur.evidence) ? cur.evidence : [];
          cur.evidence.push({ at: new Date().toISOString(), tier: tier, text: String(text || '').slice(0, 300) });
          r2.levels[lvId] = cur;
          await this.saveRun(r2);
          this.ui.drawer = { lv: lvId, msg: { kind: 'ok', text: '已记录证据（' + (pk.condition || '').slice(0, 30) + '…）。做完后点「手动标记完成」' } };
          this.refreshViews();
          return { ok: true, recorded: true };
        }
      } catch (e) { }
      return { ok: false, msg: '找不到这一关' };
    }
    const add = RUN.addEvidence(run, lvId, { type: tier, kind: tier === 'senior' ? 'income' : (tier === 'mid' ? 'link' : 'note'), value: text });
    if (!add.ok) { this.ui.drawer = { lv: lvId, msg: { kind: 'warn', text: '还差一点：' + add.error } }; return add; }
    const state = run.levels[lvId];
    const verdict = VERIFY.judgeLevel(level, state);
    if (verdict.status === 'done') {
      RUN.setStatus(run, lvId, 'done');
      this.ui.drawer = { lv: lvId, msg: { kind: 'ok', text: '点亮了：+ ' + verdict.xp + ' XP' } };
    } else if (verdict.status === 'blocked') {
      RUN.setStatus(run, lvId, 'blocked');
      this.ui.drawer = { lv: lvId, msg: { kind: 'warn', text: '先别冲：' + (verdict.reasons[0] || '命中护身符') } };
    } else {
      RUN.bumpReject(run, lvId);
      RUN.bumpRejection(run);
      const extra = run.rejectionCount >= 2 ? '（连续两次没通过，要不要换条路？）' : '';
      this.ui.drawer = { lv: lvId, msg: { kind: 'warn', text: '看得出你努力了，差一点点。' + (verdict.reasons[0] || '') + extra } };
    }
    await this.saveRun(run);
    if (verdict.status === 'done') { await this.recordStrategy(lvId, planType).catch(function () { return false; }); }
    return { ok: true, verdict: verdict };
  }
  async sendFeedback(lvId, text) {
    const run = await this.loadRun();
    const payload = FEEDBACK.buildPayload({ run: run, note: '关卡 ' + lvId + '：' + String(text || '不懂怎么填').slice(0, 200) });
    const fp = FEEDBACK.fileNameFor(new Date().toISOString());
    const ad = this.app.vault.adapter;
    let saved = false;
    if (typeof ad.write === 'function') {
      try { if (typeof ad.mkdir === 'function') { await ad.mkdir('.ldt/feedback'); } } catch (e) { /* 已存在 */ }
      await ad.write(fp, JSON.stringify(payload, null, 1));
      saved = true;
    }
    this.ui.drawer = { lv: lvId, msg: { kind: 'ok', text: saved ? '已打包（不含原文）：' + fp : '已生成反馈包（未落盘）' } };
    return { ok: true, path: fp, saved: saved };
  }
  async validateImport() {
    const text = String(this.ui.importText || '');
    if (!text.trim()) { this.ui.importState = { state: 'empty' }; return this.ui.importState; }
    let patch = null;
    try { patch = JSON.parse(text); } catch (e) {
      this.ui.importState = { state: 'error', findings: [{ code: 'E_JSON', path: '$', msg: String((e && e.message) || e).slice(0, 140) }] };
      return this.ui.importState;
    }
    const cur = await this.loadAssetsPack();
    const prev = (cur && cur.pack) ? cur.pack : PACK.empty();
    const candidate = (CASEP && CASEP.preparePatch) ? CASEP.preparePatch(prev, patch) : Object.assign({}, patch);
    if (!('schema' in candidate) && PACK && PACK.SCHEMA) { candidate.schema = PACK.SCHEMA; }
    if (!('domains' in candidate)) { candidate.domains = PACK ? PACK.DOMAINS.slice() : []; }
    const findings = VERIFY.checkPack(candidate).map(function (f) { return { code: f.code, path: f.where || '$', msg: f.msg, blocking: !!f.blocking }; });
    const blocking = findings.filter(function (f) { return f.blocking; });
    if (blocking.length) { this.ui.importState = { state: 'blocked', findings: findings }; this.ui.pendingPack = null; return this.ui.importState; }
    let fileSha = '';
    try {
      const _buf = new TextEncoder().encode(text);
      const _h = await crypto.subtle.digest('SHA-256', _buf);
      fileSha = Array.from(new Uint8Array(_h)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    } catch (e) { fileSha = ''; }
    const declared = (patch && (patch.packageRootHash || (patch.manifest && patch.manifest.packageRootHash))) || '';
    const auth = declared ? (String(declared).replace(/^sha256:/, '') === fileSha ? 'match' : 'mismatch') : 'none';
    const merged = PAGEI.mergeForWrite(prev, candidate);
    const counts = PAGEI.diffCounts(prev, merged);
    this.ui.pendingPack = merged;
    this.ui.importState = { state: 'diff', findings: findings, counts: counts, fileSha: fileSha, auth: auth };
    return this.ui.importState;
  }
  async mergeImport() {
    if (!this.ui.pendingPack || !this.ui.importState || this.ui.importState.state !== 'diff') { new Notice('先校验通过再合并'); return { ok: false }; }
    const text = JSON.stringify(this.ui.pendingPack, null, 1);
    try { await this.app.vault.adapter.write(this.assetsPath(), text); } catch (e) { new Notice('写资产包失败：' + ((e && e.message) || e)); return { ok: false }; }
    const p = this.ui.pendingPack;
    const stats = { skills: (p.skills || []).length, levels: (p.levels || []).length, routes: (p.routes || []).length };
    this.settings.lastImport = { at: new Date().toISOString(), skills: stats.skills, levels: stats.levels };
    await this.savePluginData();
    this.ui.pendingPack = null;
    this.ui.importState = { state: 'merged', stats: stats };
    this.heroPing();
    new Notice('已合并：' + stats.skills + ' 技能 / ' + stats.levels + ' 关卡', 4000);
    return { ok: true, stats: stats };
  }
  async activateImport() { return this.openPage(IMPORT_TYPE); }
  casesPath() { return '.ldt/cases.json'; }
  async loadCases() {
    const ad = this.app.vault.adapter;
    let raw = null;
    try { raw = await ad.read(this.casesPath()); } catch (e) { raw = null; }
    if (raw == null) {
      // 契约 C11：缺或改名 cases.json 只出空态，不得回退随包样例
      try { await ad.write(this.casesPath(), '[]'); } catch (e2) { }
      return { raw: [], seeded: false };
    }
    try { return { raw: JSON.parse(raw), seeded: false }; } catch (e4) { return { error: [{ code: 'E_JSON', path: this.casesPath(), msg: String((e4 && e4.message) || e4).slice(0, 120) }] }; }
  }
  async seedSampleCases() {
    const seed = await this.readBundled('sample/cases-3.json');
    if (!seed) { new Notice('随包样例缺件：sample/cases-3.json'); return { ok: false }; }
    try { const j = JSON.parse(seed); if (!j || !j.cases || !j.cases.length) { throw new Error('空样例'); } } catch (e) { new Notice('样例案例不合法：' + ((e && e.message) || e)); return { ok: false }; }
    try {
      try { await this.app.vault.adapter.mkdir('.ldt'); } catch (e2) { }
      await this.app.vault.adapter.write(this.casesPath(), seed);
      new Notice('已载入 3 张样例案例（未核实，可改可删）', 8000);
      return { ok: true, n: 3 };
    } catch (e3) { new Notice('载入失败：' + ((e3 && e3.message) || e3)); return { ok: false }; }
  }
  showWelcome() {
    try {
      const modal = new obsidian.Modal(this.app);
      modal.titleEl.setText('人生决策树 · 从 1 走到 3');
      const lead = modal.contentEl.createEl('p', { text: '一条路，按顺序走：先看样例 → 生成你的树 → 去开第一关。（随时可在设置里再打开）' });
      lead.style.marginBottom = '10px';
      const steps = [
        { n: '1', t: '看一棵样例树', d: '先看清成品长什么样，约 1 分钟', fn: () => this.activateView() },
        { n: '2', t: '答 15 题生成我的树', d: '生成你自己的模型（18 节点 · 3 分支），约 10 分钟', fn: () => this.activateInterview() },
        { n: '3', t: '去关卡地图开第一关', d: '拿模型选一条路，交第一条证据', fn: () => this.activateLevels() }
      ];
      steps.forEach((st, k) => {
        const row = modal.contentEl.createDiv();
        row.style.display = 'flex'; row.style.alignItems = 'flex-start'; row.style.gap = '10px';
        row.style.padding = '10px 12px'; row.style.marginTop = k === 0 ? '4px' : '8px';
        row.style.border = '1px solid var(--background-modifier-border)'; row.style.borderRadius = '10px';
        const badge = row.createEl('span', { text: st.n });
        badge.style.flex = '0 0 22px'; badge.style.height = '22px'; badge.style.borderRadius = '11px';
        badge.style.display = 'flex'; badge.style.alignItems = 'center'; badge.style.justifyContent = 'center';
        badge.style.fontSize = '12px'; badge.style.background = 'var(--interactive-accent)'; badge.style.color = 'var(--text-on-accent)';
        const box = row.createDiv(); box.style.flex = '1';
        const b = box.createEl('button', { text: st.t });
        b.style.fontWeight = '600';
        b.addEventListener('click', async () => { try { modal.close(); await st.fn(); } catch (e) { } });
        const d = box.createEl('div', { text: st.d });
        d.style.fontSize = '12px'; d.style.opacity = '0.72'; d.style.marginTop = '2px';
      });
      const tail = modal.contentEl.createEl('p', { text: '走到第 3 步就算上手；「以后不再自动弹出」= 从第 1 步开始自己走。' });
      tail.style.marginTop = '12px'; tail.style.opacity = '0.7'; tail.style.fontSize = '12px';
      modal.onClose = async () => { this.settings.onboarded = true; try { await this.savePluginData(); } catch (e) { } };
      modal.open();
    } catch (e) { /* 弹窗失败不阻塞 */ }
  }
  confirmModal(title, text) {
    return new Promise((resolve) => {
      try {
        const modal = new obsidian.Modal(this.app);
        modal.titleEl.setText(String(title || '确认'));
        modal.contentEl.createEl('p', { text: String(text || '') });
        const row = modal.contentEl.createDiv();
        row.style.display = 'flex'; row.style.gap = '8px'; row.style.marginTop = '12px';
        const ok = row.createEl('button', { text: '确认' });
        ok.addClass('mod-cta');
        const no = row.createEl('button', { text: '取消' });
        let settled = false;
        const done = (v) => { if (settled) { return; } settled = true; try { modal.close(); } catch (e) { } resolve(v); };
        ok.addEventListener('click', () => done(true));
        no.addEventListener('click', () => done(false));
        modal.onClose = () => done(false);
        modal.open();
      } catch (e) { resolve(false); }
    });
  }
  async casePrompt(caseId) {
    const got = await this.loadCases();
    const res = PAGEC.normCases(got.raw);
    const c = (res.cases || []).filter(function (x) { return x.case_id === caseId; })[0];
    if (!c) { new Notice('找不到这张案例卡'); return { ok: false }; }
    const packGot = await this.loadAssetsPack();
    const pack = (packGot && !packGot.error) ? packGot.pack : { skills: [] };
    const text = CASEP.buildPrompt(c, pack);
    this.showPromptModal('以此为目标生成关卡 · 复制给外部 AI，或直连生成', text, caseId);
    return { ok: true, length: text.length, case_id: caseId };
  }
  async generateLevelsViaApi(caseId) {
    const got = await this.loadCases();
    const res = PAGEC.normCases(got.raw);
    const c = (res.cases || []).filter(function (x) { return x.case_id === caseId; })[0];
    if (!c) { new Notice('找不到这张案例卡'); return { ok: false }; }
    const packGot = await this.loadAssetsPack();
    const prev = (packGot && !packGot.error) ? packGot.pack : { skills: [] };
    const prompt = CASEP.buildPrompt(c, prev);
    const plan = AICALL.plan(this.settings && this.settings.deepseekKey, prompt, { maxTokens: 3000 });
    if (!plan.ok) { new Notice(plan.message, 9000); return plan; }
    new Notice('直连 AI 生成中（约 10–30 秒）…', 5000);
    let r = null;
    try {
      r = await obsidian.requestUrl({ url: plan.url, method: plan.method, headers: plan.headers, body: JSON.stringify(plan.body), throw: false });
    } catch (e) { new Notice('AI 调用异常：' + ((e && e.message) || e)); return { ok: false, code: 'PROVIDER_ERROR' }; }
    const cls = PB.classify(r.status, r.text);
    if (!cls.ok) { new Notice('AI 失败：' + cls.code, 9000); return cls; }
    const parsed = CASEP.parseLevels(cls.reply);
    if (!parsed.ok) { new Notice('AI 回包不合规：' + parsed.error, 12000); return { ok: false, code: 'BAD_LEVELS', error: parsed.error }; }
    const candidate = CASEP.preparePatch(prev, parsed.pack);
    const findings = VERIFY.checkPack(candidate);
    const blocking = findings.filter(function (f) { return f.blocking; });
    if (blocking.length) { new Notice('AI 关卡未过七码：' + blocking[0].code + ' ' + (blocking[0].msg || ''), 12000); return { ok: false, code: 'BLOCKED', findings: blocking }; }
    const merged = PAGEI.mergeForWrite(prev, candidate);
    try { await this.app.vault.adapter.write(this.assetsPath(), JSON.stringify(merged, null, 1)); }
    catch (e) { new Notice('写资产包失败：' + ((e && e.message) || e)); return { ok: false }; }
    this.settings.lastCaseToLevel = { at: new Date().toISOString(), case_id: caseId, via: 'api', levels: 3 };
    await this.savePluginData();
    new Notice('已直连生成并入库 3 个关卡（' + c.case_name + '）', 8000);
    this.refreshViews();
    return { ok: true, levels: 3, model: cls.model };
  }
  showPromptModal(title, text, caseId) {
    try {
      const self = this;
      const modal = new obsidian.Modal(this.app);
      modal.titleEl.setText(title);
      const ta = modal.contentEl.createEl('textarea');
      ta.value = text;
      ta.rows = 16;
      ta.style.width = '100%';
      ta.style.fontFamily = 'ui-monospace,Consolas,monospace';
      ta.style.fontSize = '12px';
      ta.style.lineHeight = '1.5';
      const row = modal.contentEl.createDiv();
      row.style.marginTop = '10px';
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';
      const copy = row.createEl('button', { text: '复制到剪贴板' });
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(text); new Notice('已复制：去外部 AI 粘贴，拿回 JSON', 5000); }
        catch (e) { ta.select(); new Notice('已选中全文，按 Ctrl+C 复制', 5000); }
      });
      const apiBtn = row.createEl('button', { text: '直连 AI 生成（用设置里的 Key）' });
      apiBtn.addEventListener('click', async () => {
        modal.close();
        await self.generateLevelsViaApi(caseId);
      });
      const hint = row.createEl('span', { text: '拿到 JSON 后：命令面板 →「导入更新」→ 粘贴 → 校验 → 合并' });
      hint.style.fontSize = '11px';
      hint.style.opacity = '0.7';
      modal.open();
      return { ok: true };
    } catch (e) { new Notice('打不开 Prompt 弹窗：' + ((e && e.message) || e)); return { ok: false }; }
  }
  async caseToLevel(caseId, view) {
    const got = await this.loadCases();
    const res = PAGEC.normCases(got.raw);
    const c = (res.cases || []).filter(function (x) { return x.case_id === caseId; })[0];
    if (!c) { new Notice('找不到这张案例卡'); return { ok: false }; }
    const okGo = await this.confirmModal('转成我的关卡', '会追加 3 个递进「备用」关卡（0→1 / 1→10 / 放大）：' + c.case_name + '（不覆盖现有条目）');
    if (!okGo) { return { ok: false, cancelled: true }; }
    const packGot = await this.loadAssetsPack();
    if (packGot.error) { new Notice('资产包读不了，先修资产包'); return { ok: false }; }
    let pack = packGot.pack;
    const added = APPEND.appendThreeLevels(pack, c, new Date().toISOString());
    if (!added.ok) { new Notice('追加失败：' + added.error); return { ok: false }; }
    if (!added.added) { new Notice('这张案例的 3 个关卡已经转过了'); return { ok: false }; }
    pack = added.pack;
    const text = JSON.stringify(pack, null, 1);
    try { await this.app.vault.adapter.write(this.assetsPath(), text); } catch (e) { new Notice('写资产包失败：' + ((e && e.message) || e)); return { ok: false }; }
    this.settings.lastCaseToLevel = { at: new Date().toISOString(), case_id: caseId, level_ids: added.ids };
    await this.savePluginData();
    new Notice('已转入 ' + added.added + ' 个递进关卡：' + c.case_name + (this.effectiveDemo() ? '（体验版只开第一关，填码后可做）' : '（第一关已可点亮）'), 6000);
    if (view && typeof view.renderCases === 'function') { await view.renderCases(); }
    this.refreshViews();
    return { ok: true, added: added.added, ids: added.ids };
  }
  async activateCases() { return this.openPage(CASES_TYPE); }
  assetsPath() { return '.ldt/assets.json'; }
  async loadAssetsPack() {
    const ad = this.app.vault.adapter;
    let raw = null;
    try { raw = await ad.read(this.assetsPath()); } catch (e) { raw = null; }
    if (raw == null) { try { raw = await ad.read('.ldt/assets-pack.json'); } catch (e0) { raw = null; } }
    if (raw == null) {
      const seed = await this.readBundled('sample/sample-assets-v2.1.json');
      if (!seed) { return { error: [{ code: 'E_MISSING', path: this.assetsPath(), msg: '没有资产包，也没有随包样例' }] }; }
      try { await ad.write(this.assetsPath(), seed); } catch (e2) { /* 只读渲染 */ }
      try { return { pack: JSON.parse(seed), seeded: true }; } catch (e3) { return { error: [{ code: 'E_JSON', path: 'sample/sample-assets-v2.1.json', msg: '随包样例不是合法 JSON' }] }; }
    }
    try { return { pack: JSON.parse(raw), seeded: false }; } catch (e4) { return { error: [{ code: 'E_JSON', path: this.assetsPath(), msg: String((e4 && e4.message) || e4).slice(0, 120) }] }; }
  }
  buildAssetsPage(got) {
    if (!Array.isArray(this.ui.assetFilter)) { this.ui.assetFilter = []; }
    if (got && got.error) { return PAGEA.buildAssetsHtml({ error: got.error }); }
    return PAGEA.buildAssetsHtml({ pack: got && got.pack, filter: this.ui.assetFilter, sample: !!(got && got.seeded) });
  }
  toggleAssetFilter(d) {
    if (!Array.isArray(this.ui.assetFilter)) { this.ui.assetFilter = []; }
    const i = this.ui.assetFilter.indexOf(d);
    if (i >= 0) { this.ui.assetFilter.splice(i, 1); } else { this.ui.assetFilter.push(d); }
  }
  pageShellHtml(o) { return SHELL.pageShellHtml(o); }
  // 自绘面板：不依赖 Obsidian Modal，确保任何版本都能弹（原产品弹窗的等价物）
  modal(title, build) {
    try { const old = document.querySelector('.ldt-xdlg-mask'); if (old) { old.remove(); } } catch (e0) { }
    const mask = document.createElement('div'); mask.className = 'ldt-xdlg-mask';
    const box = document.createElement('div'); box.className = 'ldt-xdlg';
    const head = document.createElement('div'); head.className = 'ldt-xdlg-head';
    const h = document.createElement('b'); h.className = 'ldt-xdlg-title'; h.textContent = title;
    const xx = document.createElement('span'); xx.className = 'ldt-xdlg-x'; xx.textContent = '✕';
    xx.addEventListener('click', function () { try { mask.remove(); } catch (e) { } });
    head.appendChild(h); head.appendChild(xx);
    const body = document.createElement('div'); body.className = 'ldt-xdlg-body';
    box.appendChild(head); box.appendChild(body); mask.appendChild(box);
    mask.addEventListener('click', function (ev) { if (ev.target === mask) { try { mask.remove(); } catch (e) { } } });
    document.body.appendChild(mask);
    const closer = { close: function () { try { mask.remove(); } catch (e) { } }, contentEl: body, titleEl: h };
    try { build(body, closer, this); } catch (e) { body.textContent = '打开失败：' + String((e && e.message) || e); }
    return closer;
  }
  openModelPanel() {
    const self = this;
    this.modal('模型连接', function (el, mm) {
      el.addClass('ldt-modal');
      const key = (self.settings && self.settings.deepseekKey) || '';
      const on = (self.settings && self.settings.aiEnabled) === true;
      el.createEl('div', { cls: 'ldt-mrow', text: '本地模式：知识卡全部本机生成；只有下面的「联网调用」打开时才会出网，且只发一句测试话' });
      const sw = el.createEl('div', { cls: 'ldt-mswrow' });
      const cb = sw.createEl('input', { attr: { type: 'checkbox' } });
      cb.checked = on;
      sw.createEl('span', { attr: { style: 'margin-left:8px' }, text: '允许联网调用模型（默认关）' });
      cb.addEventListener('change', async function () {
        self.settings.aiEnabled = cb.checked === true;
        await self.savePluginData();
        new Notice('联网调用：' + (cb.checked ? '已开启' : '已关闭'));
      });
      el.createEl('div', { cls: 'ldt-mrow', text: '模型：' + (PB ? PB.MODEL : 'deepseek-flash') + ' · 端点：api.deepseek.com（仅记录，不发起请求）' });
      const inp = el.createEl('input', { cls: 'ldt-minput', attr: { placeholder: '粘贴 DeepSeek Key（只存本机 data.json）' } });
      inp.value = key;
      const row = el.createEl('div', { cls: 'ldt-mbtns' });
      const b1 = row.createEl('button', { text: '保存（本机）' });
      b1.addEventListener('click', async function () { self.settings.deepseekKey = String(inp.value || '').trim(); await self.savePluginData(); new Notice('已保存到本机'); });
      const b2 = row.createEl('button', { text: '测试连接' });
      const out = el.createEl('div', { cls: 'ldt-mres', text: '' });
      b2.addEventListener('click', async function () {
        const k = String(inp.value || '').trim() || ((self.settings && self.settings.deepseekKey) || '');
        if (!k) { out.setText('先填 Key'); return; }
        if (!self.settings.aiEnabled) { out.setText('先把「允许联网调用模型」打开（默认关）'); return; }
        out.setText('调用中…');
        const t0 = Date.now();
        const timeout = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 12000); });
        try {
          const resp = await Promise.race([obsidian.requestUrl({
            url: 'https://api.deepseek.com/chat/completions',
            method: 'POST',
            throw: false,
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + k },
            body: JSON.stringify(PB.buildBody('只回复两个字：连接成功'))
          }), timeout]);
          const c = PB.classify(resp.status, resp.text);
          const ms = Date.now() - t0;
          if (c.ok) { out.setText('连接成功：' + c.reply + '（' + c.model + ' · ' + ms + 'ms · HTTP ' + resp.status + '）'); }
          else { out.setText('失败：' + c.code + (c.detail ? ' ' + c.detail : '') + '（HTTP ' + resp.status + ' · ' + ms + 'ms）'); }
        } catch (err) {
          out.setText('超时/失败：' + String((err && err.message) || err) + '（12s；走 Obsidian requestUrl，不经 fetch）');
        }
      });
      el.createEl('div', { cls: 'ldt-mnote', text: '边界：只在点「测试连接」时发一句固定测试话；知识卡与 .ldt 数据不会上传。Key 存本机 data.json，可随时清空。' });
    });
  }
  openGuidePanel() {
    this.modal('使用教程', function (el) {
      el.addClass('ldt-modal');
      const steps = [
        '1. 打开「人生决策树」→ 页签条最右「第二大脑」',
        '2. 命令面板跑「扫描人生决策树内容 → 知识卡」，把人物模型/资产扫成 26 张九段卡',
        '3. 书架看分类与卡片；知识地图看关系（边只来自卡上 relates）',
        '4. 搜索框输入关键词回车；点任意结果进阅读器',
        '5. 阅读器九段：一句话结论/解释/为什么值得记住/适用范围/成立条件/边界/反例/内容身份/来源锚点',
        '6. 数据都在本机：.ldt/（决策树）与 .mysb/（知识卡），一键导出可备份'
      ];
      steps.forEach(function (s) { el.createEl('div', { cls: 'ldt-mrow', text: s }); });
      el.createEl('div', { cls: 'ldt-mnote', text: '与原产品「使用教程」同位置同形态；其二维码指向自家官网，本插件不生成外链。' });
    });
  }
  openVersionPanel() {
    this.modal('人生决策树 · 版本', function (el) {
      el.addClass('ldt-modal');
      el.createEl('div', { cls: 'ldt-mrow', text: '当前版本：v0.1.23（本地构建）' });
      el.createEl('div', { cls: 'ldt-mrow', text: '构建：本机打包 · 未接更新源' });
      el.createEl('div', { cls: 'ldt-mnote', text: '原产品接自家更新服务器；本插件不连外网，更新请走本地重装/覆盖。' });
    });
  }
  async openGlobalSearch() {
    const self = this;
    const cards = await this.loadBrainCards();
    this.modal('搜索整个第二大脑', function (el, mm) {
      el.addClass('ldt-modal');
      const inp = el.createEl('input', { cls: 'ldt-minput', attr: { placeholder: '书名 / 知识点 / 技能 / 行动' } });
      const meta = el.createEl('div', { cls: 'ldt-mnote', text: '共 ' + cards.length + ' 张卡' });
      const list = el.createEl('div', { cls: 'ldt-mlist' });
      const draw = function () {
        const q = String(inp.value || '').toLowerCase().trim();
        list.empty();
        const hits = !q ? cards.slice(0, 20) : cards.filter(function (c) { return (c.title + ' ' + (c.sections || []).map(function (s) { return s.body; }).join(' ')).toLowerCase().indexOf(q) >= 0; }).slice(0, 30);
        meta.setText('命中 ' + hits.length + ' / ' + cards.length);
        hits.forEach(function (c) {
          const row = list.createEl('div', { cls: 'ldt-mrow ldt-mclick', text: (BRAIN.TYPE_LABEL[c.type] || c.type) + ' · ' + c.title });
          row.addEventListener('click', function () { try { mm.close(); } catch (e) { } self.pluginOpenCard(c.id); });
        });
      };
      inp.addEventListener('input', draw);
      draw();
      setTimeout(function () { try { inp.focus(); } catch (e) { } }, 60);
    });
  }
  async pluginOpenCard(id) {
    this.ui.brainCurrent = id;
    this.ui.brainSub = 'reader';
    return this.refreshBrain();
  }
  async refreshBrain() {
    const ls = this.app.workspace.getLeavesOfType(APP_TYPE) || [];
    const leaf = ls[0];
    if (leaf && leaf.view && typeof leaf.view.showPage === 'function') { return leaf.view.showPage('brain'); }
    return this.activateBrain();
  }
  async exportBrainCards() {
    try {
      const cards = await this.loadBrainCards();
      const text = cards.map(function (c) { return c.md || ''; }).join('\n\n---\n\n');
      const name = '我的大脑-知识卡-' + new Date().toISOString().slice(0, 10) + '.md';
      await this.app.vault.adapter.write(name, text);
      new Notice('已导出：' + name + '（' + cards.length + ' 张）');
    } catch (e) { new Notice('导出失败：' + String((e && e.message) || e)); }
  }
  async scanBrain() {
    const ad = this.app.vault.adapter;
    const rd = async (p) => { try { return JSON.parse(await ad.read(p)); } catch (e) { return null; } };
    const pm = await rd('.ldt/person-model.json');
    if (!pm) { new Notice('没有 .ldt/person-model.json：先在人生决策树里生成模型'); return { ok: false, code: 'NO_LDT' }; }
    const cs = await rd('.ldt/cases.json');
    const assets = await rd('.ldt/assets.json');
    const cases = Array.isArray(cs) ? cs : ((cs && cs.cases) || []);
    const cards = BRAIN_GEN.buildCards({ personModel: pm, cases: cases, assets: assets });
    try { await ad.mkdir('.mysb/cards'); } catch (e) { }
    for (const c of cards) { await ad.write('.mysb/cards/' + c.id + '.md', c.md); }
    new Notice('已生成 ' + cards.length + ' 张知识卡');
    await this.refreshBrain();
    return { ok: true, cards: cards.length };
  }
  openSwitchMenu(el) {
    const self = this;
    try { const old = document.querySelector('.ldt-menu'); if (old) { old.remove(); } } catch (e0) { }
    const items = [
      ['字号：小 / 中 / 大（当前 ' + (this.ui.brainFont || 'normal') + '）', function () { self.cycleBrainFont(); }],
      ['切换浅色 / 深色主题', function () { try { document.body.classList.toggle('theme-light'); document.body.classList.toggle('theme-dark'); } catch (e) { } }],
      ['备份与迁移（导出知识卡 .md）', function () { self.exportBrainCards(); }],
      ['检查更新', function () { self.openVersionPanel(); }],
      ['资料与隐私', function () { new Notice('本机处理 · 不上传 · 可一键删除：.ldt/ 与 .mysb/ 都是本地文件', 8000); }],
      ['联系与反馈', function () { new Notice('无外链：把 .ldt/ 与 .mysb/ 打包发主脑即可'); }]
    ];
    const menu = document.createElement('div'); menu.className = 'ldt-menu';
    items.forEach(function (it) {
      const row = document.createElement('div'); row.className = 'ldt-menu-item'; row.textContent = it[0];
      row.addEventListener('click', function () { try { menu.remove(); } catch (e) { } it[1](); });
      menu.appendChild(row);
    });
    document.body.appendChild(menu);
    try {
      const rect = el.getBoundingClientRect();
      menu.style.left = Math.max(8, rect.right - 260) + 'px';
      menu.style.top = (rect.bottom + 6) + 'px';
    } catch (e) { menu.style.left = '240px'; menu.style.top = '160px'; }
    setTimeout(function () {
      const off = function (ev) { if (!menu.contains(ev.target)) { try { menu.remove(); } catch (e) { } document.removeEventListener('mousedown', off, true); } };
      document.addEventListener('mousedown', off, true);
    }, 30);
  }
  async cycleBrainFont() {
    const order = ['normal', 'large', 'small'];
    const cur = this.ui.brainFont || 'normal';
    this.ui.brainFont = order[(order.indexOf(cur) + 1) % order.length];
    new Notice('字号：' + this.ui.brainFont);
    await this.refreshBrain();
  }

  async heroPing() {
    try {
      const now = await this.heroStats();
      const prev = this._heroPrev;
      this._heroPrev = now;
      if (!prev) { return; }
      const d = [];
      if (now.events > prev.events) { d.push('+' + (now.events - prev.events) + ' 段经历'); }
      if (now.skills > prev.skills) { d.push('+' + (now.skills - prev.skills) + ' 张卡'); }
      if (now.lit > prev.lit) { d.push('新点亮 ' + (now.lit - prev.lit) + ' 张'); }
      if (now.unlocked > prev.unlocked) { d.push('版图 +' + (now.unlocked - prev.unlocked)); }
      if (!d.length) { return; }
      const el = document.createElement('div');
      el.className = 'ldt-toast';
      el.textContent = '滴！' + d.join(' · ');
      document.body.appendChild(el);
      setTimeout(function () { try { el.remove(); } catch (e) { } }, 3000);
    } catch (e) { }
  }
  async heroStats() {
    try {
      const ad = this.app.vault.adapter;
      const rd = async (p) => { try { return JSON.parse(await ad.read(p)); } catch (e) { return null; } };
      const model = await rd(this.modelPath());
      const memory = await rd('.ldt/memory.json');
      const got = await this.loadAssetsPack();
      const assets = (got && got.pack) ? got.pack : null;
      return HERO.statsFrom({ model: model, assets: assets, memory: memory });
    } catch (e) { return HERO.statsFrom({}); }
  }

  async loadBrainCards() {
    const out = [];
    try {
      const L = await this.app.vault.adapter.list('.mysb/cards');
      const files = (L && L.files) || [];
      for (const f of files) {
        if (!/\.md$/.test(f)) { continue; }
        try { const t = await this.app.vault.adapter.read(f); out.push(BRAIN.parseCard(f, t)); } catch (e) { }
      }
    } catch (e) { }
    return out;
  }
  async activateBrain() { return this.openPage(BRAIN_TYPE); }
  bindPageNav(host) {
    if (!host || typeof host.querySelectorAll !== 'function') { return; }
    const self = this;
    const map = { 'selfcheck': () => self.runSelfCheck(), 'popout': () => self.openPopout(), 'nav-tree': () => self.activateView(), 'nav-levels': () => self.activateLevels(), 'nav-assets': () => self.activateAssets(), 'nav-cases': () => self.activateCases(), 'nav-import': () => self.openImportModal(), 'nav-ai': () => self.activateAiView(), 'fab-ai': () => self.activateAiView(), 'fab-import': () => self.openImportModal(), 'nav-memory': () => self.activateMemory(), 'nav-brain': () => self.activateBrain(), 'brain-model': () => self.openModelPanel(), 'brain-guide': () => self.openGuidePanel(), 'brain-version': () => self.openVersionPanel(), 'brain-search-open': () => self.openGlobalSearch(), 'brain-switch': (el) => self.openSwitchMenu(el) };

    Object.keys(map).forEach(function (act) {
      host.querySelectorAll('[data-act="' + act + '"]').forEach(function (el) {
        el.addEventListener('click', function (ev) { if (ev && ev.preventDefault) { ev.preventDefault(); } map[act](el); });
      });
    });
  }
  repairStaleLeaves() {
    try {
      const self = this;
      const known = [VIEW_TYPE, LEVELS_TYPE, ASSETS_TYPE, CASES_TYPE, IMPORT_TYPE, MEMORY_TYPE, INTERVIEW_TYPE, BRAIN_TYPE, APP_TYPE];
      this.app.workspace.iterateAllLeaves(function (leaf) {
        try {
          const st = leaf && typeof leaf.getViewState === 'function' ? leaf.getViewState() : null;
          if (!st || !st.type || st.type.indexOf('ldt-') !== 0 || known.indexOf(st.type) < 0) { return; }
          const cur = leaf.view && typeof leaf.view.getViewType === 'function' ? leaf.view.getViewType() : null;
          if (st.type !== APP_TYPE && cur === st.type) { leaf.setViewState({ type: APP_TYPE, state: { tab: TAB_OF_TYPE[st.type] || 'assets' }, active: false }); return; }
          if (cur !== st.type) { leaf.setViewState({ type: st.type, active: false }); }
        } catch (e1) { }
      });
      // 迁移完若还有多个容器叶：只留一个（当前活跃优先），其余关掉，避免标签页越点越多
      setTimeout(function () {
        try {
          const ls = self.app.workspace.getLeavesOfType(APP_TYPE) || [];
          if (ls.length <= 1) { return; }
          const act = self.app.workspace.activeLeaf;
          const keep = (act && act.view && act.view.getViewType && act.view.getViewType() === APP_TYPE) ? act : ls[0];
          ls.forEach(function (l) { if (l !== keep) { try { l.detach(); } catch (e3) { } } });
        } catch (e2) { }
      }, 900);
    } catch (e) { }
  }
  async runSelfCheck() {
    try {
      const doc = (typeof document !== 'undefined') ? document : null;
      const sbEl = doc ? doc.querySelector('.status-bar') : null;
      const ribbon = doc ? doc.querySelectorAll('.side-dock-ribbon-action') : [];
      const labels = [];
      for (let i = 0; i < ribbon.length; i++) { const a = ribbon[i].getAttribute('aria-label'); if (a) { labels.push(a); } }
      let viewTypes = [];
      try { const reg = this.app.viewRegistry && this.app.viewRegistry.viewByType; if (reg) { viewTypes = Object.keys(reg).filter(function (k) { return k.indexOf('ldt') === 0; }); } } catch (e1) { }
      const report = { at: new Date().toISOString(), statusBarFound: !!sbEl, statusBarText: sbEl ? String(sbEl.innerText || '').trim() : null, ribbonCount: ribbon.length, ribbonLabels: labels, hasOurRibbonLabel: labels.some(function (l) { return l.indexOf('人生决策树') >= 0; }), registeredViewTypes: viewTypes, popoutApi: { moveLeafToPopout: typeof this.app.workspace.moveLeafToPopout, openPopoutLeaf: typeof this.app.workspace.openPopoutLeaf }, pluginVersion: this.manifest && this.manifest.version };
      const path = '.ldt/ui-selfcheck.json';
      try { if (this.app.vault.adapter && typeof this.app.vault.adapter.mkdir === 'function') { await this.app.vault.adapter.mkdir('.ldt'); } } catch (e9) { }
      await this.app.vault.adapter.write(path, JSON.stringify(report, null, 1));
      new Notice('自检已写入 ' + path, 5000);
      return report;
    } catch (e) { new Notice('自检失败：' + ((e && e.message) || e)); return null; }
  }
  async openPopout() {
    try {
      const ws = this.app.workspace;
      let leaf = ws.getLeavesOfType(LEVELS_TYPE)[0];
      if (!leaf) { await this.activateLevels(); leaf = ws.getLeavesOfType(LEVELS_TYPE)[0]; }
      if (!leaf) { new Notice('打不开关卡地图'); return; }
      try { if (typeof document !== 'undefined' && document.body) { document.body.classList.remove('ldt-immersive'); } } catch (e0) { }
      try { if (this.app.commands && typeof this.app.commands.executeCommandById === 'function') { this.app.commands.executeCommandById('app:exit-fullscreen'); } } catch (e1) { }
      let w = null; let popLeaf = null;
      try { if (typeof ws.openPopoutLeaf === 'function') { const pop = ws.openPopoutLeaf(); if (pop) { popLeaf = pop; await pop.setViewState({ type: LEVELS_TYPE, active: true }); w = (pop && pop.getRoot && pop.getRoot()) || pop; } } } catch (e3) { w = null; }
      if (!w) { try { w = ws.moveLeafToPopout(leaf); } catch (e4) { w = null; } }
      // 定尺寸/移位的对象必须是真窗口：优先 popout 文档的 defaultView，其次 WorkspaceWindow.win
      let popWin = null;
      try {
        const v = popLeaf && popLeaf.view;
        const el = v && (v.containerEl || v.contentEl);
        const doc = el && el.ownerDocument;
        if (doc && doc.defaultView && doc.defaultView !== window) { popWin = doc.defaultView; }
      } catch (e10) { }
      if (!popWin && w && w.win && w.win !== window) { popWin = w.win; }
      try {
        if (popWin) {
          if (typeof popWin.moveTo === 'function') { popWin.moveTo(140, 120); }
          if (typeof popWin.resizeTo === 'function') { popWin.resizeTo(1200, 820); }
        }
      } catch (e5) { }
      if (this.settings && this.settings.debugPopout === true) {
        try {
          await new Promise(function (r) { setTimeout(r, 300); });
          await this.app.vault.adapter.write('.ldt/popout.json', JSON.stringify({ at: new Date().toISOString(), found: !!popWin, x: popWin ? popWin.screenX : null, y: popWin ? popWin.screenY : null, w: popWin ? popWin.innerWidth : null, h: popWin ? popWin.innerHeight : null }));
        } catch (e11) { }
      }
      new Notice(w ? '已在新窗口打开：可拖动标题栏移动、拖边缩放；全屏用系统 F11' : '新窗口未开成（当前版本可能不支持），可用主窗继续', 5000);
    } catch (e) { new Notice('新窗口打开失败：' + ((e && e.message) || e)); }
  }
  async activateAiView() {
    this.ui.aiOpen = true;
    const ws = this.app && this.app.workspace;
    try {
      const ls = (ws && ws.getLeavesOfType) ? (ws.getLeavesOfType(APP_TYPE) || []) : [];
      if (ls.length && ls[0].view && typeof ls[0].view.showPage === 'function') {
        if (ws.revealLeaf) { ws.revealLeaf(ls[0]); }
        return ls[0].view.showPage('assets');
      }
    } catch (e0) { }
    return this.openPage(APP_TYPE);
  }
  async activateAssets() { this.ui.aiOpen = false; return this.openPage(ASSETS_TYPE); }
  async activateLevels() { return this.openPage(LEVELS_TYPE); }
  // 工坊式外壳：顶部动作条 + 标签条 + 画布 + 右栏 + 状态条（纯 HTML，交互留到 v0.3）
  shellHtml(loaded, hero) {
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const st = loaded.stats || { nodes: 0, branches: 0, unlocked: 0, ep: { fact: 0, inferred: 0, redline: 0 } };
    const ep = st.ep || { fact: 0, inferred: 0, redline: 0 };
    let body;
    if (loaded.ok) {
      body = loaded.html;
    } else {
      body = '<div class="ldt-refusal"><b>⛔ 拒绝生成</b><div>' + esc(loaded.refusal) + '</div>'
        + ((loaded.reasons && loaded.reasons.length) ? '<ul>' + loaded.reasons.map((r) => '<li>' + esc(r) + '</li>').join('') + '</ul>' : '')
        + '<div class="ldt-hint">先跑 tools/import-model.cjs 把访谈 JSON 入库，或在插件设置里改模型路径。</div></div>';
    }
    const p = [];
    p.push('<div class="ldt-shell">');
    if (ONB && ONB.shouldShow(this.settings) && !(loaded && loaded.ok)) { p.push(ONB.buildGuideHtml()); }
    p.push('<div class="ldt-topbar"><div class="ldt-brand"><span class="ldt-logo">◈</span><div><div class="ldt-title">我的决策树' + (loaded && loaded.sample ? ' <span style="font-size:11px;color:var(--ldt-inferred);border:1px solid var(--ldt-inferred);border-radius:6px;padding:0 4px">样例·未入库</span>' : '') + '</div><div class="ldt-sub">个人模型引擎 v0.2 · 本地存储 · 自动保存</div></div></div>');
    p.push('<div class="ldt-actions"><span class="ldt-pill" data-act="reload">↻ 重新读取</span><span class="ldt-pill primary" data-act="new">＋ 新建一棵树</span>' + LDT_BTNS + '</div></div>');
    if (loaded && loaded.sample) { p.push('<div class="ldt-sample">这是随包样例（未写入 .ldt）。<span data-act="go-interview">去访谈生成我的树 →</span></div>'); }
    p.push(tabsBarHtml('tree'));
    if (hero && HERO) { p.push(HERO.renderBar(hero)); }
    p.push('<div class="ldt-kpistrip">'
      + '<span class="ldt-ks"><b>' + st.nodes + '</b>节点</span>'
      + '<span class="ldt-ks"><b>' + st.branches + '</b>分支</span>'
      + '<span class="ldt-ks"><b>' + (ep.redline || 0) + '</b>红线</span>'
      + '<span class="ldt-ks is-muted">事实 ' + (ep.fact || 0) + ' · 推测 ' + (ep.inferred || 0) + '</span>'
      + '</div>');
    p.push('<div class="ldt-body">');
    p.push('<div class="ldt-canvas">' + body + '</div>');
    p.push('<div class="ldt-rail">');
    p.push('<div class="ldt-panel"><div class="ldt-panel-t">数据源</div><div class="ldt-src">' + esc(loaded && loaded.sample ? 'sample/person-model.json（样例，未写入 .ldt）' : this.modelPath()) + '</div><div class="ldt-muted">本地 JSON；写入只在本机；不入库、不上传。</div></div>');
    if (loaded && loaded.branches && loaded.branches.length) {
      p.push('<div class="ldt-panel"><div class="ldt-panel-t">三条路' + (loaded.scenario ? '（' + esc(loaded.scenario.label) + '）' : '') + '</div>');
      loaded.branches.forEach(function (b) {
        const color = b.unlocked === false ? 'var(--ldt-inferred)' : 'var(--ldt-accent)';
        p.push('<div style="border-left:3px solid ' + color + ';padding:6px 8px;margin:6px 0;background:var(--ldt-dlg);border-radius:8px"><b style="font-size:12px">' + esc(b.title) + '</b> <span style="font-size:11px;color:' + color + '">' + (b.unlocked === false ? '锁着' : '可走') + '</span>'
          + ((b.needs && b.needs.length) ? '<div style="font-size:11px;color:var(--ldt-muted);margin-top:2px">先补：' + esc(b.needs.join('、')) + '</div>' : '') + '</div>');
      });
      p.push('</div>');
    }
    p.push('<div class="ldt-panel"><div class="ldt-panel-t">怎么读这棵树</div><div class="ldt-muted">蓝＝事实 · 黄＝推测 · 红＝未验证高风险；虚线分支＝条件未满足，先补证据再解锁。</div></div>');
    p.push('</div></div>');
    if (UP && UP.shouldShow({ demo: this.effectiveDemo(), licensed: this.isLicensed() })) { p.push(UP.buildHtml(this.demoState())); }
    p.push('<div class="ldt-statusbar"><span>' + st.nodes + ' 节点</span><span>' + st.branches + ' 分支</span><span>' + (st.unlocked || 0) + ' 已解锁</span><span class="ldt-spacer"></span><span>本地 JSON · 只读</span></div>');
    p.push('</div>');
    return p.join('');
  }
  // ===== 三层记忆（骨架 v2 §12）=====
  memPath() { return '.ldt/memory.json'; }
  async readBundled(rel) {
    const ad = this.app.vault.adapter;
    const tries = [rel, (this.app.vault.configDir || '.obsidian') + '/plugins/' + this.manifest.id + '/' + rel];
    for (const t of tries) { try { return await ad.read(t); } catch (e) { /* 下一个 */ } }
    return null;
  }
  async loadMemory() {
    const raw = await this.readBundled(this.memPath());
    if (raw == null) {
      const seed = (await this.readBundled('sample/memory.json')) || (await this.readBundled('data/memory-U-DEMO-001.json'));
      let layers = MEM.blank();
      if (seed) { try { layers = MEM.normalize(JSON.parse(seed).layers); } catch (e) { layers = MEM.blank(); } }
      /* 2026-11-10 修：样例记忆只内存渲染，不落盘（删除后不得复活） */
      return layers;
    }
    this._memRaw = raw;
    try { return MEM.normalize(JSON.parse(raw).layers); } catch (e) { return MEM.blank(); }
  }
  async writeMemory(store) {
    const ad = this.app.vault.adapter;
    if (typeof ad.write !== 'function') { return 'nowrite'; }
    try { if (typeof ad.mkdir === 'function') { await ad.mkdir('.ldt'); } } catch (e) { /* 已存在 */ }
    const body = JSON.stringify({ schemaVersion: 2, layers: store }, null, 1) + '\n';
    await ad.write(this.memPath(), body);
    this._memRaw = body;
    return 'ok';
  }
  toggleExpand(id) {
    const list = (this.ui && this.ui.memExpand) || [];
    const i = list.indexOf(id);
    if (i >= 0) { list.splice(i, 1); } else { list.push(id); }
    this.ui.memExpand = list;
  }
  async saveMemoryItem(layer, id, text) {
    const st = await this.loadMemory();
    const r = MEM.edit(st, layer, id, text);
    if (!r.ok) { new Notice(r.error); return r; }
    await this.writeMemory(r.store);
    this.ui.memEdit = null;
    new Notice(layer + ' ' + id + ' 已保存（改错字保留原文哈希）');
    return { ok: true };
  }
  async deleteMemoryL1(id) {
    const st = await this.loadMemory();
    const r = MEM.removeL1(st, id);
    if (!r.ok) { new Notice(r.error); return r; }
    await this.writeMemory(r.store);
    this.ui.memExpand = ((this.ui && this.ui.memExpand) || []).concat([id]);
    new Notice('已软删 ' + id + (r.affected.length ? '；' + r.affected.length + ' 条上层标「已失去来源」' : '；没有上层受影响'), 9000);
    return { ok: true, affected: r.affected };
  }
  async restoreMemoryL1(id) {
    const st = await this.loadMemory();
    const r = MEM.restoreL1(st, id);
    if (!r.ok) { new Notice(r.error); return r; }
    await this.writeMemory(r.store);
    new Notice('已恢复 ' + id + '：上层「已失去来源」自动清掉');
    return { ok: true };
  }
  async loadObserve() {
    const raw = await this.readBundled('.ldt/observe/observe-auto-summarize.log');
    const rows = raw ? OBS.parse(raw) : [];
    const revRaw = await this.readBundled('.ldt/observe/review.json');
    let reviewed = [];
    try { reviewed = revRaw ? (JSON.parse(revRaw).reviewed || []) : []; } catch (e) { reviewed = []; }
    return { rows: rows, reviewed: reviewed, gate: OBS.canSwitch(rows, reviewed) };
  }
  async loadModelData() {
    const raw = await this.readBundled(this.modelPath());
    try { return raw ? JSON.parse(raw) : { status: 'ok', nodes: [], branches: [], hidden_skills: [] }; } catch (e) { return { status: 'ok', nodes: [], branches: [], hidden_skills: [] }; }
  }
  memoryShellHtml(layers, model, ob) {
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tab = (this.ui && this.ui.memTab) || 'mem';
    const st = MEM.stats(layers);
    const p = [];
    p.push('<div class="ldt-shell"><div class="ldt-topbar"><div class="ldt-brand"><span class="ldt-logo">◈</span><div><div class="ldt-title">三层记忆</div><div class="ldt-sub">L1 原始 → L2 摘要 → L3 综合 · 本地</div></div></div>');
    p.push('<div class="ldt-actions"><span class="ldt-pill" data-act="mem-reload">↻ 重新读取</span><span class="ldt-pill" data-act="nav-import">导入更新 →</span><span class="ldt-pill primary" data-act="export-all">一键导出</span>' + LDT_BTNS + '</div></div>');
    p.push(tabsBarHtml('memory'));
    p.push('<div class="ldt-subtabs"><span class="ldt-subtab' + (tab === 'mem' ? ' is-on' : '') + '" data-act="mem-tab">三层记忆</span><span class="ldt-subtab' + (tab === 'diag' ? ' is-on' : '') + '" data-act="diag-tab">诊断三态</span></div>');
    p.push('<div class="ldt-body single"><div class="ldt-canvas">');
    if (this.ui && this.ui.policy) {
      p.push('<div class="ldt-policy"><pre>' + esc(PRIV.POLICY) + '</pre><div class="ldt-mem-ops"><span class="ldt-op" data-act="privacy-close">收起</span></div></div>');
    }
    p.push(tab === 'diag' ? DIAG.renderHtml(model || {}) : MEM.renderHtml(layers, { expand: (this.ui && this.ui.memExpand) || [], editing: this.ui && this.ui.memEdit ? this.ui.memEdit.id : null }));
    p.push('</div></div>');
    if (UP && UP.shouldShow({ demo: this.effectiveDemo(), licensed: this.isLicensed() })) { p.push(UP.buildHtml(this.demoState())); }
    p.push('<div class="ldt-privacy"><b>隐私三件</b>');
    p.push('<span class="ldt-op" data-act="privacy-policy">隐私政策</span>');
    p.push('<span class="ldt-op" data-act="export-all">一键导出（全部节点）</span>');
    p.push('<span class="ldt-op danger" data-act="purge-all">删除我的数据</span>');
    p.push('<span class="ldt-muted">只在本机 .ldt/；导出前自动脱敏；删除不可恢复（先导出备份）。</span></div>');
    /* 观察模式 UI 已按 2026-11-11 战役令隐藏（数据与 gate-T27 保留） */
    p.push('<div class="ldt-statusbar"><span>L1 ' + st.layers.L1.n + '</span><span>L2 ' + st.layers.L2.n + '</span><span>L3 ' + st.layers.L3.n + '</span><span class="ldt-spacer"></span><span>' + (this.ui && this.ui.lastExport ? '上次导出 ' + esc(this.ui.lastExport.path) : '本地 · 不联网') + '</span></div>');
    p.push('</div>');
    return p.join('');
  }
  async exportAll() {
    const model = await this.loadModelData();
    const layers = await this.loadMemory();
    const run = await this.loadRun();
    const rawPii = PRIV.piiScan({ model: model, run: run, layers: layers }).length;
    const pack = PRIV.exportPack({ model: model, run: run, layers: layers });
    const st = DEMO.exportStamp({ demo: this.settings && this.settings.demo === true, licensed: this.isLicensed(), demoStrict: this.settings && this.settings.demoStrict, demoUsed: this.settings && this.settings.demoUsed === true });
    pack.demo = st.demo;
    pack.demo_stamp = st.stamp;
    const chk = PRIV.checkExport(pack, model);
    const ad = this.app.vault.adapter;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fp = '.ldt/export/ldt-export-' + ts + '.json';
    let saved = false;
    if (typeof ad.write === 'function') {
      try { if (typeof ad.mkdir === 'function') { await ad.mkdir('.ldt/export'); } } catch (e) { /* 已存在 */ }
      await ad.write(fp, JSON.stringify(pack, null, 1));
      saved = true;
    }
    this.ui.lastExport = { path: fp, ok: chk.ok, pii: rawPii, nodes: chk.nodesOut, saved: saved };
    new Notice((chk.ok ? '已导出 ' : '导出但检查未过：') + chk.nodesOut + ' 个节点 → ' + fp + '（脱敏 ' + rawPii + ' 处 PII）' + (st.demo ? ' · 体验版导出' : ''), 10000);
    return { ok: chk.ok, path: fp, check: chk, pii: rawPii };
  }
  async purgeAll() {
    if (!(this.ui && this.ui.purgeArmed === true)) {
      this.ui.purgeArmed = true;
      new Notice('再点一次「删除我的数据」就真的清空（不可恢复）。要留着就先点「一键导出」。', 12000);
      return { ok: false, armed: true };
    }
    this.ui.purgeArmed = false;
    const ad = this.app.vault.adapter;
    const dir = '.ldt';
    let removed = 0;
    const kept = [];
    let hash16 = '';
    // 清空 .ldt/ 全部文件（含访谈草稿；不留备份、不留原话）
    let files = [];
    if (typeof ad.list === 'function') {
      try { const L = await ad.list(dir); files = (L && L.files) || []; } catch (e) { files = []; }
    }
    for (const f of files) {
      try { await ad.remove(f); removed += 1; } catch (e) { kept.push(f); }
    }
    this._run = null;
    this._runRaw = null;
    if (this.settings) {
      this.settings.lastPurge = { at: new Date().toISOString(), removed: removed, prev_model_sha16: hash16, kept: kept };
      try { await this.savePluginData(); } catch (e) { /* 设置不可写 */ }
    }
    new Notice('已删除：.ldt/ 全部文件（含访谈草稿）已清空；库内不留备份、不留原话。已导出到库外的文件请自己删。', 14000);
    this.refreshViews();
    return { ok: true, removed: removed, kept: kept, hash16: hash16 };
  }
  async activateMemory() { return this.openPage(MEMORY_TYPE); }
  // ===== 访谈入库（v0.2：一份访谈 → ≥15 节点且 check 8/8 PASS）=====
  demoAnswers() {
    return [
      '去年十月帮社团协调了个一百人的场地，还在预算内',
      '把部门三年的乱账在两周内理清了',
      '同事老是找我修电脑，说我比 IT 快',
      '我做的周报模板，后来全组都在用',
      '客户临时改需求，我通宵把方案重排了，第二天按时交付',
      '我自己提议做了个自动对账表，省了每周两小时',
      '活动报名从 40 人做到 120 人',
      '半年后还有人问我那个模板怎么做的',
      '同事遇到表格和流程问题先找我，上个月还帮财务理了一次报销流程',
      '整理一堆乱七八糟的资料，一坐就是三小时',
      '希望别人说我这人能把复杂的事讲明白',
      '存款只够 2 个月，房贷每月 7000',
      '怕失去现在的稳定收入，我妈说你要敢辞就别回家',
      '我表哥在做企业服务，认识不少老板',
      '大二想做社团公众号，做了三期没人看就停了'
    ];
  }
  interviewShellHtml(result) {
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const p = [];
    p.push('<div class="ldt-shell"><div class="ldt-topbar"><div class="ldt-brand"><span class="ldt-logo">◈</span><div><div class="ldt-title">访谈入库</div><div class="ldt-sub">15 题 · 约 15 分钟 · 生成你自己的树</div></div></div>');
    p.push('<div class="ldt-actions"><span class="ldt-pill" data-act="iv-demo">填入样例答案</span><span class="ldt-pill" data-act="iv-save">保存草稿</span><span class="ldt-pill primary" data-act="iv-build">生成我的树</span>' + LDT_BTNS + '</div></div>');
    p.push('<div class="ldt-body single"><div class="ldt-canvas">');
    if (UP && UP.shouldShow({ demo: this.effectiveDemo(), licensed: this.isLicensed() })) { p.push(UP.buildHtml(this.demoState())); }
    const qs = IV.QUESTIONS;
    ['A', 'B', 'C'].forEach((sec) => {
      p.push('<section class="ldt-iv-sec"><h3>' + esc(IV.SEC_NAME[sec]) + '</h3>');
      qs.filter((q) => q.sec === sec).forEach((q) => {
        p.push('<div class="ldt-iv-q"><label>Q' + q.id + ' · ' + esc(q.text) + '</label>');
        p.push('<textarea data-q="' + q.id + '" rows="2" placeholder="' + esc(q.hint) + '">' + esc(((this.ui.ivAnswers || [])[q.id - 1]) || '') + '</textarea></div>');
      });
      p.push('</section>');
    });
    if (result && result.ok) {
      const s = result.stats || {};
      p.push('<div class="ldt-iv-result ok"><b>已生成</b>：' + (s.nodes || 0) + ' 个节点（证据 ' + (s.evidence || 0) + ' · 能力 ' + (s.skills || 0) + ' · 风险 ' + (s.risk || 0) + ' · 资源 ' + (s.resource || 0) + '）；三层记忆 L1 ' + (s.L1 || 0) + '／L2 ' + (s.L2 || 0) + '／L3 ' + (s.L3 || 0) + '。这棵就是你的正式树，已存到 .ldt/person-model.json。<div class="ldt-mem-ops"><span class="ldt-op primary" data-act="iv-open-tree">看决策树</span><span class="ldt-op" data-act="iv-open-memory">看三层记忆</span></div></div>');
    } else if (result && result.draft) {
      const s = result.stats || {};
      const why = result.policy ? (esc(result.policy) + '。') : ('还差 ' + ((result.missing || []).length) + ' 题才能生成正式树。');
      p.push('<div class="ldt-iv-result warn"><b>草稿</b>：已填 ' + (s.filled || 0) + '/' + IV.QUESTIONS.length + ' 题，已组出约 ' + (s.nodes || 0) + ' 个节点（证据 ' + (s.evidence || 0) + ' · 能力 ' + (s.skills || 0) + '）。' + why + '草稿已存，关掉窗口也不会丢。</div>');
    } else if (result && result.saved) {
      p.push('<div class="ldt-iv-result ok">草稿已存：已填 ' + (result.filled || 0) + '/' + IV.QUESTIONS.length + ' 题（.ldt/interview-draft.json）</div>');
    } else if (result && result.error) {
      p.push('<div class="ldt-iv-result bad">' + esc(result.error) + '</div>');
    }
    p.push('<div class="ldt-muted" style="padding:6px 0 18px">数据只写本地：生成会覆盖 .ldt/person-model.json 与 .ldt/memory.json，旧文件自动备份成 .backup-iv-时间戳.json。</div>');
    p.push('</div></div></div>');
    return p.join('');
  }
  async loadDraft() {
    const raw = await this.readBundled('.ldt/interview-draft.json');
    if (!raw) { return { ok: false, filled: 0 }; }
    let d = null;
    try { d = JSON.parse(raw); } catch (e) { return { ok: false, filled: 0 }; }
    const r = IV.fromDraft(d);
    if (!r.ok) { return { ok: false, filled: 0 }; }
    this.ui.ivAnswers = r.answers;
    return { ok: true, filled: r.filled };
  }
  async saveDraft(answers) {
    const d = IV.draftOf(answers || []);
    if (d.filled < IV.MIN_DRAFT) { return { ok: false, error: '至少填 ' + IV.MIN_DRAFT + ' 题才能存草稿（现在 ' + d.filled + ' 题）', filled: d.filled }; }
    const ad = this.app.vault.adapter;
    if (typeof ad.write !== 'function') { return { ok: false, error: '这个库不支持写入', filled: d.filled }; }
    try { if (typeof ad.mkdir === 'function') { await ad.mkdir('.ldt'); } } catch (e) { /* 已存在 */ }
    await ad.write('.ldt/interview-draft.json', JSON.stringify(d, null, 1) + '\n');
    return { ok: true, filled: d.filled, path: '.ldt/interview-draft.json' };
  }
  async buildInterview(answers) {
    const pol = DEMO.policy({ demo: this.settings && this.settings.demo === true, licensed: this.isLicensed(), demoStrict: this.settings && this.settings.demoStrict, demoUsed: this.settings && this.settings.demoUsed === true });
    if (!pol.canGenerate) {
      const only = IV.buildDraft(answers);
      if (only.ok) { await this.saveDraft(answers); this.ui.ivResult = { ok: false, draft: true, stats: only.stats, missing: only.missing, policy: pol.message }; new Notice(pol.message, 10000); return only; }
      this.ui.ivResult = { ok: false, error: only.error, policy: pol.message };
      new Notice(only.error, 9000);
      return { ok: false, error: only.error };
    }
    const res = IV.build(answers, { alias: (this.settings && this.settings.alias) || '我的树' });
    if (!res.ok) {
      const draft = IV.buildDraft(answers);
      if (draft.ok) {
        await this.saveDraft(answers);
        this.ui.ivResult = { ok: false, draft: true, stats: draft.stats, missing: draft.missing };
        new Notice('先存了草稿：已填 ' + draft.filled + '/' + IV.QUESTIONS.length + ' 题，还差 ' + draft.missing.length + ' 题生成正式树', 9000);
        return draft;
      }
      this.ui.ivResult = { ok: false, error: draft.error || res.error };
      new Notice(draft.error || res.error, 9000);
      return { ok: false, error: draft.error || res.error };
    }
    const ad = this.app.vault.adapter;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const targets = [this.modelPath(), '.ldt/memory.json'];
    for (const tp of targets) {
      try { const raw = await ad.read(tp); await ad.write(tp.replace(/\.json$/i, '') + '.backup-iv-' + stamp + '.json', raw); } catch (e) { /* 首次没有 */ }
    }
    await ad.write(this.modelPath(), JSON.stringify(res.model, null, 1) + '\n');
    await this.writeMemory(res.layers);
    this._run = null; this._runRaw = null;
    this.ui.ivResult = { ok: true, stats: res.stats };
    if (pol.mode === 'trial') { this.settings.demoUsed = true; await this.savePluginData(); }
    new Notice('生成好了：' + res.stats.nodes + ' 个节点 · 三层记忆 L1 ' + res.stats.L1 + '／L2 ' + res.stats.L2 + '／L3 ' + res.stats.L3 + (pol.mode === 'trial' ? '（体验额度已用完）' : ''), 10000);
    this.refreshViews();
    return res;
  }
  async dismissGuide() {
    this.settings = ONB.dismiss(this.settings);
    await this.savePluginData();
    new Notice('好的，以后不再显示这段引导（设置里可看「3 步上手」说明）');
    this.refreshViews();
    return { ok: true };
  }
  demoState() {
    const pol = DEMO.policy({ demo: this.settings && this.settings.demo === true, licensed: this.isLicensed(), demoStrict: this.settings && this.settings.demoStrict, demoUsed: this.settings && this.settings.demoUsed === true });
    if (!pol.demo) { return { remaining: 0, used: false }; }
    if (pol.strict === 'once') { return { remaining: pol.canGenerate ? 1 : 0, used: !pol.canGenerate }; }
    return { remaining: 0, used: false };
  }
  async doctorReport() {
    const ad = this.app.vault.adapter;
    const readState = async (p, isJson) => {
      try {
        const raw = await ad.read(p);
        if (!isJson) { return { exists: true, bytes: String(raw).length }; }
        const j = JSON.parse(raw);
        return { exists: true, bytes: String(raw).length, data: j };
      } catch (e) {
        if (e && /not found|ENOENT|不存在/i.test(String(e.message || e))) { return { exists: false }; }
        return { exists: true, bad: true };
      }
    };
    const model = await readState(this.modelPath(), true);
    const mem = await readState('.ldt/memory.json', true);
    const run = await readState(this.runPath(), true);
    const files = {
      model: { exists: !!model.exists, bad: !!model.bad, nodes: model.data && model.data.nodes ? model.data.nodes.length : 0 },
      memory: { exists: !!mem.exists, bad: !!mem.bad, L1: mem.data && mem.data.layers ? mem.data.layers.L1.length : 0, L2: mem.data && mem.data.layers ? mem.data.layers.L2.length : 0, L3: mem.data && mem.data.layers ? mem.data.layers.L3.length : 0 },
      run: { exists: !!run.exists, levels: run.data && run.data.levels ? Object.keys(run.data.levels).length : 0 }
    };
    const rep = DOC.diagnose({ version: this.manifest.version, at: new Date().toISOString().slice(0, 16).replace('T', ' '), settings: { licensed: this.isLicensed(), tier: 'standard', demoStrict: this.settings && this.settings.demoStrict }, files: files });
    let copied = false;
    try { if (navigator && navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(rep.text); copied = true; } } catch (e) { copied = false; }
    new Notice(rep.text.split('\n')[0] + (copied ? '（已复制，整段发给卖家即可）' : '（复制失败，请手动从控制台取）'), 12000);
    if (!copied) { try { console.log(rep.text); } catch (e) { /* 控制台不可用 */ } }
    this._lastDoctor = rep;
    return rep;
  }
  openLicense() {
    try {
      this.app.setting.open();
      this.app.setting.openTabById(this.manifest.id);
      return true;
    } catch (e) {
      new Notice('打开：设置 → 人生决策树 → 兑换码（粘贴 SB- 开头的码后保存）', 9000);
      return false;
    }
  }
  async activateInterview() { return this.openPage(INTERVIEW_TYPE); }
  modelPath() {
    const p = (this.settings && this.settings.modelPath) || DEFAULT_MODEL_PATH;
    return String(p).replace(/^\/+/, '');
  }
  async savePluginData() {
    await this.saveData(this.settings);
  }
  async loadModel() {
    let sampleSeed = false;
    const p = this.modelPath();
    let raw = '';
    try {
      raw = await this.app.vault.adapter.read(p);
    } catch (e) {
      // 首装：用随包样例播种，否则陌生人第一屏就是「读不到本地模型」
      const seed = await this.readBundled('sample/person-model.json');
      if (!seed) { return { ok: false, refusal: '读不到本地模型：' + p + '（' + ((e && e.message) || e) + '）', reasons: [] }; }
      raw = seed;
      sampleSeed = true;
      /* 2026-11-10 修：样例只内存渲染，不落盘——否则「删除我的数据」后又被播种回来 */
    }
    let M = null;
    try {
      M = JSON.parse(raw);
    } catch (e) {
      return { ok: false, refusal: '模型文件不是合法 JSON：' + p, reasons: [(e && e.message) || String(e)] };
    }
    let model = M;
    if (DIAG) { try { model = DIAG.decorate(M); } catch (e) { model = M; } }
    const out = TREE.buildTreeHtml(model);
    out.sample = sampleSeed;
    out.branches = (model && model.branches) || [];
    out.scenario = (model && model.scenario) || null;
    return out;
  }
  async openPage(type) { return this.openPageWith(this.app.workspace, type); }
  async openPageWith(ws, type) {
    const tab = TAB_OF_TYPE[type] || 'tree';
    const vtOf = function (l) { try { return (l && l.view && typeof l.view.getViewType === 'function') ? l.view.getViewType() : ''; } catch (e) { return ''; } };
    // 1) 已有 App 容器（当前活跃叶子或任意一个）→ 只在容器内换页
    let appLeaf = (vtOf(ws.activeLeaf) === APP_TYPE) ? ws.activeLeaf : null;
    if (!appLeaf) { const ls = ws.getLeavesOfType(APP_TYPE); if (ls && ls.length) { appLeaf = ls[0]; } }
    if (appLeaf && appLeaf.view && typeof appLeaf.view.showPage === 'function') {
      ws.revealLeaf(appLeaf);
      return appLeaf.view.showPage(tab);
    }
    // 2) 没有容器：在活跃 ldt 叶子或新标签页里开一次
    const LEGACY = [VIEW_TYPE, LEVELS_TYPE, ASSETS_TYPE, CASES_TYPE, IMPORT_TYPE, MEMORY_TYPE, BRAIN_TYPE];
    let leaf = (vtOf(ws.activeLeaf) && LEGACY.indexOf(vtOf(ws.activeLeaf)) >= 0) ? ws.activeLeaf : null;
    if (!leaf) { for (let i = 0; i < LEGACY.length; i += 1) { const ls = ws.getLeavesOfType(LEGACY[i]); if (ls && ls.length) { leaf = ls[0]; break; } } }
    if (!leaf) { leaf = (typeof ws.getLeaf === 'function' ? ws.getLeaf('tab') : null) || ws.getRightLeaf(false); }
    if (!leaf) { new Notice('打开页面失败：拿不到标签页'); return { ok: false }; }
    try { await leaf.setViewState({ type: APP_TYPE, active: true }); } catch (e) { new Notice('切换页面失败：' + ((e && e.message) || e)); return { ok: false }; }
    ws.revealLeaf(leaf);
    const v = leaf.view;
    if (v && typeof v.showPage === 'function') { return v.showPage(tab); }
    return { ok: true, reused: true };
  }
  async activateView() { return this.activateAssets(); }  // 2026-11-14：旧决策树页已并入资产库
  enterImmersive() {
    const ws = this.app && this.app.workspace;
    if (!ws) { return { ok: false }; }
    const cmd = (id) => { try { if (this.app.commands && typeof this.app.commands.executeCommandById === 'function') { this.app.commands.executeCommandById(id); return true; } } catch (e) { } return false; };
    const leftOpen = !(ws.leftSplit && ws.leftSplit.collapsed);
    const rightOpen = !(ws.rightSplit && ws.rightSplit.collapsed);
    if (leftOpen) { cmd('app:toggle-left-sidebar'); }
    if (rightOpen) { cmd('app:toggle-right-sidebar'); }
    try { if (ws.leftSplit && typeof ws.leftSplit.collapse === 'function') { ws.leftSplit.collapse(); } } catch (e) { /* 无左栏 */ }
    try { if (ws.rightSplit && typeof ws.rightSplit.collapse === 'function') { ws.rightSplit.collapse(); } } catch (e) { /* 无右栏 */ }
    try { if (ws.leftSplit && ws.leftSplit.containerEl) { ws.leftSplit.containerEl.style.display = 'none'; } } catch (e) { }
    try { if (ws.rightSplit && ws.rightSplit.containerEl) { ws.rightSplit.containerEl.style.display = 'none'; } } catch (e) { }
    try { if (typeof document !== 'undefined' && document.body) { document.body.classList.add('ldt-immersive'); } } catch (e) { }
    this._immersive = true;
    return { ok: true, immersive: true };
  }
  exitImmersive() {
    const ws = this.app && this.app.workspace;
    if (!ws) { return { ok: false }; }
    const cmd = (id) => { try { if (this.app.commands && typeof this.app.commands.executeCommandById === 'function') { this.app.commands.executeCommandById(id); return true; } } catch (e) { } return false; };
    if (ws.leftSplit && ws.leftSplit.collapsed) { cmd('app:toggle-left-sidebar'); }
    if (ws.rightSplit && ws.rightSplit.collapsed) { cmd('app:toggle-right-sidebar'); }
    try { if (ws.leftSplit && typeof ws.leftSplit.expand === 'function') { ws.leftSplit.expand(); } } catch (e) { }
    try { if (ws.rightSplit && typeof ws.rightSplit.expand === 'function') { ws.rightSplit.expand(); } } catch (e) { }
    try { if (ws.leftSplit && ws.leftSplit.containerEl) { ws.leftSplit.containerEl.style.display = ''; } } catch (e) { }
    try { if (ws.rightSplit && ws.rightSplit.containerEl) { ws.rightSplit.containerEl.style.display = ''; } } catch (e) { }
    try { if (typeof document !== 'undefined' && document.body) { document.body.classList.remove('ldt-immersive'); } } catch (e) { }
    this._immersive = false;
    return { ok: true, immersive: false };
  }
  toggleImmersive() { return this._immersive ? this.exitImmersive() : this.enterImmersive(); }
  refreshViews() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
      if (leaf.view && typeof leaf.view.renderModel === 'function') { leaf.view.renderModel(); }
    });
    this.app.workspace.getLeavesOfType(LEVELS_TYPE).forEach((leaf) => {
      if (leaf.view && typeof leaf.view.renderMap === 'function') { leaf.view.renderMap(); }
    });
    this.app.workspace.getLeavesOfType(MEMORY_TYPE).forEach((leaf) => {
      if (leaf.view && typeof leaf.view.renderMemory === 'function') { leaf.view.renderMemory(); }
    });
    this.app.workspace.getLeavesOfType(INTERVIEW_TYPE).forEach((leaf) => {
      if (leaf.view && typeof leaf.view.renderInterview === 'function') { leaf.view.renderInterview(); }
    });
  }
}

module.exports = LdtPlugin;
