/* skeleton.js - 职业骨架（系统资产，随插件包发布，只读）
 * 四类职业 × 三阶段 = 12 关；每关只有「目标/判据/示例凭据/反例/护身符（内部名死穴）」
 * 具体任务不入库：由用户拿自己的 AI 生成，再把证据填回来。
 * 难度变量：difficultyOverrides 覆盖判据（新手村/标准/硬核/地狱）。
 */
'use strict';

const DIFFICULTIES = [
  { id: 'novice', name: '新手村', copy: '一无所有，但拥有全世界的时间。' },
  { id: 'standard', name: '标准模式', copy: '有一点积累，但窗口在收窄。' },
  { id: 'hardcore', name: '硬核模式', copy: '背负家庭与房贷，你输不起。' },
  { id: 'hell', name: '地狱模式', copy: '已经被生活按住，先把命保住。' }
];

const ARCHETYPES = [
  { id: 'bucket', name: '提桶者', tag: '卖时间换确定性', cover: '#3b82f6' },
  { id: 'pipeline', name: '造管道者', tag: '代码/内容/知识，追求睡后收入', cover: '#22d3ee' },
  { id: 'seller', name: '卖货者', tag: '实体/电商，重现金流与供应链', cover: '#eab308' },
  { id: 'landlord', name: '收租者', tag: '资产/版权/投资', cover: '#a78bfa' }
];

const LEVELS = {
  bucket: [
    { id: 'b1', stage: '0→1', title: '活下来', boss: false,
      goal: '找到一份能覆盖生存的确定性收入',
      uiCopy: '先别想理想，先让现金流为正、账上留出六个月缓冲。',
      criteria: ['月现金流为正', '存款 ≥ 6 个月基本支出'],
      exampleEvidence: ['工资条或银行流水（脱敏，只看月入与余额区间）', '一份写清「我靠什么换钱」的说明'],
      badExample: '口头说「我在找工作」但没有任何收入与余额证据。',
      deathPoints: ['长期零收入硬扛', '借钱维持生活'],
      difficultyOverrides: { novice: ['月现金流为正（家人支持也算）'], hardcore: ['月现金流为正 + 存款 ≥ 3 个月'], hell: ['先止血：月收入覆盖基本支出，且不新增负债'] } },
    { id: 'b2', stage: '小成', title: '建立不可替代性', boss: true,
      goal: '在细分领域做到前 20%，让别人遇到问题先想到你',
      uiCopy: '把「我会」变成「有人点名找我」，靠作品与推荐说话。',
      criteria: ['有可量化的业绩证据（数据/案例/推荐）', '至少 2 个陌生来源的推荐或复购'],
      exampleEvidence: ['项目复盘：问题/动作/结果三段', '前同事或客户的推荐截图（脱敏）'],
      badExample: '只写「我沟通能力强」，没有一件具体的事与结果。',
      deathPoints: ['只会执行，不积累可迁移资产'],
      difficultyOverrides: { novice: ['1 个可量化案例即可'], hell: ['可量化案例 + 不影响现有工作的副业尝试'] } },
    { id: 'b3', stage: '大成', title: '从提桶到造管道', boss: true,
      goal: '把个人能力封装成可复用的系统/产品/课程',
      uiCopy: '让同一份时间卖多次：课程、模板、工具，任选其一跑通。',
      criteria: ['被动收入 ≥ 主动收入 30%', '交付不依赖你本人全程在场'],
      exampleEvidence: ['课程/模板的上架页与订单截图（脱敏）', '一份「我离场后仍能交付」的流程图'],
      badExample: '把所有收入都记成「咨询」，本质仍是卖时间。',
      deathPoints: ['一辈子只卖时间', '把「忙」当成「有系统」'],
      difficultyOverrides: { hell: ['先做可复制的最小产品，不追规模化'] } }
  ],
  pipeline: [
    { id: 'p1', stage: '0→1', title: '验证 PMF', boss: false,
      goal: '用最小成本做出一个有人愿意付钱的东西',
      uiCopy: '别做完整产品：先卖一次，再决定要不要做。',
      criteria: ['≥3 个陌生人付费（≥9.9 元）', '交付物能被买家独立使用'],
      exampleEvidence: ['发布链接 + 3 笔收款记录（脱敏）', '买家的一句真实反馈'],
      badExample: '发了一篇小红书，很多点赞但没人给钱——这叫自嗨。',
      deathPoints: ['闭门造车一年没人用', '先做完整产品再找人'],
      difficultyOverrides: { novice: ['月赚 100 元（含朋友/家人）即算通关'], hardcore: ['3 个陌生人付费 + 覆盖 20% 生活成本'], hell: ['月保底 3000 元副业收入，且不影响主业求职'] } },
    { id: 'p2', stage: '小成', title: '稳定获客', boss: true,
      goal: '建立一个可重复的获客渠道',
      uiCopy: '从「碰运气」变成「每周固定来 3 个」：只留一个主渠道。',
      criteria: ['月新增付费用户 ≥10', '获客成本 < 客单价'],
      exampleEvidence: ['渠道后台数据（曝光/点击/转化）', '连续 4 周的成交记录'],
      badExample: '只有一次爆款，之后三周零成交。',
      deathPoints: ['只会做产品不会卖', '同时铺 4 个渠道却没一个跑通'],
      difficultyOverrides: { novice: ['月新增 ≥3'], hell: ['月新增 ≥3 且不动用应急存款'] } },
    { id: 'p3', stage: '大成', title: '系统化运营', boss: true,
      goal: '把交付、客服、营销自动化，自己只做决策',
      uiCopy: '把重复动作写成 SOP 或脚本，让你一周只干 10 小时。',
      criteria: ['月利润 ≥3 倍生活成本', '每周工作 <10 小时'],
      exampleEvidence: ['SOP 文档或自动化脚本', '一个月的工时记录与利润表'],
      badExample: '收入涨了但工时也涨，人更累。',
      deathPoints: ['沉迷优化细节忘了放大'],
      difficultyOverrides: { hell: ['先做到「离场 1 周业务不停」'] } }
  ],
  seller: [
    { id: 's1', stage: '0→1', title: '选品验证', boss: false,
      goal: '用最小库存测试一个品类的真实需求',
      uiCopy: '先拿 10 件试水，卖不掉的钱就当学费，别压货。',
      criteria: ['首批货售罄', '毛利率 >30%'],
      exampleEvidence: ['进货单与售罄截图（脱敏）', '毛利测算表'],
      badExample: '凭感觉压了 500 件，卖不动还说是「市场不好」。',
      deathPoints: ['凭感觉压货', '现金流断裂'],
      difficultyOverrides: { hell: ['先做无库存代发，不垫资'] } },
    { id: 's2', stage: '小成', title: '渠道稳定', boss: true,
      goal: '在一个平台上跑通稳定出单',
      uiCopy: '先在一个平台做到月销 50 单，再谈第二个平台。',
      criteria: ['月销 ≥50 单', '退货率 <10%'],
      exampleEvidence: ['后台月销报表', '退货原因分类记录'],
      badExample: '四个平台各挂 5 单，都说「在起量」。',
      deathPoints: ['只依赖单一平台，规则一变就死'],
      difficultyOverrides: { novice: ['月销 ≥10 单'] } },
    { id: 's3', stage: '大成', title: '供应链/品牌壁垒', boss: true,
      goal: '从卖货变成有定价权的品牌',
      uiCopy: '让别人替你卖，或者让别人非你不可。',
      criteria: ['复购率 >30% 或拥有独家供应链', '老客推荐占比 ≥20%（口碑能自己长）'],
      exampleEvidence: ['复购数据', '独家供货协议（脱敏）'],
      badExample: '只有价格战，一涨价就没单。',
      deathPoints: ['永远在价格战里卷'],
      difficultyOverrides: { hell: ['先做出 1 款复购品再谈品牌'] } }
  ],
  landlord: [
    { id: 'l1', stage: '0→1', title: '资本/资产积累', boss: false,
      goal: '先有一笔「不动本金」',
      uiCopy: '先攒出 6 个月生活费，再谈任何投资。',
      criteria: ['可投资资产 ≥6 个月生活费', '连续 3 个月不动本金（只靠收入生活）'],
      exampleEvidence: ['资产清单与余额截图（脱敏）'],
      badExample: '还没安全垫就 All in。',
      deathPoints: ['借钱投资/All in'],
      difficultyOverrides: { hell: ['先保住基本生活，不做任何投资'] } },
    { id: 'l2', stage: '小成', title: '被动现金流', boss: true,
      goal: '建立至少一条不依赖主动劳动的现金流',
      uiCopy: '版权、股息、房租、订阅，选一条先跑通。',
      criteria: ['被动收入覆盖基本支出 50%', '连续 3 个月有到账记录'],
      exampleEvidence: ['分红/版税/租金到账记录（脱敏）'],
      badExample: '把「偶尔接一单」当成被动收入。',
      deathPoints: ['收益来源单一'],
      difficultyOverrides: { novice: ['被动收入覆盖 10% 支出'] } },
    { id: 'l3', stage: '大成', title: '资产配置/杠杆', boss: true,
      goal: '多资产、跨周期配置，抗黑天鹅',
      uiCopy: '任何单一资产崩盘，都不该影响你的生活。',
      criteria: ['单一资产占比 <50%', '最大回撤可承受'],
      exampleEvidence: ['资产配置表与压力测试'],
      badExample: '把 80% 押在一个标的上。',
      deathPoints: ['贪婪加杠杆'],
      difficultyOverrides: { hell: ['先建立现金安全垫，不碰杠杆'] } }
  ]
};

module.exports = { DIFFICULTIES: DIFFICULTIES, ARCHETYPES: ARCHETYPES, LEVELS: LEVELS };
