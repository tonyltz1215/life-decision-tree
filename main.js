/* eslint-disable */
'use strict';
// main.js - 人生决策树 Obsidian 插件（骨架 v2 形态；界面按「蒸馏工坊」改版：全幅外壳 + 顶部动作条 + 标签条 + 右栏）
// 铁律：只读本地 JSON、只渲染；不联网、不调外部模型。拒绝态：读不到／坏 JSON／数据不足 ⇒ 拒绝条，绝不静默给结论
const obsidian = require('obsidian');
const Plugin = obsidian.Plugin;
const ItemView = obsidian.ItemView;
const PluginSettingTab = obsidian.PluginSettingTab;
const Setting = obsidian.Setting;
const Notice = obsidian.Notice;
let TREE = null; // onload 时按 manifest.dir 绝对路径加载：Obsidian 插件 require 不支持相对路径（实测 Cannot find module './lib/tree-view.js'）
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
const LEVELS_TYPE = 'ldt-levels';
const MEMORY_TYPE = 'ldt-memory';
const INTERVIEW_TYPE = 'ldt-interview';

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
  async onOpen() { await this.renderModel(); }
  async renderModel() {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host) { return; }
    host.empty();
    host.addClass('ldt-view');
    const loaded = await this.plugin.loadModel();
    host.innerHTML = this.plugin.shellHtml(loaded);
    if (typeof host.querySelector === 'function') {
      const bind = (sel, fn) => { const el = host.querySelector(sel); if (el && typeof el.addEventListener === 'function') { el.addEventListener('click', fn); } };
      bind('[data-act="reload"]', () => { this.renderModel(); });
      bind('[data-act="new"]', () => { new Notice('新建树：随 v0.3 写入入口一起做（当前只读渲染）'); });
      bind('[data-act="open-memory"]', () => { this.plugin.activateMemory(); });
      bind('[data-act="guide-dismiss"]', async () => { await this.plugin.dismissGuide(); this.renderModel(); });
      bind('[data-act="guide-interview"]', () => { this.plugin.activateInterview(); });
      bind('[data-act="guide-export"]', async () => { await this.plugin.exportAll(); this.renderModel(); });
      bind('[data-act="guide-sample"]', () => { this.renderModel(); });
      bind('[data-act="open-license"]', () => { this.openLicense(); });
      bind('[data-act="copy-code-path"]', () => { new Notice('兑换码由卖家发给你（SB- 开头）。填法：设置 → 人生决策树 → 兑换码 → 粘贴 → 保存', 9000); });
    }
    if (typeof host.querySelector === 'function') {
      const bind = (sel, fn) => { const el = host.querySelector(sel); if (el && typeof el.addEventListener === 'function') { el.addEventListener('click', fn); } };
      bind('[data-act="reload"]', () => { this.renderModel(); });
      bind('[data-act="new"]', () => { new Notice('新建树：随 v0.3 写入入口一起做（当前只读渲染）'); });
    }
  }
}

class LdtLevelsView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() { return LEVELS_TYPE; }
  getDisplayText() { return '关卡地图'; }
  getIcon() { return 'gamepad-2'; }
  async onOpen() { await this.renderMap(); }
  async renderMap() {
    const host = (this.containerEl && this.containerEl.children && this.containerEl.children[1]) || this.containerEl;
    if (!host) { return; }
    host.empty();
    host.addClass('ldt-view');
    const run = await this.plugin.loadRun();
    host.innerHTML = this.plugin.mapShellHtml(this.plugin.loadLevels(run));
    if (typeof host.querySelectorAll !== 'function') { return; }
    const self = this;
    const each = (sel, fn) => { host.querySelectorAll(sel).forEach((el) => { el.addEventListener('click', (ev) => { if (ev && ev.preventDefault) { ev.preventDefault(); } fn(el); }); }); };
    const rerender = () => { self.renderMap(); };
    if (self.plugin.ui && self.plugin.ui.drawer) { const d = host.querySelector('.ldt-drawer'); if (d && typeof d.scrollIntoView === 'function') { d.scrollIntoView({ block: 'nearest' }); } }
    each('[data-act="reload"]', rerender);
    each('[data-act="evidence"]', (el) => { self.plugin.openDrawer(el.getAttribute('data-lv')); rerender(); });
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
    each('[data-diff]', async (el) => { self.plugin.settings.mapDiff = el.getAttribute('data-diff'); await self.plugin.savePluginData(); rerender(); });
    each('[data-arch]', async (el) => { self.plugin.settings.mapArch = el.getAttribute('data-arch'); await self.plugin.savePluginData(); rerender(); });
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
    const ob = await this.plugin.loadObserve();
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

class LdtPlugin extends Plugin {
  async onload() {
    this.ui = { drawer: null, exportCheck: null, memExpand: [], memEdit: null, memTab: 'mem', policy: false, purgeArmed: false, lastExport: null, ivResult: null, ivAnswers: [] };
    this.settings = Object.assign({ modelPath: '', mapArch: 'pipeline', mapDiff: 'standard', demo: false, shareStrategy: false, license: '', soldCount: 0, deepseekKey: '', demoStrict: 'once', demoUsed: false }, await this.loadData());
    TREE = require(this.pluginRoot() + '/lib/tree-view.js');
    LEVELS = require(this.pluginRoot() + '/lib/level-view.js');
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
    this.registerView(MEMORY_TYPE, (leaf) => new LdtMemoryView(leaf, this));
    this.registerView(INTERVIEW_TYPE, (leaf) => new LdtInterviewView(leaf, this));
    this.addRibbonIcon('git-fork', '打开人生决策树', () => { this.activateView(); });
    this.addCommand({ id: 'open-tree', name: '打开决策树视图', callback: () => { this.activateView(); } });
    this.addCommand({ id: 'reload-model', name: '重新读取本地模型', callback: () => { this.refreshViews(); } });
    this.addCommand({ id: 'open-levels', name: '打开关卡地图', callback: () => { this.activateLevels(); } });
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
  mapShellHtml(loaded) {
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]));
    const st = loaded.stats || { levels: 0, done: 0, archetype: 'pipeline', difficulty: 'standard' };
    const nameOf = (id, list) => { const f = (list || []).filter((x) => x.id === id)[0]; return f ? f.name : id; };
    const archName = st.archName || nameOf(st.archetype, []);
    const diffName = st.diffName || nameOf(st.difficulty, []);
    const p = [];
    p.push('<div class="ldt-shell">');
    p.push('<div class="ldt-topbar"><div class="ldt-brand"><span class="ldt-logo">◈</span><div><div class="ldt-title">我的决策树</div><div class="ldt-sub">职业骨架 · 12 关 · 本地只读</div></div></div>');
    p.push('<div class="ldt-actions"><span class="ldt-pill">决策树</span><span class="ldt-pill primary">关卡地图</span>' + (!this.isLicensed() ? '<span class="ldt-pill" data-act="license">未激活 · 填兑换码</span>' : (this.settings && this.settings.demo === true ? '<span class="ldt-pill" data-act="promote">体验版 · 升级</span>' : '')) + '</div></div>');
    p.push('<div class="ldt-tabs"><span class="ldt-tab">决策树</span><span class="ldt-tab is-active">关卡地图</span><span class="ldt-tab is-off">替代率罗盘<i>待接入</i></span><span class="ldt-tab is-off">三张卷<i>待接入</i></span></div>');
    p.push('<div class="ldt-body single"><div class="ldt-canvas">' + (loaded.ok ? loaded.html : '<div class="ldt-refusal"><b>⛔ 暂不生成</b><div>' + esc(loaded.refusal || '') + '</div></div>') + '</div></div>');
    p.push('<div class="ldt-statusbar"><span>' + st.levels + ' 关</span><span>已点亮 ' + (st.done || 0) + '</span><span>' + esc(archName) + ' · ' + esc(diffName) + '</span><span class="ldt-spacer"></span><span>本地骨架 · 不联网</span></div>');
    p.push('</div>');
    return p.join('');
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
  loadLevels(run) {
    const o = {
      archetype: (this.settings && this.settings.mapArch) || 'pipeline',
      difficulty: (this.settings && this.settings.mapDiff) || 'standard',
      run: run || { levels: {} },
      drawer: this.ui && this.ui.drawer ? this.ui.drawer : null,
      exportCheck: this.ui && this.ui.exportCheck ? this.ui.exportCheck : null,
      demoMode: this.effectiveDemo()
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
    if (!level) { new Notice('先点一张关卡卡的「复制指令」'); return ''; }
    const text = LEVELS.buildPrompt(level, arch, diff);
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
    if (!level) { return { ok: false, msg: '找不到这一关' }; }
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
  async activateLevels() {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(LEVELS_TYPE)[0];
    if (!leaf) {
      leaf = (typeof ws.getLeaf === 'function' ? ws.getLeaf('tab') : null) || ws.getRightLeaf(false);
      await leaf.setViewState({ type: LEVELS_TYPE, active: true });
    }
    ws.revealLeaf(leaf);
  }
  // 工坊式外壳：顶部动作条 + 标签条 + 画布 + 右栏 + 状态条（纯 HTML，交互留到 v0.3）
  shellHtml(loaded) {
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
    if (ONB && ONB.shouldShow(this.settings)) { p.push(ONB.buildGuideHtml()); }
    if (UP && UP.shouldShow({ demo: this.effectiveDemo(), licensed: this.isLicensed() })) { p.push(UP.buildHtml(this.demoState())); }
    p.push('<div class="ldt-topbar"><div class="ldt-brand"><span class="ldt-logo">◈</span><div><div class="ldt-title">我的决策树</div><div class="ldt-sub">个人模型引擎 v0.2 · 本地只读</div></div></div>');
    p.push('<div class="ldt-actions"><span class="ldt-pill" data-act="reload">↻ 重新读取</span><span class="ldt-pill primary" data-act="new">＋ 新建一棵树</span></div></div>');
    p.push('<div class="ldt-tabs"><span class="ldt-tab is-active">决策树</span><span class="ldt-tab is-off">替代率罗盘<i>待接入</i></span><span class="ldt-tab is-off">三张卷<i>待接入</i></span><span class="ldt-tab" data-act="open-memory">三层记忆</span><span class="ldt-tab" data-act="open-memory">诊断三态</span></div>');
    p.push('<div class="ldt-body">');
    p.push('<div class="ldt-canvas">' + body + '</div>');
    p.push('<div class="ldt-rail">');
    p.push('<div class="ldt-panel"><div class="ldt-panel-t">这一刻的读数</div><div class="ldt-kpis">');
    p.push('<div class="ldt-kpi"><b>' + st.nodes + '</b><span>节点</span></div>');
    p.push('<div class="ldt-kpi"><b>' + st.branches + '</b><span>分支</span></div>');
    p.push('<div class="ldt-kpi"><b>' + (ep.redline || 0) + '</b><span>红线</span></div>');
    p.push('</div><div class="ldt-muted">事实 ' + (ep.fact || 0) + ' · 推测 ' + (ep.inferred || 0) + '</div></div>');
    p.push('<div class="ldt-panel"><div class="ldt-panel-t">数据源</div><div class="ldt-src">' + esc(this.modelPath()) + '</div><div class="ldt-muted">只读本地 JSON；不入库、不上传。</div></div>');
    p.push('<div class="ldt-panel"><div class="ldt-panel-t">怎么读这棵树</div><div class="ldt-muted">蓝＝事实 · 黄＝推测 · 红＝未验证高风险；虚线分支＝条件未满足，先补证据再解锁。</div></div>');
    p.push('</div></div>');
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
      await this.writeMemory(layers);
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
    p.push('<div class="ldt-actions"><span class="ldt-pill" data-act="mem-reload">↻ 重新读取</span><span class="ldt-pill primary" data-act="export-all">一键导出</span></div></div>');
    p.push('<div class="ldt-tabs"><span class="ldt-tab' + (tab === 'mem' ? ' is-active' : '') + '" data-act="mem-tab">三层记忆</span><span class="ldt-tab' + (tab === 'diag' ? ' is-active' : '') + '" data-act="diag-tab">诊断三态</span><span class="ldt-tab" data-act="open-tree">决策树</span></div>');
    p.push('<div class="ldt-body single"><div class="ldt-canvas">');
    if (UP && UP.shouldShow({ demo: this.effectiveDemo(), licensed: this.isLicensed() })) { p.push(UP.buildHtml(this.demoState())); }
    if (this.ui && this.ui.policy) {
      p.push('<div class="ldt-policy"><pre>' + esc(PRIV.POLICY) + '</pre><div class="ldt-mem-ops"><span class="ldt-op" data-act="privacy-close">收起</span></div></div>');
    }
    p.push(tab === 'diag' ? DIAG.renderHtml(model || {}) : MEM.renderHtml(layers, { expand: (this.ui && this.ui.memExpand) || [], editing: this.ui && this.ui.memEdit ? this.ui.memEdit.id : null }));
    p.push('</div></div>');
    p.push('<div class="ldt-privacy"><b>隐私三件</b>');
    p.push('<span class="ldt-op" data-act="privacy-policy">隐私政策</span>');
    p.push('<span class="ldt-op" data-act="export-all">一键导出（全部节点）</span>');
    p.push('<span class="ldt-op danger" data-act="purge-all">删除我的数据</span>');
    p.push('<span class="ldt-muted">只在本机 .ldt/；导出前自动脱敏；删除不可恢复（先导出备份）。</span></div>');
    p.push('<div class="ldt-observe-panel"><div class="ldt-panel-t">观察模式</div>');
    p.push('<div class="ldt-muted">auto-summarize · 记录 ' + ((ob && ob.rows) ? ob.rows.length : 0) + ' 条 · 人工核对 ' + ((ob && ob.reviewed) ? ob.reviewed.length : 0) + ' 条 · ' + (ob && ob.gate && ob.gate.ok ? '可切自动' : '观察期（未切自动）') + '</div>');
    p.push(ob && ob.gate && !ob.gate.ok ? '<div class="ldt-muted">' + esc(ob.gate.reasons.join('；')) + '</div>' : '');
    p.push('</div>');
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
    const pg = PRIV.purge();
    const mp = this.modelPath();
    let raw = null;
    try { raw = await ad.read(mp); } catch (e) { raw = null; }
    const bak = mp.replace(/\.json$/i, '') + '.backup-purge-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    if (raw != null && typeof ad.write === 'function') { await ad.write(bak, raw); }
    if (typeof ad.write === 'function') { await ad.write(mp, JSON.stringify(pg.model, null, 1) + '\n'); }
    await this.writeMemory(pg.layers);
    this._run = pg.run;
    await this.saveRun(pg.run);
    new Notice('已删除：本地库（节点／三层记忆／进度）已清空；备份在 ' + bak + '。已导出的文件请自己删。', 14000);
    this.refreshViews();
    return { ok: true, backup: bak };
  }
  async activateMemory() {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(MEMORY_TYPE)[0];
    if (!leaf) {
      leaf = (typeof ws.getLeaf === 'function' ? ws.getLeaf('tab') : null) || ws.getRightLeaf(false);
      await leaf.setViewState({ type: MEMORY_TYPE, active: true });
    }
    ws.revealLeaf(leaf);
  }
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
    p.push('<div class="ldt-actions"><span class="ldt-pill" data-act="iv-demo">填入样例答案</span><span class="ldt-pill" data-act="iv-save">保存草稿</span><span class="ldt-pill primary" data-act="iv-build">生成我的树</span></div></div>');
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
      p.push('<div class="ldt-iv-result ok"><b>已生成</b>：' + (s.nodes || 0) + ' 个节点（证据 ' + (s.evidence || 0) + ' · 能力 ' + (s.skills || 0) + ' · 风险 ' + (s.risk || 0) + ' · 资源 ' + (s.resource || 0) + '）；三层记忆 L1 ' + (s.L1 || 0) + '／L2 ' + (s.L2 || 0) + '／L3 ' + (s.L3 || 0) + '。<div class="ldt-mem-ops"><span class="ldt-op primary" data-act="iv-open-tree">看决策树</span><span class="ldt-op" data-act="iv-open-memory">看三层记忆</span></div></div>');
    } else if (result && result.draft) {
      const s = result.stats || {};
      const why = result.policy ? (esc(result.policy) + '。') : ('还差 ' + ((result.missing || []).length) + ' 题才能生成正式树。');
      p.push('<div class="ldt-iv-result warn"><b>草稿</b>：已填 ' + (s.filled || 0) + '/' + IV.QUESTIONS.length + ' 题，能先组出 ' + (s.nodes || 0) + ' 个节点（证据 ' + (s.evidence || 0) + ' · 能力 ' + (s.skills || 0) + '）。' + why + '草稿已存，关掉窗口也不会丢。</div>');
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
  async activateInterview() {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(INTERVIEW_TYPE)[0];
    if (!leaf) {
      leaf = (typeof ws.getLeaf === 'function' ? ws.getLeaf('tab') : null) || ws.getRightLeaf(false);
      await leaf.setViewState({ type: INTERVIEW_TYPE, active: true });
    }
    ws.revealLeaf(leaf);
  }
  modelPath() {
    const p = (this.settings && this.settings.modelPath) || DEFAULT_MODEL_PATH;
    return String(p).replace(/^\/+/, '');
  }
  async savePluginData() {
    await this.saveData(this.settings);
  }
  async loadModel() {
    const p = this.modelPath();
    let raw = '';
    try {
      raw = await this.app.vault.adapter.read(p);
    } catch (e) {
      // 首装：用随包样例播种，否则陌生人第一屏就是「读不到本地模型」
      const seed = await this.readBundled('sample/person-model.json');
      if (!seed) { return { ok: false, refusal: '读不到本地模型：' + p + '（' + ((e && e.message) || e) + '）', reasons: [] }; }
      raw = seed;
      try {
        if (typeof this.app.vault.adapter.write === 'function') {
          try { await this.app.vault.adapter.mkdir('.ldt'); } catch (e2) { /* 已存在 */ }
          await this.app.vault.adapter.write(p, seed);
        }
      } catch (e3) { /* 种子写入失败仍是只读渲染，不阻塞 */ }
    }
    let M = null;
    try {
      M = JSON.parse(raw);
    } catch (e) {
      return { ok: false, refusal: '模型文件不是合法 JSON：' + p, reasons: [(e && e.message) || String(e)] };
    }
    let model = M;
    if (DIAG) { try { model = DIAG.decorate(M); } catch (e) { model = M; } }
    return TREE.buildTreeHtml(model);
  }
  async activateView() {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = (typeof ws.getLeaf === 'function' ? ws.getLeaf('tab') : null) || ws.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    ws.revealLeaf(leaf);
  }
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
