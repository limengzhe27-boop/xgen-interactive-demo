import type { WorldDefinition } from './ai-contracts';
import { editorialCopy } from './home-editorial.ts';
import { expansionWorlds } from './expansion-worlds.ts';
import publicImages from './public-image-manifest.json' with { type: 'json' };
import { serialWorlds } from './serial-worlds.ts';
import { wildWorlds } from './wild-worlds.ts';
import { memeWorlds } from './meme-worlds.ts';
import { conquestWorld } from './conquest-world.ts';
import { yogaWorld } from './yoga-world.ts';
import { firstPersonWorld } from './first-person-world.ts';
import { libraryArt } from './library-art.ts';
import { legacyArt } from './legacy-art.ts';

export type StudioWorld = {
  id: string;
  title: string;
  originalTitle?: string;
  genre: string;
  premise: string;
  cover: string;
  artNote?: string;
  featured?: boolean;
  fixedRoleId?: string;
  openingImage?: string;
  world: WorldDefinition;
  portraits: Record<string, string>;
  portraitCacheKeys?: Record<string, string>;
  roleOpenings?: Record<string, string>;
  roleEntryScenes?: Record<string, string>;
  roleChoices?: Record<string, string[]>;
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

const contractBase: StudioWorld = {
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

const workplaceBase: StudioWorld = {
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

const inheritanceBase: StudioWorld = {
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

// Revision 2 changes authored conflicts, not merely catalogue headlines. Existing runs
// retain their saved world snapshots; IDs and artwork remain stable for catalogue links.
const melodramaRule: WorldDefinition['rules'][number] = { id: 'melodrama', kind: 'story', immutable: true,
  description: '通俗情感爽剧：角色有嫉妒、虚荣、旧情和占有欲，会嘴硬、试探、甩锅、反击，不是人人都理性讲道理。每轮优先呈现一个与玩家行动有关的具体冲突、尖锐台词和可见后果；不要重复开会、核对协议、抽象说教。反转必须有铺垫和因果，不能靠凭空证据一键获胜。保持玩家决定权，不能替玩家原谅、恋爱、签字或同意亲密；拒绝不是系统判败理由。' };

const romanceRoles: WorldDefinition['characters'] = contractBase.world.characters.map((role) => role.id === 'su' ? { ...role,
  publicBackground: '和顾言舟做了一年契约夫妻。今晚协议到期，你发现他曾让你穿的白衬衫、留的发型，都像极了旧照片里的另一个人。沈知衡——他的生意死对头，也是你的旧相识——来接你。',
  privateKnowledge: ['你有独立项目和住处，即使不接受沈知衡的帮助也能离开。'], secrets: ['今晚以前你真的喜欢过顾言舟，只是从来没有亲口承认。'],
  goal: '让顾言舟说清替身真相，亲自决定离开、重新选择或让他付出重新追求的代价。' } : role.id === 'gu' ? { ...role,
  persona: '骄傲、嫉妒心重，越害怕失去越说错话，习惯把在意包装成命令',
  publicBackground: '你曾按旧恋人的样子替苏晚挑衣服，却坚称婚姻只是契约。如今她要走，来接她的人偏偏是你最不愿输给的沈知衡。',
  privateKnowledge: ['苏晚的工作室项目与你无关，不能以断掉资源为借口留下她。'], secrets: ['你早已把旧恋人的联系方式删掉，却一直没敢承认真正舍不得的是苏晚。'],
  goal: '承认自己造成的伤害，争取苏晚自愿给一次重新追求的机会，或承受她明确离开的结局。' } : { ...role,
  identity: '30 岁 · 投资人／顾言舟的生意死对头', persona: '温柔带锋芒，擅长戳中情敌痛处，不愿永远只当好人',
  publicBackground: '你和苏晚早就认识，与顾言舟在生意上互不相让。应苏晚邀请来接她，刚在书房取回她寄存的作品集。',
  privateKnowledge: ['你带来的车在楼下，但苏晚没有答应任何新的感情关系。'], secrets: ['你喜欢苏晚很久，今晚既想保护她，也想赢顾言舟一次。'],
  goal: '向苏晚说清真实心意与竞争动机，让她亲自决定你们接下来的关系。' });

export const contractWorld: StudioWorld = {
  ...contractBase, title: '离婚当天，前夫的死对头来接我',
  premise: '做了一年替身，你终于签下离婚协议。他冷笑着说你无处可去，门外却传来他死对头的声音：“苏晚，我来接你。”',
  roleChoices: {
    su: ['把旧照片推到顾言舟面前：“你到底把我当成谁？”', '拿起自己的钥匙：“我的去处，不需要你批准。”', '给沈知衡发消息，请他拿好作品集到客厅来。'],
    gu: ['先回答照片的问题，不再拿沈知衡转移话题。', '问苏晚：“你让他来接你，是想让我难堪，还是认真的？”', '放下那句命令，告诉苏晚自己究竟舍不得什么。'],
    shen: ['拿着苏晚的作品集走去客厅。', '给苏晚发消息：“我在书房，准备好了就告诉我。”', '先留在书房，想清楚喜欢苏晚和赢过顾言舟的区别。'],
  },
  roleOpenings: { su: '你是苏晚。旧照片和你的白衬衫像得刺眼，离婚协议已经签了你的名字。你可以当面问清，也可以把钥匙留下走人。原不原谅，从来不是他的决定。', gu: '你是顾言舟。刚才那句“你能去哪”已经说出口，苏晚没有回头。沈知衡还在书房，你不知道他和苏晚私下说过什么。你最熟练的命令，这次可能只会把她推得更远。', shen: '你是沈知衡。你在书房取到了苏晚寄存的作品集，楼下车已经备好。隔门的谈话听不清。你需要亲自走出去，才能知道他们现在的态度。' },
  world: { ...contractBase.world, title: '离婚当天，前夫的死对头来接我',
    entryPolicy: { allowPersona: true, allowedRoleIds: ['su', 'gu'], abilityMode: 'role-only', abilities: [] },
    premise: '成年人的替身婚姻与三角修罗场：苏晚发现自己被按旧爱塑造，协议到期要离开；顾言舟嘴硬挽留；来接人的沈知衡既是旧相识，也是丈夫的死对头。玩家可以离开、反击、追问或改变关系，不能被强制原谅。',
    coreEvent: '苏晚已在到期处置文件上签了自己的名字，替身旧照片摆在桌上；顾言舟尚未直面真相，沈知衡正在公寓书房取她的作品集。',
    characters: romanceRoles,
    locations: contractBase.world.locations.map((place) => place.id === 'study' ? { ...place, description: '临时寄存苏晚作品集的书房，门关闭，隔墙听不清客厅对话。' } : place),
    relationships: [
      { fromCharacterId: 'su', toCharacterId: 'gu', publicLabel: '即将散场的契约夫妻／替身旧账', initialTrust: 10 },
      { fromCharacterId: 'su', toCharacterId: 'shen', publicLabel: '旧相识／来接她的人', initialTrust: 60 },
      { fromCharacterId: 'gu', toCharacterId: 'shen', publicLabel: '生意死对头／彼此忌惮的情敌', initialTrust: 5 },
    ],
    rules: [...contractBase.world.rules, melodramaRule],
    ...roleArcs(romanceRoles, [
      { roleId: 'su', steps: [
        ['撕开替身的借口', '苏晚当面提出照片与衣着的疑问，顾言舟作出具体回应，不能只用“你误会了”翻篇。', '他会嘴硬、转移到沈知衡身上；你需要把问题拉回自己。'],
        ['让他们听见你的条件', '苏晚明确表达她对两人的真实立场或拒绝，并听到所涉及人物的回应。', '两个人争输赢不代表你必须成为赢家的奖品。'],
        ['这一场，由你散场', '苏晚亲自选择独立离开、接受沈知衡的进一步邀约，或向顾言舟给出具体追求条件；相关人物回应，实际去留安排发生。', '没有行动的道歉不够；你也可以选择谁都不要。'],
      ] },
      { roleId: 'gu', steps: [
        ['承认白衬衫的来历', '顾言舟向苏晚坦白曾把旧爱投射到她身上，她实际听到而非旁白替她理解。', '把责任推给苏晚敏感会加剧决裂。'],
        ['放下赢过情敌的执念', '顾言舟明确向苏晚表达真正的挽留理由，并面对她的质问而不是只攻击沈知衡。', '沈知衡的挑衅会引发吃醋，需要玩家自己决定如何应对。'],
        ['承担她的答案', '顾言舟提出具体补偿或追求行动，苏晚自愿答复后，他实际尊重该答复；接受拒绝也可完成。', '强留、封门、威胁事业不能换来同意。'],
      ] },
      { roleId: 'shen', steps: [
        ['不再假装顺路', '沈知衡亲自向苏晚说明自己想来接她的私人动机，苏晚作出回应。', '温柔不能替代坦白，她可能怀疑自己又被利用。'],
        ['分清喜欢与胜负', '沈知衡在苏晚面前说清与顾言舟的竞争和自己的感情，不用含糊英雄救美带过。', '顾言舟会质疑你借机抢人，需要面对这个真实动机。'],
        ['给她一条不是交易的路', '沈知衡提出不附带感情义务的离开安排或进一步邀约，苏晚本人决定，他落实并尊重结果。', '赢过顾言舟不等于赢得苏晚；独自离开也是她的选项。'],
      ] },
    ]),
    scheduledEvents: [{ id: 'rival-at-door', title: '死对头就在隔壁', earliestTurn: 2, trigger: '苏晚提到离开安排或顾言舟拿沈知衡转移话题，且沈知衡仍在书房', effect: '沈知衡拿到作品集后可主动来到客厅，向苏晚确认是否需要车。只按当前地点推进一次，不替苏晚决定跟谁离开。' }],
    difficultyConstraints: [{ id: 'jealousy', description: '道歉里掺着嫉妒，帮助里藏着胜负欲，没有人会在第一句对话就彻底改变。', bypassCondition: '拿具体事实追问、表达自己的立场，并通过行动逼近真实答案。', consequence: '嘴硬与利用会改变信任，不能因主角光环让对方自动低头。' }],
    openingScene: { ...contractBase.world.openingScene, narrative: '“协议到期，你就这么急着走？”\n\n顾言舟看着玄关的行李箱，指尖停在那张签好名字的纸上。苏晚的钥匙放在旁边，还有一张刚从旧书里掉出来的照片：照片上的女人穿着白衬衫，连耳钉都和他送给苏晚的那副相似。\n\n他没有解释照片，只把那杯已经凉了的茶推开：“离开这里，你能去哪？”\n\n这一次，客厅里没有人替他把话圆回来。雨水敲在落地窗上，书房的门仍关着。沈知衡应邀来接人的消息，几分钟前已经出现在两人的手机上。顾言舟看了一眼那扇门，脸色比刚才更难看。行李箱就在出口旁，门没有锁。' },
  },
};

const comebackRoles = workplaceBase.world.characters.map((role) => role.id === 'lin' ? { ...role,
  publicBackground: '被周启明当众骂“离开我什么都不是”后裁掉。曾经最信任的唐宁拿走了你的主创署名。三个月后，你带着甲方授权回到他们的庆功会。',
  goal: '让抢走功劳的人当众改口，拿回自己的名字与这次合作的主动权。' } : role.id === 'tang' ? { ...role,
  identity: '27 岁 · 顶替主创的前好友／交付骨干', persona: '要强、嫉妒又心虚，怕别人说自己只靠抢功上位',
  publicBackground: '林照离开后，你被周启明推成了成果册上的主创。新职位还没坐稳，原作者却以甲方身份回来了。',
  secrets: ['你当时看见了署名被替换，没有反对；原版邮件还在你的电脑里。'],
  goal: '面对抢功的旧账，靠真实交付能力争取自己的职位，而不是继续活在别人的名字里。' } : { ...role,
  persona: '轻视旧下属，好面子，翻脸比翻书快，损失真正临头才会改口',
  publicBackground: '你刚准备让唐宁在庆功会上讲述“独立主创”的成果，却发现救命续单的甲方代表是被自己羞辱赶走的林照。',
  goal: '在旧下属面前低头处理抢功丑闻，争取保住这笔救命订单。' });
export const workplaceWorld: StudioWorld = {
  ...workplaceBase, title: '裁掉我后，前老板跪求续约',
  premise: '前老板刚把抢功的同事捧成明星，你就带着甲方授权推门进场。他递来的庆功酒，你没接：“先说说，这份作品是谁做的？”',
  roleChoices: {
    lin: ['翻开成果册：“周总，你确定这上面该写唐宁的名字？”', '把授权书放到主位，先让周启明说完这场庆功会的来由。', '给唐宁发消息：“带上原始邮件，我们当面聊。”'],
    zhou: ['收起庆功酒，向林照说明署名是怎么改的。', '先试探林照：“过去的事，今天能不能先放一边？”', '请唐宁带着原始材料来会议室，不再替她圆场。'],
    tang: ['打开那封一直没删的原始邮件。', '带着缺陷清单走进会议室，面对林照。', '给林照发消息：“有些事，我想亲口和你说。”'],
  },
  roleOpenings: { lin: '你是林照。成果册上写着唐宁的名字，主位上摆着你的甲方名牌。今天你可以先掀旧账，也可以让他们带着心虚开这场会。', zhou: '你是周启明。你亲手裁掉的人如今掌握续单验收权。唐宁还在交付区准备材料，你需要决定先圆谎还是先低头。', tang: '你是唐宁。你在交付区准备庆功发言，手机刚收到“林照是甲方代表”的通知。原始邮件还在电脑里，会议室的话你听不见。' },
  world: { ...workplaceBase.world, title: '裁掉我后，前老板跪求续约', characters: comebackRoles,
    premise: '抢功、背刺与职场身份反转。林照回到前公司参加验收，撞见周启明正准备为冒领主创署名的唐宁庆功。她有甲方授权却仍需证据；周启明需要救命续单，唐宁既心虚又想证明自己。',
    coreEvent: '验收会与庆功安排撞在同一天，冒名成果册已经印好，林照成为甲方代表让旧账无法再藏。',
    rules: [...workplaceBase.world.rules, melodramaRule],
    relationships: workplaceBase.world.relationships.map((link) => link.toCharacterId === 'tang' && link.fromCharacterId === 'lin' ? { ...link, publicLabel: '被背刺的原作者／冒名上位的前好友', initialTrust: 5 } : link),
    goals: workplaceBase.world.goals.map((goal) => ({ ...goal, title: comebackRoles.find((role) => role.id === goal.roleId)!.goal, description: comebackRoles.find((role) => role.id === goal.roleId)!.goal })),
    tasks: workplaceBase.world.tasks.map((task) => task.id === 'lin-1' ? { ...task, title: '当着他的面翻旧账', successCondition: '林照拿出原稿回执，周启明或唐宁在现场对抢功经过作出具体回应。', difficulty: '对方会说你只是打下手，需要让版本证据和当事人的话撞在一起。' } : task.id === 'lin-3' ? { ...task, title: '让他们当众把名字还回来', successCondition: '周启明和唐宁当着林照明确纠正主创归属，撤回贬低她贡献的说法；林照取得被确认的验收条件后亲自决定合作或替代交付方案。' } : task.id === 'tang-1' ? { ...task, title: '承认那个被偷走的名字', successCondition: '唐宁亲自向林照和周启明说清自己冒领署名的经过，提供原版记录及当前缺陷清单。' } : task).map((task) => ({ ...task, description: task.successCondition })),
    scheduledEvents: [{ id: 'celebration-slide', title: '抢来的荣誉亮在屏幕上', earliestTurn: 3, trigger: '抢功争议已被提出，庆功投影还未处理', effect: '周启明收到秘书提醒：公开成果介绍即将使用署名唐宁的旧幻灯片。玩家可要求暂停、更正或选择别的行动；不得直接跳到道歉获胜。' }],
    openingScene: { ...workplaceBase.world.openingScene, narrative: '投影幕上还停着庆功会的封面，鲜花和香槟挤在验收材料旁边。成果册最显眼的一行写着“主创：唐宁”。\n\n周启明抬头看见林照时，脸上的笑先僵了一下：“你怎么进来的？今天有重要客户。”\n\n前台把甲方名牌放到长桌主位，名字正是林照。没有掌声，也没有谁立刻道歉。周启明把已经端起的酒杯慢慢放下，伸手去盖成果册，却已经来不及遮住那行署名。\n\n三个月前，他也是在这张桌前说她离开公司什么都不是。今天，救命续单的验收授权摆在她面前。唐宁还在交付区准备稍后的发言，会议室的玻璃门关着。' },
  },
};

export const inheritanceWorld: StudioWorld = {
  ...inheritanceBase, title: '遗嘱一开，全家求我回去',
  premise: '他们说你没资格分家产，把放弃继承的纸推到你面前。执行人却先按住了笔：“她不点头，你们谁也坐不稳那个位置。”',
  roleChoices: {
    xu: ['把笔推回去：“先念清楚属于我的，再谈什么一家人。”', '看着何承远：“你这么急着让我签，到底怕什么？”', '拿着邀请信去资料室，请陆清禾说明正式程序。'],
    he: ['把意向书收回来，亲自解释投票委托条款。', '问许愿：“你要什么，才肯支持我？”', '请陆清禾来会客厅宣读，看看许愿究竟有什么筹码。'],
    lu: ['带着封存文件去会客厅，准备当着双方宣读。', '先核对份额清单与签名编号，确保没有漏项。', '给许愿发消息，确认她收到本人出席的邀请。'],
  },
  roleOpenings: { ...inheritanceBase.roleOpenings, xu: '你是许愿。你的椅子在最角落，面前不是家宴菜单，而是让你退出争夺的意向书。你还不知道正式份额，但你有权让他们当着你的面宣读。' },
  world: { ...inheritanceBase.world, title: '遗嘱一开，全家求我回去',
    premise: '被排斥的外孙女回到老宅，被何承远以“你不姓何”为由要求提前交出话语权。执行人保管的正式安排却让她成为两派争夺管理席位的关键。亲情突然变得热络，财富、面子和偏爱都成为筹码。',
    coreEvent: '何承远试图让许愿在宣读前签下退出共同管理的意向；正式份额和独立表决权尚未宣读，她手中的选择可能打破家族两派僵局。',
    rules: [...inheritanceBase.world.rules, melodramaRule],
    tasks: inheritanceBase.world.tasks.map((task) => task.id === 'xu-1' ? { ...task, title: '让他们当面念出你的名字' } : task.id === 'xu-3' ? { ...task, title: '让他们来问你的意见', successCondition: '许愿在正式宣读和条款澄清后，亲自提出保留表决权的管理安排或独立持有方案；何承远明确承认她的实际决定权并回应，陆清禾据实记录，而不是让强势亲属代答。' } : task).map((task) => ({ ...task, description: task.successCondition })),
    scheduledEvents: [{ id: 'sudden-family', title: '突然想起来的亲情', earliestTurn: 3, trigger: '许愿的正式份额和独立表决权已在现场宣读，何承远开始争取她的支持', effect: '何承远收到其他亲属催促争取许愿投票的消息，他可改变称呼、许诺席位或继续施压；不替许愿信任他，也不凭空改变份额。' }],
    openingScene: { ...inheritanceBase.world.openingScene, narrative: '“你又不姓何，今晚能让你来，已经是给足面子了。”\n\n何承远把一份意向书推到许愿面前，笔尖正对着空白签名栏。最角落的椅子是临时搬来的，桌上没有为她摆茶。墙上的全家福里，每个人都笑得体面，唯独没有她。\n\n“都是一家人，没必要闹到宣读的时候。签了，以后少不了照顾你。”他伸手点了点纸，语气像是在赏一件东西。\n\n正式文件还锁在隔壁资料室，陆清禾正在里面核对编号。许愿的邀请信清清楚楚写着必须本人到场。她还没有听到自己究竟能得到什么，但那支笔，已经有人迫不及待想替她拿起来了。' },
  },
};

const publicImage = (path: string) => {
  const id = (publicImages as Record<string, string>)[path];
  return id ? `https://rrgyjvkkgcurtatidyuc.supabase.co/storage/v1/object/public/world-public/${id}.webp` : path;
};
export const studioWorlds: StudioWorld[] = [...expansionWorlds, firstPersonWorld, yogaWorld, conquestWorld, ...memeWorlds, contractWorld, workplaceWorld, inheritanceWorld, ...serialWorlds, ...wildWorlds].map((entry) => {
  const art = libraryArt[entry.id] ?? legacyArt[entry.id];
  const title = editorialCopy('world:' + entry.id)?.title || entry.title;
  return {
    ...entry, originalTitle: entry.title, title, world: { ...entry.world, title }, cover: art?.cover ?? publicImage(entry.cover),
    portraits: { ...Object.fromEntries(Object.entries(entry.portraits).map(([id, path]) => [id, publicImage(path)])), ...art?.portraits },
    artNote: art ? (entry.id === 'monkey-pirate-avengers' ? '非官方同人演绎；封面与托尼暂用参考图，其余已更新。人物与世界观归各自权利人所有。' : undefined) : entry.artNote,
  };
});

export function getRoleOpening(entry: StudioWorld, roleId: string): string {
  const role = entry.world.characters.find((item) => item.id === roleId);
  if (!role) throw new Error('unknown_role');
  // Offscreen roles must not receive the global opening's private viewpoint.
  const scene = role.entry?.scene ?? entry.roleEntryScenes?.[roleId] ?? (role.startLocationId === entry.world.openingScene.locationId
    ? entry.world.openingScene.narrative
    : entry.world.locations.find((item) => item.id === role.startLocationId)?.description ?? '');
  return `${scene}\n\n${entry.roleOpenings?.[roleId] ?? `你是${role.name}。${role.publicBackground}`}\n\n你的目标：${role.goal}`;
}
