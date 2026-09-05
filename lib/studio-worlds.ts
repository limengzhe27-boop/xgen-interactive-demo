import type { WorldDefinition } from './ai-contracts';

export type StudioWorld = {
  id: string;
  title: string;
  genre: string;
  premise: string;
  cover: string;
  world: WorldDefinition;
  portraits: Record<string, string>;
  portraitCacheKeys?: Record<string, string>;
  roleOpenings?: Record<string, string>;
};

const contractCharacters: WorldDefinition['characters'] = [
  { id: 'su', name: '苏晚', identity: '28 岁 · 独立设计师／契约伴侣', persona: '清醒、嘴硬心软，讨厌被替自己作决定', publicBackground: '与顾言舟维持了一年契约婚姻，自己的工作室刚收到一份独立项目邀请。协议今天到期。', privateKnowledge: ['新项目不是顾家的资源，你已经确认过客户背景。'], secrets: ['你保存了他每次没能赴约的短信，却从未告诉过他。'], goal: '不牺牲事业和自主权，决定这段关系的去留。', startLocationId: 'lounge', imagePrompt: '28岁中国女性，及肩黑色直发，象牙白衬衫，深灰长裙，银色耳钉，清醒坚定的目光，都市电影半身人像' },
  { id: 'gu', name: '顾言舟', identity: '32 岁 · 集团总裁／契约伴侣', persona: '克制、习惯解决问题，不擅长坦白脆弱', publicBackground: '一年前为了应对家族安排签下婚姻协议，如今第一次意识到对方真的会离开。', privateKnowledge: ['你可以独自承担家族的商业损失，不需要苏晚续约。'], secrets: ['你已拒绝董事会提出的另一桩联姻，但苏晚尚不知情。'], goal: '说清真实心意并尊重苏晚的选择，争取一次重新建立关系的机会。', startLocationId: 'lounge', imagePrompt: '32岁中国男性，黑色短发，深炭灰西装，解开一颗领扣，银色腕表，克制疲惫的眼神，都市电影半身人像' },
  { id: 'shen', name: '沈知衡', identity: '30 岁 · 律师／共同朋友', persona: '温和、锋利，公私分明，不替当事人选择', publicBackground: '受双方共同委托处理协议到期事项，也是最早支持苏晚创业的人。', privateKnowledge: ['原协议没有续约义务，任何新增义务必须双方知情同意。'], secrets: ['你欣赏苏晚，但决定在代理期间不以感情影响职业判断。'], goal: '让双方知情、自愿地完成协议处置，维护职业边界。', startLocationId: 'study', imagePrompt: '30岁中国男性，整洁黑发，细框眼镜，棕色西装，沉静温和，都市电影半身人像' },
];

const contractTasks: WorldDefinition['tasks'] = contractCharacters.flatMap((role) => [
  { id: `${role.id}-understand`, title: role.id === 'su' ? '确认自己的筹码' : role.id === 'gu' ? '把挽留说清楚' : '核对双方意愿', description: role.id === 'su' ? '核对协议与事业安排，明确自己不接受的条件。' : role.id === 'gu' ? '说明商业安排与私人感情的区别，允许对方质疑。' : '分别了解双方意愿，说明协议到期后没有自动续约义务。', kind: 'main' as const, assignedRoleIds: [role.id], prerequisiteTaskIds: [], successCondition: role.id === 'su' ? '苏晚通过谈话或核对资料确认了自己可以独立离开，并亲自表达至少一项关系边界。' : role.id === 'gu' ? '顾言舟亲自说明挽留理由、披露商业压力，并明确承认苏晚可以拒绝。' : '律师向双方说明到期规则并获得双方明确回应，不能只凭读心判断。', difficulty: '人物可能回避真正动机，需要具体追问；别人无权替当事人同意。' },
  { id: `${role.id}-decide`, title: role.id === 'su' ? '由自己选择去留' : role.id === 'gu' ? '给出可以兑现的承诺' : '完成自愿处置', description: role.goal, kind: 'main' as const, assignedRoleIds: [role.id], prerequisiteTaskIds: [`${role.id}-understand`], successCondition: role.id === 'su' ? '苏晚亲自决定离开或重新建立关系，说明可执行安排；顾言舟知情并尊重该决定。' : role.id === 'gu' ? '顾言舟提出可执行且不限制苏晚事业的安排，苏晚明确接受或拒绝后，顾言舟尊重并落实答复。' : '双方亲自确认终止协议或新的自愿安排，律师如实记录，不以委托关系换取私人感情。', difficulty: '需要对方真实回应。不可用金钱、家族压力或道德绑架取代自愿。' },
]);

export const contractWorld: StudioWorld = {
  id: 'contract-expiry', title: '契约到期，总裁不肯散场', genre: '豪门情感',
  premise: '一年契约，今晚到期。行李已经收好，那个从不挽留的人却站在门口：“如果这一次，不是为了协议呢？”',
  cover: '/assets/contract-cover.jpg',
  portraits: { su: '/assets/contract-su.jpg', gu: '/assets/contract-gu.jpg', shen: '/assets/contract-shen.jpg' },
  roleOpenings: {
    su: '你是苏晚。你的行李在玄关，新项目的邀请还在手机里。顾言舟想留下你，但决定权仍在你手中。',
    gu: '你是顾言舟。苏晚的行李已经放在玄关。你知道自己可以独自承担商业后果，却还没有向她说清这一点。挽留需要理由，不是命令。',
    shen: '你是沈知衡。你正在书房核对双方委托的协议，客厅的两人还没有形成共同意见。你需要先走过去或联络他们，不能知道隔墙的私下谈话。',
  },
  world: {
    id: 'contract-expiry', title: '契约到期，总裁不肯散场',
    premise: '契约婚姻到期，苏晚准备独立离开，顾言舟试图表达真实心意，律师沈知衡负责保障双方意愿。所有角色均为成年人，感情选择必须自愿。',
    timeSetting: '现代都市，协议到期当晚 20:30', coreEvent: '双方必须面对协议到期后的关系，而不是默认续约。', surpriseLevel: 2,
    locations: [
      { id: 'lounge', name: '顶层公寓客厅', description: '雨夜落地窗、两杯温茶、玄关的行李箱，门没有上锁。', connectedLocationIds: ['study', 'terrace'] },
      { id: 'study', name: '书房', description: '律师核对协议的安静房间，关闭的门阻隔客厅谈话。', connectedLocationIds: ['lounge'] },
      { id: 'terrace', name: '露台', description: '有遮雨檐的露台，可以私下谈话，也可以暂时独处。', connectedLocationIds: ['lounge'] },
    ],
    characters: contractCharacters,
    relationships: [
      { fromCharacterId: 'su', toCharacterId: 'gu', publicLabel: '即将到期的契约伴侣', privateContext: '彼此在意但缺少诚实沟通，不存在服从义务。', initialTrust: 35 },
      { fromCharacterId: 'su', toCharacterId: 'shen', publicLabel: '朋友与委托律师', initialTrust: 65 },
      { fromCharacterId: 'gu', toCharacterId: 'shen', publicLabel: '共同委托的协议律师', initialTrust: 45 },
    ],
    rules: [
      { id: 'physical', kind: 'physical', description: '遵守现代现实物理规律；不能瞬移、读心或无凭据获得隔墙谈话。', immutable: true },
      { id: 'agency', kind: 'social', description: '所有人物均成年；恋爱和协议必须知情自愿，财富与身份不能自动换取亲密或同意。', immutable: true },
      { id: 'knowledge', kind: 'knowledge', description: '只叙述玩家在场可感知或已被告知的信息；别人的秘密不可作为旁白泄露。', immutable: true },
      { id: 'choice', kind: 'story', description: '留、走、暂缓都是可行选择，不能把离开强制判为失败；仅用户明确行动可代表玩家决定。', immutable: true },
    ],
    goals: contractCharacters.map((role) => ({ id: `${role.id}-goal`, scope: 'role', roleId: role.id, title: role.goal, description: role.goal, requiredTaskIds: [`${role.id}-understand`, `${role.id}-decide`] })),
    tasks: contractTasks,
    difficultyConstraints: [{ id: 'consent', description: '对方有自己的意愿，不会因为一次表白就自动答应。', bypassCondition: '诚实交流并获得明确回应。', consequence: '施压会损害信任，不会使目标自动完成。' }],
    scheduledEvents: [{ id: 'board-call', title: '未接来电', trigger: '谈话触及商业安排且顾言舟仍未说明时', earliestTurn: 3, effect: '董事会来电，顾言舟需要决定是否接听；不能代玩家选择。' }],
    endingConditions: contractCharacters.flatMap((role) => [
      { id: `${role.id}-resolved`, applicableRoleIds: [role.id], outcome: 'success' as const, description: '该角色的必要目标已达成，去留由当事人选择。', requiredTaskIds: [`${role.id}-understand`, `${role.id}-decide`], requiredFacts: [] },
      { id: `${role.id}-abandoned`, applicableRoleIds: [role.id], outcome: 'failure' as const, description: '玩家明确放弃沟通和处置，留下争议；单纯拒绝恋爱不构成失败。', requiredTaskIds: [], requiredFailedTaskIds: [`${role.id}-decide`], requiredFacts: [`${role.name}明确放弃协议处置`] },
    ]),
    openingScene: { locationId: 'lounge', presentCharacterIds: ['su', 'gu'], choices: [], narrative: '雨水顺着落地窗滑落，城市的灯光在玻璃上拖成细长的线。玄关放着一只合上的行李箱，客厅的茶已经续过一次。今晚，一年前签下的婚姻协议到期；没有任何条款要求双方继续。\n\n顾言舟站在离门几步远的地方，没有挡住出口。他看了一眼行李，又把视线收回来。餐桌上放着待核对的协议副本，书房里还有律师翻页的轻响。直到此刻，这仍是一件可以按约处理的事情——也可以是一次终于把话说清楚的机会。' },
  },
};

type RoleArc = { roleId: string; steps: [string, string, string][] };

// Authored conditions, not precomputed outcomes. The world Agent must earn each task in play.
function roleArcs(characters: WorldDefinition['characters'], arcs: RoleArc[]): Pick<WorldDefinition, 'tasks' | 'goals' | 'endingConditions'> {
  const tasks = arcs.flatMap((arc) => arc.steps.map(([title, successCondition, difficulty], index) => ({
    id: `${arc.roleId}-${index + 1}`, title, description: successCondition, successCondition, difficulty,
    kind: 'main' as const, assignedRoleIds: [arc.roleId], prerequisiteTaskIds: index ? [`${arc.roleId}-${index}`] : [],
  })));
  const goals: WorldDefinition['goals'] = characters.map((role) => ({ id: `${role.id}-goal`, scope: 'role', roleId: role.id,
    title: role.goal, description: role.goal, requiredTaskIds: tasks.filter((task) => task.assignedRoleIds.includes(role.id)).map((task) => task.id) }));
  return { tasks, goals, endingConditions: goals.flatMap((goal) => [
    { id: `${goal.roleId}-resolved`, applicableRoleIds: [goal.roleId!], outcome: 'success' as const,
      description: goal.description, requiredTaskIds: goal.requiredTaskIds, requiredFacts: [] },
    { id: `${goal.roleId}-abandoned`, applicableRoleIds: [goal.roleId!], outcome: 'failure' as const,
      description: '玩家明确放弃自己的核心目标；提出异议、暂缓或拒绝不公平条件不算失败。', requiredTaskIds: [],
      requiredFailedTaskIds: [goal.requiredTaskIds.at(-1)!], requiredFacts: [`${characters.find((role) => role.id === goal.roleId)!.name}明确放弃核心目标`] },
  ]) };
}

const groundedRules: WorldDefinition['rules'] = [
  { id: 'physical', kind: 'physical', description: '现代现实物理规律；禁止读心、瞬移、凭空变出证据或资源。意外只能改变处境，不替玩家赢。', immutable: true },
  { id: 'knowledge', kind: 'knowledge', description: '旁白只能呈现玩家在场所见、已被告知或自己掌握的信息；场外角色和私密材料不会自动公开。', immutable: true },
  { id: 'agency', kind: 'social', description: '所有角色均成年，具有各自利益和拒绝权；不代替玩家选择，也不因为身份变化让其他人自动服从。', immutable: true },
  { id: 'completion', kind: 'story', description: '任务需可观察的行动和对方实际回应才能完成。故事长度由目标达成决定，不按固定轮数结局。拒绝不公平条件并寻找替代方案不会自动失败。', immutable: true },
];

const workplaceCharacters: WorldDefinition['characters'] = [
  { id: 'lin', name: '林照', identity: '29 岁 · 被裁的项目主创／新甲方代表', persona: '记仇但清醒，擅长抓住细节，不愿再替别人背锅',
    publicBackground: '三个月前被启衡公司裁掉。如今作为远川项目的验收代表，再次走进曾被收回门禁的会议室。', privateKnowledge: ['你的授权书允许否决不合格交付，但无权私自加价或挪用项目经费。'], secrets: ['你保留着当年提交设计原稿的回执，能够证明署名被改动。'],
    goal: '拿回主创署名和验收主导权，让合作条件真正落地。', startLocationId: 'meeting', imagePrompt: '29岁中国女性，利落黑色短发，深蓝西装，白衬衫，细银色手表，沉着锐利的眼神，写实电影半身肖像' },
  { id: 'zhou', name: '周启明', identity: '41 岁 · 前上司／乙方负责人', persona: '好面子，善于转移责任，面对真实损失会计算取舍',
    publicBackground: '当年宣布林照不适合团队的人，如今需要拿下这份关系到公司现金流的续单。', privateKnowledge: ['如果验收延期，自己仍能申请过桥资金，但需要公开交付风险。'], secrets: ['你知道被删掉的主创署名来自林照，却一直没有纠正。'],
    goal: '保住真实可交付的合作订单，承担旧账并获得新的合作条件。', startLocationId: 'meeting', imagePrompt: '41岁中国男性，整齐后梳黑发，深灰西装，酒红领带，面带克制疲惫，现代会议室，写实电影半身肖像' },
  { id: 'tang', name: '唐宁', identity: '27 岁 · 留在原公司的交付骨干', persona: '谨慎、讲义气，不愿用同事饭碗换一个人的面子',
    publicBackground: '接手了林照离开后的交付，也被夹在前同事和现任上司之间。正在工位核对版本记录。', privateKnowledge: ['现有系统有两项尚未修复的问题，必须再投入工程时间。'], secrets: ['你的工作邮件里仍保存着林照原稿的版本链接，但需要你自己决定是否提供。'],
    goal: '公开交付事实，为团队争取合理工期和不背锅的安排。', startLocationId: 'workroom', imagePrompt: '27岁中国女性，黑色低马尾，浅灰针织衫，蓝色工牌，清醒略显疲惫，办公区柔和灯光，写实电影半身肖像' },
];

export const workplaceWorld: StudioWorld = {
  id: 'client-comeback', title: '被裁那天，我成了甲方', genre: '职场逆袭',
  premise: '他曾说你离开谁都一样。今天，他把最好的座位留给了你——这笔救命订单，只有你能签。', cover: '/assets/workplace-cover.jpg',
  portraits: { lin: '/assets/workplace-lin.jpg', zhou: '/assets/workplace-zhou.jpg', tang: '/assets/workplace-tang.jpg' },
  roleOpenings: { lin: '你是林照。授权书在手里，对方递来的成果册却仍没有你的名字。你可以先谈署名，也可以先查交付，主动权不再只在他手中。',
    zhou: '你是周启明。坐在对面的林照有验收授权。你需要订单，但不能假装旧事从未发生。', tang: '你是唐宁。你还在工位核对版本，无法听见会议室的谈判。门禁允许你进入会议室，但是否带上邮件由你决定。' },
  world: {
    id: 'client-comeback', title: '被裁那天，我成了甲方', premise: '虚构都市职场：被裁主创成为甲方代表，与前上司和留任同事谈判署名、交付和合作条件。爽感来自证据与议价权，而非无条件服从。',
    timeSetting: '现代都市，周一 09:00，项目验收会开始前', coreEvent: '续单能否通过，取决于旧稿署名争议和当前交付问题能否获得真实处理。', surpriseLevel: 2,
    locations: [
      { id: 'meeting', name: '启衡会议室', description: '长桌上摆着验收材料，林照的临时访客牌旁放着甲方授权书。玻璃门关闭。', connectedLocationIds: ['workroom', 'corridor'] },
      { id: 'workroom', name: '交付组工位', description: '唐宁的电脑停在项目版本列表，桌边堆着未验收的测试单。无法听见会议室谈话。', connectedLocationIds: ['meeting', 'corridor'] },
      { id: 'corridor', name: '窗边走廊', description: '可以打电话核对授权或私下商议的走廊，谈话不会自动传给其他人。', connectedLocationIds: ['meeting', 'workroom'] },
    ], characters: workplaceCharacters,
    relationships: [
      { fromCharacterId: 'lin', toCharacterId: 'zhou', publicLabel: '前下属与前上司／现甲乙方', privateContext: '旧署名被抹去，权力关系如今反转。', initialTrust: 10 },
      { fromCharacterId: 'lin', toCharacterId: 'tang', publicLabel: '曾经并肩加班的同事', initialTrust: 55 },
      { fromCharacterId: 'zhou', toCharacterId: 'tang', publicLabel: '上司与交付骨干', initialTrust: 30 },
    ], rules: groundedRules,
    ...roleArcs(workplaceCharacters, [
      { roleId: 'lin', steps: [
        ['把旧账摆上桌', '林照出示自己的原稿回执并取得周启明或唐宁对署名经过的具体回应。', '对方会把改名包装成团队惯例；需要核对版本而非只靠指责。'],
        ['谈成公平的验收条件', '林照确认真实交付缺口，提出主创署名、验收权限与合理工期的安排，相关方明确回应。', '一味压价会伤害原团队，甲方授权也并非无限。'],
        ['把主动权落到纸面', '署名修正和验收条件被相关方书面确认，林照亲自决定附条件合作或提出被甲方认可的替代交付方案。', '口头道歉不是落实，直接离场也不等于已经赢得合作权。'],
      ] },
      { roleId: 'zhou', steps: [
        ['面对被删掉的名字', '周启明主动说明署名变更经过，林照得到具体答复。', '含糊的道歉不足以重建信任。'],
        ['摊开交付底牌', '周启明与唐宁核实两项缺口，向林照如实提出工期、资源和责任方案。', '隐瞒缺陷可能短暂保住面子，却无法通过验收。'],
        ['换回一次合作机会', '周启明落实纠错署名、团队资源和责任承诺，甲方明确接受可执行的新合作方案。', '林照可以拒绝，需要谈判或提交合规替代方案。'],
      ] },
      { roleId: 'tang', steps: [
        ['让交付事实被看见', '唐宁亲自提供可核对的版本记录和缺陷清单，林照及周启明已收到。', '站队压力会让你想沉默，但事实不会自动送达。'],
        ['争取能完成的工期', '唐宁提出修复范围、工期和人员方案，取得双方针对方案的回应。', '续单压力与工程现实冲突，不能承诺不存在的人力。'],
        ['不再替别人背锅', '双方确认唐宁提出的交付计划、署名和责任边界，团队按该计划获得资源。', '没有明确责任人和资源的安慰不算完成。'],
      ] },
    ]),
    difficultyConstraints: [{ id: 'authority', description: '甲方授权不是随意惩罚权，乙方现金流紧张但员工不该代领导受罚。', bypassCondition: '通过版本证据、质量标准和合理条件形成真实议价。', consequence: '滥用权力会让对方质疑谈判资格；不能自动赢单。' }],
    scheduledEvents: [{ id: 'deadline-call', title: '采购部来电', trigger: '谈判已涉及验收条件但迟迟没有具体方案', earliestTurn: 4, effect: '采购部询问风险与可行工期，不强制签约，也不按轮数结束故事。' }],
    openingScene: { locationId: 'meeting', presentCharacterIds: ['lin', 'zhou'], choices: [], narrative: '会议室还是那间会议室，连投影仪启动时的轻响都没有变。三个月前，林照在这里交回门禁卡；今天，前台为她换了一张印着甲方来访的胸牌。长桌主位空着，旁边的热茶刚刚倒好。\n\n周启明把成果册推到桌面中央。那张熟悉的设计图占满了首页，署名栏却仍是“项目管理中心”。林照的授权书已经放在桌边，续单材料停在等待签字的那一页。门外偶尔有人经过，门内还没有人说起旧事。' },
  },
};

const inheritanceCharacters: WorldDefinition['characters'] = [
  { id: 'xu', name: '许愿', identity: '26 岁 · 被家族忽视的外孙女', persona: '敏感但不软弱，渴望被承认，也警惕廉价示好',
    publicBackground: '多年未被邀请参加家宴，却在外祖父去世后收到一封要求亲自出席遗嘱宣读的信。', privateKnowledge: ['邀请信明确写着你有权亲自发言，不能由亲属代答。'], secrets: ['外祖父留下的一封私人信提到希望你保住旧工坊，但它不是自动生效的财产凭证。'],
    goal: '确认自己的正式份额，取得有实际表决权的席位，不再被代替发言。', startLocationId: 'hall', imagePrompt: '26岁中国女性，长黑发，墨绿衬衫，简洁金色耳钉，眼神倔强警觉，老宅暖光，写实电影半身肖像' },
  { id: 'he', name: '何承远', identity: '35 岁 · 长孙／家族企业经营者', persona: '精于计算，把付出当作应得控制权的理由',
    publicBackground: '经营家族企业多年，习惯替全家安排决定。希望宣读前先让各方签一份统一管理意向。', privateKnowledge: ['企业扩张留下债务，需要保留运营现金，不能立即兑现所有人的退出要求。'], secrets: ['你准备的意向书附有长期投票委托条款，尚未向许愿解释。'],
    goal: '保住企业运营和自己合理的经营席位，通过透明条件争取家人支持。', startLocationId: 'hall', imagePrompt: '35岁中国男性，黑色短发，米色西装，深棕领带，金属腕表，自信戒备，老宅会客厅，写实电影半身肖像' },
  { id: 'lu', name: '陆清禾', identity: '38 岁 · 遗嘱执行人', persona: '严谨，不买情面，对以亲情逼人让步格外警惕',
    publicBackground: '受委托保管正式清单和封存文件，正在资料室准备宣读。负责说明本次虚构财产安排的程序。', privateKnowledge: ['正式清单写明许愿持有20%表决份额、何承远40%、其余亲属合计40%；任何人的投票委托均需另行知情同意。'], secrets: ['另有独立运营审计报告封存在资料室，只有履行说明程序后才能交给当事人查阅。'],
    goal: '让正式安排完整公开，记录各方本人选择，防止任何一方被迫交出权利。', startLocationId: 'archive', imagePrompt: '38岁中国女性，盘起的黑发，细框眼镜，藏蓝套装，平静坚定，老宅资料室，写实电影半身肖像' },
];

export const inheritanceWorld: StudioWorld = {
  id: 'inheritance-night', title: '遗嘱宣读前夜', genre: '遗产争夺',
  premise: '他们只给你留了最角落的椅子。直到执行人翻开名单，你的名字，第一次决定了谁能坐在主位。', cover: '/assets/inheritance-cover.jpg',
  portraits: { xu: '/assets/inheritance-xu.jpg', he: '/assets/inheritance-he.jpg', lu: '/assets/inheritance-lu.jpg' },
  roleOpenings: { xu: '你是许愿。邀请信还在包里，桌上的意向书没有人向你解释。你可以要求正式宣读，也可以先问他们为什么急着让你签名。', he: '你是何承远。公司需要运营现金，而你希望先达成管理意向。许愿还未签字，是否如实说明附加条款由你决定。', lu: '你是陆清禾。你在资料室准备封存文件，尚未听到大厅的谈话。你可以带文件过去按本故事设定的程序说明，但不能假装自己知道他们已谈过什么。' },
  world: {
    id: 'inheritance-night', title: '遗嘱宣读前夜', premise: '架空都市家族戏：被忽视的外孙女、实际经营者与遗嘱执行人围绕财富、席位和话语权谈判。以下是虚构剧情程序，不是真实法律建议。',
    timeSetting: '现代架空都市，遗嘱宣读前夜 19:30', coreEvent: '正式份额尚未当众宣读，一份提前摆出的统一管理意向书试图先决定谁替谁投票。', surpriseLevel: 2,
    locations: [
      { id: 'hall', name: '何家老宅会客厅', description: '长桌、角落的一把椅子、未签名的意向书和家族旧照片。资料室的门紧闭。', connectedLocationIds: ['archive', 'garden'] },
      { id: 'archive', name: '封存资料室', description: '陆清禾正在核对清单和文件编号。未宣读的份额只有执行人掌握，大厅谈话不可闻。', connectedLocationIds: ['hall'] },
      { id: 'garden', name: '老宅庭院', description: '隔着玻璃能看见大厅灯光但听不清交谈，适合亲自约人私谈。', connectedLocationIds: ['hall'] },
    ], characters: inheritanceCharacters,
    relationships: [
      { fromCharacterId: 'xu', toCharacterId: 'he', publicLabel: '疏远的表兄妹／潜在共同继承人', initialTrust: 15 },
      { fromCharacterId: 'xu', toCharacterId: 'lu', publicLabel: '受邀到场者与执行人', initialTrust: 40 },
      { fromCharacterId: 'he', toCharacterId: 'lu', publicLabel: '经营者与独立执行人', initialTrust: 30 },
    ], rules: [...groundedRules, { id: 'fictional-estate', kind: 'story', description: '本故事程序：封存清单由陆清禾亲自宣读后，各方才得知正式份额；私信或口头许诺不能变出份额。管理席位与财产份额分开谈，任何投票委托需本人知情确认。法律称谓仅用于虚构，不输出真实法律指导。', immutable: true }],
    ...roleArcs(inheritanceCharacters, [
      { roleId: 'xu', steps: [
        ['听见自己的名字', '许愿亲自要求核对邀请及正式文件，听到陆清禾完整宣读自己的份额和权利。', '亲属可能要求先签字，私人信不能代替正式清单。'],
        ['看清席位的代价', '许愿核对意向书及运营风险，向何承远明确自己的表决边界并取得回应。', '亲情劝说与企业现金压力交织，不能只以总资产推定可拿到的现金。'],
        ['坐上自己的位置', '许愿本人确认保留表决权的管理安排或被明确接受的独立持有方案，由执行人记录且相关方回应。', '空口答应保留席位不够，投票委托条款也必须处理。'],
      ] },
      { roleId: 'he', steps: [
        ['把代签的念头收回', '何承远公开说明长期投票委托，允许许愿等待正式宣读后决定，许愿收到说明。', '把控制权叫做照顾仍然是隐瞒。'],
        ['拿出能站住的账本', '正式份额宣读后，何承远提供运营及现金风险材料，提出不剥夺他人份额的管理方案。', '公司资产不等于可分配现金，自己的贡献也不等于全部人的同意。'],
        ['争取而不是继承信任', '各方知情确认可执行的运营安排，何承远保留经同意的经营职责并接受监督。', '许愿可以拒绝长期委托，需协商期限、独立表决或其他方案。'],
      ] },
      { roleId: 'lu', steps: [
        ['完成公开宣读', '陆清禾当着许愿和何承远完整说明正式份额，确认两人均已听见并可提问。', '不能只给强势亲属看文件，也不能把私信当清单。'],
        ['澄清附加条件', '陆清禾说明投票委托及运营风险，核对两人本人意愿，提供已按程序可查阅的材料。', '要区分财产份额、经营职责和自愿委托。'],
        ['让每个人自己签名', '双方本人作出保留权利或自愿安排的具体选择，执行人形成准确记录，争议事项不被冒记为同意。', '一方不同意时可记录独立持有及未决争议，不可代签或强行调和。'],
      ] },
    ]),
    difficultyConstraints: [{ id: 'pressure', description: '家族体面、经营现金和个人话语权相互牵制。', bypassCondition: '正式宣读、查明条款、按本人意愿形成可执行安排。', consequence: '逼迫签名会损害合作，旁白不能替任何人同意。' }],
    scheduledEvents: [{ id: 'cashflow', title: '财务发来消息', trigger: '讨论触及退出或资金安排后', earliestTurn: 4, effect: '经营团队请求确认下一阶段预算。只增加谈判压力，不凭空改变财产份额或强制结局。' }],
    openingScene: { locationId: 'hall', presentCharacterIds: ['xu', 'he'], choices: [], narrative: '老宅的灯亮得很早，长桌上的杯子按旧时家宴的位置摆好。许愿面前只有一张临时挪来的椅子，椅背抵着墙边。她把邀请信从包里取出来时，何承远已经将一份意向书推到了桌边。\n\n文件末页留着签名空白，正式清单却还在隔壁资料室里。墙上的老照片记录着这个家曾经愿意展示的人，照片之外，还有很多年无人问起的生活。此刻没有谁知道这场谈话会把主位留给谁。那支签字笔静静躺着，谁也没有替许愿拿起来的权利。' },
  },
};

export const studioWorlds: StudioWorld[] = [contractWorld, workplaceWorld, inheritanceWorld];

export function getRoleOpening(entry: StudioWorld, roleId: string): string {
  const role = entry.world.characters.find((item) => item.id === roleId);
  if (!role) throw new Error('unknown_role');
  // Offscreen roles must not receive the global opening's private viewpoint.
  const scene = role.startLocationId === entry.world.openingScene.locationId
    ? entry.world.openingScene.narrative
    : entry.world.locations.find((item) => item.id === role.startLocationId)?.description ?? '';
  return `${scene}\n\n${entry.roleOpenings?.[roleId] ?? `你是${role.name}。${role.publicBackground}`}\n\n你的目标：${role.goal}`;
}
