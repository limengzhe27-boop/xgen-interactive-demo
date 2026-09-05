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

export const studioWorlds: StudioWorld[] = [contractWorld];

export function getRoleOpening(entry: StudioWorld, roleId: string): string {
  const role = entry.world.characters.find((item) => item.id === roleId);
  if (!role) throw new Error('unknown_role');
  // Offscreen roles must not receive the global opening's private viewpoint.
  const scene = role.startLocationId === entry.world.openingScene.locationId
    ? entry.world.openingScene.narrative
    : entry.world.locations.find((item) => item.id === role.startLocationId)?.description ?? '';
  return `${scene}\n\n${entry.roleOpenings?.[roleId] ?? `你是${role.name}。${role.publicBackground}`}\n\n你的目标：${role.goal}`;
}
