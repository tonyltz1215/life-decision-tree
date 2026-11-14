# Life Decision Tree · 人生决策树

Turn what you already said about your own life into a decision tree you can act on. 把你说过的话，长成一棵能推演的决策树。

An Obsidian plugin. All data stays on your machine. 一个 Obsidian 插件，数据只在本机。

![Decision tree view](docs/screenshots/tree.png)

## What it does · 它做什么

- Interview mode: 15 questions, then it builds **18 nodes / 3 branches** from your own words. 访谈入库：15 道题，生成 18 个节点、3 条分支。
- One branch is intentionally locked, showing what evidence is still missing. 有一条分支会被锁住，写清「还差什么证据」。
- Three-layer memory: L1 raw words → L2 digest → L3 judgement, each traceable back to L1. 三层记忆可逐级追溯。
- Diagnosis states (`诊断三态`): what you already own, what needs re-checking, what needs more evidence.
- Everything local: `.ldt/memory.json`, `.ldt/person-model.json`, `.ldt/run.json`.

![Three-layer memory](docs/screenshots/memory.png)

## Install · 安装

1. Install [Obsidian](https://obsidian.md) 1.11.0+ (desktop).
2. Download `life-decision-tree-0.1.1.zip` from the latest release, unzip it, and copy the whole `life-decision-tree-0.1.1` folder into `<your vault>/.obsidian/plugins/`.
3. In Obsidian: Settings → Community plugins → turn on community plugins → enable **Life Decision Tree**.
4. Command palette (`Ctrl/Cmd+P`) → type `Life Decision Tree` → **打开决策树视图**.

Community directory listing: pending review. 社区商店收录：审核中。

## Disclosure · 披露（Obsidian developer policies require these to be stated clearly）

- **Payment is required for full access.** The plugin runs in a demo mode (one full generation, data isolated) until a licence code (`SB-…`) is entered. Codes are sold directly by the author; Obsidian does not process this payment. 付费才能完整使用：未填兑换码时是体验版（可完整生成 1 次），填码后解锁；款项由作者直接收取。
- **Network use (optional).** Only the optional *AI enhancement* feature calls the DeepSeek API, and only when you paste your own API key into settings. Nothing else leaves your machine. 可选联网：只有「AI 增强」会调用 DeepSeek，且必须你自己填 Key；其余全程离线。
- No account is required, no telemetry, no ads. 不需要账号、无遥测、无广告。
- Data stays under your vault's `.ldt/` folder; *delete my data* wipes it after a backup. 数据在库目录 `.ldt/`，可一键删除（先备份）。

## Disclaimer · 免责声明

**本工具仅辅助整理职业选择信息，不提供专业心理评估、心理咨询、心理治疗或精神障碍诊断、治疗，也不构成医疗、投资或法律意见。**

This tool only helps you organize information about career options. It does **not** provide psychological assessment, counseling, psychotherapy, or diagnosis/treatment of mental disorders, and is **not** medical, investment, or legal advice.

- 它不预测结果、不承诺收益；所有判断只基于你自己写下的信息和你自己的证据。
- 你的数据只保存在你自己的电脑上（`.ldt/`），我们看不到、不会上传、不会用于训练；但能访问这台电脑的其他人可以读到这些文件。
- 如果你开启可选的 AI 增强，那段数据会离开你的电脑，由你和所选的 AI 厂商之间处理。
- 涉及健康、财务或法律问题时，请咨询相应专业人士。

## Privacy · 隐私

Everything is read/written locally. Export runs a redaction pass (phone / email / ID numbers) before producing a file. The plugin never opens files outside your vault. 本地存储不等于我们「不处理个人信息」：存什么、留多久由你决定，我们看不到也不决定用途；不想留的字段（如财务数字）可以留空。

## Support · 支持

Open an issue in this repository: https://github.com/tonyltz1215/life-decision-tree/issues 装不上、有 bug，开 issue 或按教程最后一节的联系方式找我。

## License · 许可

MIT. See [LICENSE](LICENSE).
