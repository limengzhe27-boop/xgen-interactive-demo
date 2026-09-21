import type { CreatorStoryGraph } from './creator-story-graph';
import type {
  CreatorBrief,
  CreatorTaskDraft,
  StoryOutlineBeat,
  WorldDefinition,
  CharacterDefinition,
  CharacterRelationship,
  WorldRule,
  WorldGoal,
  EndingCondition,
} from './ai-contracts';

export type GeneratedDraftRole = {
  editorId: string;
  name: string;
  identity: string;
  personality: string;
  relationship: string;
  appearance: string;
  goal: string;
  cardHook: string;
  publicIntroduction: string;
  playable: boolean;
};

export type GeneratedWorldDraft = {
  id: string;
  worldTitle: string;
  worldSeed: string;
  draftRoles: GeneratedDraftRole[];
  creatorBrief: CreatorBrief;
  generatedStoryOutline: StoryOutlineBeat[];
};

interface SeedArchetype {
  match: RegExp;
  defaultTitle: string;
  genre: string;
  premise: string;
  coreGoal: string;
  successCondition: string;
  failureCondition: string;
  roles: [
    { name: string; identity: string; personality: string; relationship: string; appearance: string; goal: string; cardHook: string; playable: true },
    { name: string; identity: string; personality: string; relationship: string; appearance: string; goal: string; cardHook: string; playable: true },
    { name: string; identity: string; personality: string; relationship: string; appearance: string; goal: string; cardHook: string; playable: false }
  ];
  locations: [string, string, string];
  openingCrisis: string;
}

const archetypes: SeedArchetype[] = [
  {
    match: /家产|争产|豪门|遗嘱|继承|家族|少爷|千金|私生/,
    defaultTitle: '豪门遗产的最后分配',
    genre: '家族商战',
    premise: '老董事长深夜病危，封存三年的两份矛盾遗嘱在律师团队抵达前不翼而飞。主宅外暴雨倾盆、山路塌方，所有对外信号在半小时前骤然中断。长房长女手握集团核心实业与隐秘账簿，次子携神秘海外资本注资协议强势归来，而执掌沈家宅邸四十年的老管家则紧守老宅密室钥匙不放。客厅壁炉柴火噼啪作响，墙上的古董挂钟正一分一秒走向午夜十二点。今晚在闭门客厅里的每一次公开表态、眼神交锋与私下协议，都将彻底决定这间拥有数万员工的跨国商业帝国的生杀大权与未来归属。',
    coreGoal: '查明真实遗嘱下落并保全家族核心控制权',
    successCondition: '在午夜公证生效前找出被隐藏的补充协议并争取到多数支持',
    failureCondition: '家族控制权旁落或内部争端导致公馆丑闻公开引发停牌',
    roles: [
      {
        name: '沈知微',
        identity: '长房长女 · 集团财务总监',
        personality: '冷静自持、行事果决、对家族内部隐秘极具敏锐洞察',
        relationship: '与二弟沈淮南明争暗合，深知老管家握有母亲生前留下的信件',
        appearance: '三十岁东亚女性，剪裁利落的深灰羊绒大衣，戴极简银色腕表',
        goal: '查清母亲当年资产流向，阻止二房变卖核心实业',
        cardHook: '两份矛盾的遗嘱面前，她是最先发现保险箱被调换的人。',
        playable: true,
      },
      {
        name: '沈淮南',
        identity: '次子 · 海外风投合伙人',
        personality: '看似漫不经心、实则谋定后动，习惯用资本筹码谈判',
        relationship: '表面与长姐争锋相对，私下却在核实家族账户的巨额亏空',
        appearance: '二十八岁东亚青年，黑色西装敞开领口，神情沉静深敛',
        goal: '追查家族海外神秘账户的真正受益人，填补现金流窟窿',
        cardHook: '他带回来的不是吊唁，而是一份足以让董事会洗牌的海外流水。',
        playable: true,
      },
      {
        name: '林叔',
        identity: '老管家 · 执掌沈家宅邸四十年（NPC）',
        personality: '谨小慎微、口风极紧，忠于老董事长最后的口头托付',
        relationship: '看着沈家子女长大，持有主宅所有房间钥匙与监控总控备忘',
        appearance: '六十岁东亚长者，一丝不苟的黑西装，随身携带黄铜钥匙串',
        goal: '遵守老董事长最后的密闭指令，直至见证人齐聚',
        cardHook: '在这栋宅子里，他知道的秘密比所有继承人加起来还要多。',
        playable: false,
      },
    ],
    locations: ['主宅主会客室', '老董事长书房密室', '主宅地下一层档案库'],
    openingCrisis: '客厅挂钟指向晚间十点，走廊突然断电五秒，再亮起时，茶几上的火漆遗嘱信封已被拆开。',
  },
  {
    match: /仙侠|宗门|修仙|夺宝|灵兽|秘境|道友|魔道|师徒|掌门/,
    defaultTitle: '青云宗镇灵鼎异变',
    genre: '仙侠悬疑',
    premise: '青云宗百年大比前夕，镇压后山地脉气运与千万妖魔的镇灵鼎骤现触目惊心的蛛网状裂痕。宗门掌门闭关静室传出异常灵压却迟迟未出，执掌戒律的执法长老离奇中毒昏迷，整个山门护宗大阵的阵眼灵光正以肉眼可见的速度暗淡。真传剑堂首座奉命提剑封锁主峰山道，精研灵纹的藏经阁奇才推演出破坏并非源自外敌侵袭，而守山灵兽却在此时发出焦躁咆哮。宗门内暗流汹涌，各峰长老各怀心思。究竟是魔门早已潜伏宗门多年，还是昔日同门为了夺取飞升机缘设下的绝杀杀局？',
    coreGoal: '探明镇灵鼎异变源头并修复山门护阵',
    successCondition: '查明投毒与毁阵的真正同谋，稳住后山封印',
    failureCondition: '大阵崩塌地脉魔气泄露，宗门陷入万劫不复',
    roles: [
      {
        name: '陆青玄',
        identity: '真传首座 · 剑堂首席弟子',
        personality: '坚毅沉着、恪守宗规、心怀护持同门的原则',
        relationship: '与师妹江照月既是切磋对手也是唯一能互信之人',
        appearance: '二十多岁青年剑修，青灰道袍，负古朴断云剑，目光如炬',
        goal: '查明师尊闭关异状，找出宗门内奸并护住护山大阵',
        cardHook: '当大阵剑意发出悲鸣时，他第一反应是拔剑挡在后山石阶前。',
        playable: true,
      },
      {
        name: '江照月',
        identity: '内门阵道奇才 · 藏经阁记名弟子',
        personality: '机敏通达、算无遗策，善于从灵纹痕迹中推演真相',
        relationship: '在古卷中发现过关于镇灵鼎的另一段秘史，对长老会有所警惕',
        appearance: '二十岁出头女子，素白道袍挽浅青发带，腰间挂铜刻八卦罗盘',
        goal: '修复破损灵纹，揭开百年前宗门封印的真正代价',
        cardHook: '她只看了一眼鼎身的符文裂纹，就知道这绝不是外敌所为。',
        playable: true,
      },
      {
        name: '墨真人',
        identity: '戒律堂执事长老（NPC）',
        personality: '严苛冷酷、言辞锋利，对任何细微嫌疑皆紧咬不放',
        relationship: '掌控宗门戒律刑堂，今夜封锁了所有下山通道',
        appearance: '五十余岁干瘦老者，黑金长袍，面容严肃如铁',
        goal: '以最快速度处置嫌疑人，防止封印异状动摇宗门威望',
        cardHook: '执法戒尺横在堂前，任何人跨过门槛都要接受三道盘问。',
        playable: false,
      },
    ],
    locations: ['青云后山祭坛', '藏经阁顶层古库', '戒律堂偏厅'],
    openingCrisis: '鼎炉金光突变为幽蓝，祭坛守卫倒地不起，地上残留一道非道非魔的独特符咒。',
  },
  {
    match: /悬疑|侦探|推理|凶案|密室|调查|旅馆|暴雨|孤岛|警探/,
    defaultTitle: '雾港客栈的第八个客人',
    genre: '密室推理',
    premise: '海风夹杂着腥咸雨丝吹散了末班渡轮的汽笛，破旧的雾港客栈被突如其来的罕见大雾彻底封锁在海崖孤岛之上。连接外界与陆地的唯一悬空木质索桥在半小时前被利器蓄意斩断，客栈大堂的地毯上赫然遗留着一件沾染盐卤的带血雨衣与一张撕碎的旧登船客票。原本互不相识的旅人因暴风骤雨被迫围坐在壁炉旁，各自紧握行李，眼神闪烁戒备。今夜入住的名单里，暗中潜藏着一个本应在三年前海难中死去的身份。在漫长黑夜过去、晨雾散尽之前，每一个人都必须自证清白以求生还。',
    coreGoal: '在浓雾散去前查明索桥切断真相并保护无辜生还',
    successCondition: '锁定破坏交通与藏匿证物的真凶，建立安全自守秩序',
    failureCondition: '凶手完成第二次灭口或恐慌导致众人各自猜忌溃散',
    roles: [
      {
        name: '方砚',
        identity: '停职刑警 · 独行旅人',
        personality: '观察细致、防备心强、善于从细节微表情中识破谎言',
        relationship: '追踪三年前的一桩旧案来到海岛，发现客栈店主神色有异',
        appearance: '三十五岁中年男子，磨损墨绿夹克，手指带有老旧笔茧与灼伤痕迹',
        goal: '在今夜的意外中保护在场人员，找出旧案关键人证',
        cardHook: '他没有交出随身行李，而是先检查了大门所有插销的角度。',
        playable: true,
      },
      {
        name: '许知遥',
        identity: '民俗记者 · 滞留旅客',
        personality: '敏锐好奇、胆大心细，记录本从不离手',
        relationship: '手里有一份岛上灯塔守夜人的私密采访笔录',
        appearance: '二十六岁东亚女性，轻便防风连帽衫，挎老款机械相机',
        goal: '记录今晚发生的一切，找到失踪守塔人的信件',
        cardHook: '闪光灯亮起的瞬间，她拍下了一个正试图从后窗潜入的身影。',
        playable: true,
      },
      {
        name: '老陈',
        identity: '雾港客栈老板（NPC）',
        personality: '圆滑畏怯、欲盖弥彰，竭力掩盖客栈过去的事故',
        relationship: '掌握客栈备用柴油机与地下储藏室的唯一门锁',
        appearance: '五十多岁粗壮汉子，系油污帆布围裙，说话时眼神闪烁',
        goal: '保住客栈名声，掩盖多年前未上报的海损记录',
        cardHook: '他端着热茶的手一直在抖，壁炉里的柴火刚烧过某种纸质文件。',
        playable: false,
      },
    ],
    locations: ['客栈一楼避风大堂', '后院配电房与柴油机房', '二楼尽头受损客房'],
    openingCrisis: '大堂吊灯突然闪烁熄灭，黑暗中传来玻璃破碎与重物倒地声，重见光明时吧台后的备用钥匙箱已空。',
  },
  {
    // Default fallback: Urban relationship & tension
    match: /.*/,
    defaultTitle: '契约终局的前夜',
    genre: '都市情感',
    premise: '滨江公寓顶层落地窗外，霓虹夜色倒映着繁华都市的冷漠与喧嚣。一份为期三年的商业联姻与公众形象契约即将在明天上午九点正式到期。曾经严格遵守协议条款、互不干涉私人生活的两人，却在收拾各自物品的最后一晚，无意中翻出了一封两年前被刻意扣留的手写信与附加投资清算书。两家上市公司的战略重组悬于一线，资深法务顾问已在楼下待命催告最后签字。他们必须在晨光破晓前，当面解开长达千日的情感防备与利益捆绑，在千万巨额违约金与真实心意之间，作出决定彼此人生命运的最终抉择。',
    coreGoal: '解开彼此隐瞒的真实诉求并做出最终去留抉择',
    successCondition: '在法务代表到场前坦白各自关键真相并达成共赢方案',
    failureCondition: '误解加剧导致协议破裂，外部竞争对手乘虚而入',
    roles: [
      {
        name: '苏晚',
        identity: '新锐建筑设计师 · 契约方',
        personality: '自尊清醒、克制内敛，不愿在原则问题上妥协分毫',
        relationship: '两年来维持着体面的合作界限，却在今天发现了被隐瞒的设计署名转让',
        appearance: '二十七岁东亚女性，米白真丝衬衫与深色西裤，神色平静清冷',
        goal: '夺回属于自己的原创独立项目主导权，体面结束契约',
        cardHook: '协议签字笔就停在纸上，她抬头问出了两年来一直没问的那句话。',
        playable: true,
      },
      {
        name: '陆沉舟',
        identity: '辰光资本执行董事 · 委托方',
        personality: '掌控欲强、情绪不外露，习惯用商业条款保护私人边界',
        relationship: '表面维系利益契约，暗中却早已为她挡下多次董事会的刁难',
        appearance: '三十一岁东亚青年，黑西装未系领带，眼神沉着深邃',
        goal: '在明天的董事投票中保住项目，同时挽留即将离开的同路人',
        cardHook: '他撕碎了准备好的违约催告函，第一次放下了谈判筹码。',
        playable: true,
      },
      {
        name: '周助理',
        identity: '资深法务顾问（NPC）',
        personality: '公事公办、严守合规条规，善意提醒法律边界',
        relationship: '负责两份协议的公证归档，掌握所有未公开的商业往来',
        appearance: '四十岁职业女性，深蓝职业套装，随身携带公文包',
        goal: '确保明晨九点签约仪式前不存在任何法律瑕疵',
        cardHook: '公文包里装着双方最初签下的所有补充协议副本。',
        playable: false,
      },
    ],
    locations: ['滨江公寓顶层客厅', '工作室独立画图室', '公寓地下私家车库'],
    openingCrisis: '门铃在深夜骤响，门外送来的同城快件里，赫然是那张两年前签署的未公开附加条款。',
  },
];

export function createFullWorldDraftFromIdea(seed: string, options?: { genre?: string; title?: string }): GeneratedWorldDraft {
  const cleanSeed = seed.trim();
  const matched = archetypes.find((a) => a.match.test(cleanSeed)) || archetypes[archetypes.length - 1];

  const worldId = `draft-${crypto.randomUUID().slice(0, 8)}`;
  const title = options?.title?.trim() || (cleanSeed.length <= 16 && cleanSeed.length >= 2 ? cleanSeed : matched.defaultTitle);
  const premise = cleanSeed.length >= 200 ? cleanSeed : `${cleanSeed ? `${cleanSeed}。\n\n` : ''}${matched.premise}`;

  const draftRoles: GeneratedDraftRole[] = matched.roles.map((r, index) => ({
    editorId: `role-${crypto.randomUUID().slice(0, 8)}`,
    name: r.name,
    identity: r.identity,
    personality: r.personality,
    relationship: r.relationship,
    appearance: r.appearance,
    goal: r.goal,
    cardHook: r.cardHook,
    publicIntroduction: `${r.identity}。${r.personality}。${r.relationship}`,
    playable: r.playable,
  }));

  const roleIds = draftRoles.map((_, i) => `draft-role-${i}`);

  const startNodeId = 'node_opening';
  const nodeInvestigateId = 'node_investigate';
  const nodeConfrontId = 'node_confront';

  const storyGraph: CreatorStoryGraph = {
    startNodeId,
    nodes: [
      {
        id: startNodeId,
        title: '初始现场与突发危机',
        location: matched.locations[0],
        scene: `${premise}\n\n${matched.openingCrisis}`,
        worldFacts: [`危机突发于${matched.locations[0]}`],
        nextNodeIds: [nodeInvestigateId, nodeConfrontId],
        eventIntent: 'key_event',
      },
      {
        id: nodeInvestigateId,
        title: '深入搜寻与线索核实',
        location: matched.locations[1],
        scene: `离开开场现场，在${matched.locations[1]}发现了被刻意抹去的痕迹与关键物证。`,
        worldFacts: ['在第二场景发现了新的直接证据'],
        nextNodeIds: [],
        eventIntent: 'possible',
      },
      {
        id: nodeConfrontId,
        title: '当面质询与筹码摊牌',
        location: matched.locations[2],
        scene: `双方在${matched.locations[2]}面对面坐下，隐秘的账目与底牌被逐一摆上台面。`,
        worldFacts: ['关键矛盾公开化，必须立即作出抉择'],
        nextNodeIds: [],
        eventIntent: 'possible',
      },
    ],
    entries: [
      {
        roleId: roleIds[0],
        nodeId: startNodeId,
        defaultPath: [startNodeId, nodeInvestigateId],
        knownFacts: [draftRoles[0].goal],
        beliefs: ['必须尽快查明真相'],
        scene: `你作为${draftRoles[0].name}，正处在${matched.locations[0]}中心。`,
      },
      {
        roleId: roleIds[1],
        nodeId: startNodeId,
        defaultPath: [startNodeId, nodeConfrontId],
        knownFacts: [draftRoles[1].goal],
        beliefs: ['局势还在可控范围内'],
        scene: `你作为${draftRoles[1].name}，冷眼旁观着周围的一切。`,
      },
      {
        roleId: roleIds[2],
        nodeId: startNodeId,
        defaultPath: [startNodeId],
        knownFacts: ['受命驻守现场'],
        beliefs: ['少说为妙'],
        scene: `${draftRoles[2].name}在门边站立，观察着众人的举动。`,
      },
    ],
  };

  const tasks: CreatorTaskDraft[] = [
    {
      id: 'task_core_clue',
      title: '调查开场异常真相',
      description: `查明在${matched.locations[0]}发生的变故原因及直接责任人。`,
      kind: 'main',
      assignedRoleIds: [roleIds[0], roleIds[1]],
      prerequisiteTaskIds: [],
      successCondition: '获得至少一件与核心事件相关的不可辩驳物证',
      difficulty: '中等',
    },
    {
      id: 'task_resolution',
      title: '完成核心利益抉择与谈判',
      description: '针对发现的真相，在关键节点与在场各方达成具有约束力的协议。',
      kind: 'main',
      assignedRoleIds: [roleIds[0]],
      prerequisiteTaskIds: ['task_core_clue'],
      successCondition: matched.successCondition,
      difficulty: '较高',
    },
  ];

  const creatorBrief: CreatorBrief = {
    coreGoal: matched.coreGoal,
    preferredDirection: matched.successCondition,
    alternativeDirection: matched.failureCondition,
    complexityLevel: 2,
    tasks,
    difficulties: ['关键人证心存顾虑不愿轻易吐露实情', '核心凭证随时可能被暗中销毁'],
    scheduledEvents: [
      {
        title: '关键时限临近',
        trigger: '第三轮推进后',
        effect: '外部代表将直接介入，局势变得更加不可控',
      },
    ],
    storyGraph,
  };

  const generatedStoryOutline: StoryOutlineBeat[] = [
    {
      id: 'beat_1',
      title: '风暴骤起',
      location: matched.locations[0],
      objective: '在突发危机面前稳住阵脚并确认关键受损情况',
      turningPoint: '发现现场有人提前做好了撤退准备',
    },
    {
      id: 'beat_2',
      title: '层层剥茧',
      location: matched.locations[1],
      objective: '循着线索追查核心秘密的真实流向',
      turningPoint: '原本以为是对立的一方，实际上同样受制于人',
    },
    {
      id: 'beat_3',
      title: '终局摊牌',
      location: matched.locations[2],
      objective: '做出最后决定，在破局与止损之间划定界限',
      turningPoint: '一个意料之外的证据改变了所有人的预期',
    },
  ];

  return {
    id: worldId,
    worldTitle: title,
    worldSeed: premise,
    draftRoles,
    creatorBrief,
    generatedStoryOutline,
  };
}

export function buildWorldDefinitionFromDraft(draft: GeneratedWorldDraft): WorldDefinition {
  const charIds = draft.draftRoles.map((_, i) => `draft-role-${i}`);
  const locations = [
    {
      id: 'loc_scene_1',
      name: draft.generatedStoryOutline[0]?.location || '主要现场',
      description: '事件核心发生与危机突发地',
      connectedLocationIds: ['loc_scene_2', 'loc_scene_3'],
    },
    {
      id: 'loc_scene_2',
      name: draft.generatedStoryOutline[1]?.location || '深层线索地',
      description: '隐藏线索搜寻与暗流交汇地',
      connectedLocationIds: ['loc_scene_1', 'loc_scene_3'],
    },
    {
      id: 'loc_scene_3',
      name: draft.generatedStoryOutline[2]?.location || '终局摊牌地',
      description: '最终抉择、利益交换与结果呈现地',
      connectedLocationIds: ['loc_scene_1', 'loc_scene_2'],
    },
  ];

  const characters: CharacterDefinition[] = draft.draftRoles.map((r, i) => ({
    id: charIds[i],
    name: r.name,
    identity: r.identity,
    persona: r.personality,
    publicBackground: r.relationship,
    publicIntroduction: r.publicIntroduction,
    cardHook: r.cardHook,
    privateKnowledge: [r.relationship, r.goal],
    secrets: [r.goal],
    goal: r.goal,
    startLocationId: 'loc_scene_1',
    imagePrompt: r.appearance,
    playable: r.playable,
    isDefault: i === 0,
  }));

  const relationships: CharacterRelationship[] = [
    {
      fromCharacterId: charIds[0],
      toCharacterId: charIds[1],
      publicLabel: '主要博弈方',
      privateContext: '相互牵制且深知对方诉求',
      initialTrust: 50,
    },
    {
      fromCharacterId: charIds[1],
      toCharacterId: charIds[0],
      publicLabel: '重点关注对象',
      privateContext: '对对方的底牌与动机保持高度警戒',
      initialTrust: 50,
    },
    {
      fromCharacterId: charIds[2],
      toCharacterId: charIds[0],
      publicLabel: '关键知情者（NPC）',
      privateContext: '掌握未公开的私密记录与现场钥匙',
      initialTrust: 60,
    },
  ];

  const rules: WorldRule[] = [
    {
      id: 'rule_causality',
      description: '所有推演与决策遵循既定线索与现实因果约束，不凭空捏造未调查凭证',
      kind: 'physical',
      immutable: true,
    },
    {
      id: 'rule_trust',
      description: '各方互动与表态将实时影响信任度，决定关键证据是否愿被交出',
      kind: 'social',
      immutable: false,
    },
  ];

  const goals: WorldGoal[] = [
    {
      id: 'goal_core',
      title: draft.creatorBrief.coreGoal,
      description: draft.creatorBrief.coreGoal,
      scope: 'role',
      roleId: charIds[0],
      requiredTaskIds: ['task_core_clue', 'task_resolution'],
    },
    {
      id: 'goal_second',
      title: draft.draftRoles[1].goal,
      description: draft.draftRoles[1].goal,
      scope: 'role',
      roleId: charIds[1],
      requiredTaskIds: ['task_core_clue'],
    },
  ];

  const tasks = draft.creatorBrief.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    assignedRoleIds: t.assignedRoleIds || [charIds[0]],
    prerequisiteTaskIds: t.prerequisiteTaskIds,
    difficulty: '中等',
    successCondition: t.successCondition,
    kind: t.kind,
  }));

  const endingConditions: EndingCondition[] = [
    {
      id: 'ending_success',
      description: draft.creatorBrief.preferredDirection,
      outcome: 'success',
      requiredTaskIds: ['task_resolution'],
      requiredFacts: ['达成具有约束力的协议'],
      applicableRoleIds: [charIds[0]],
    },
    {
      id: 'ending_failure',
      description: draft.creatorBrief.alternativeDirection,
      outcome: 'failure',
      requiredTaskIds: [],
      requiredFacts: ['内部冲突彻底公开或核心秘密外泄'],
      applicableRoleIds: [charIds[0], charIds[1]],
    },
  ];

  const openingScene = {
    locationId: 'loc_scene_1',
    narrative: `${draft.worldSeed}\n\n夜色深沉，关键人物已在现场汇聚。每句表态都可能打破表面平静。`,
    presentCharacterIds: charIds,
    choices: [
      { id: 'c_observe', label: '审视全场气氛与在场各人的微表情', intent: '调查取证与评估' },
      { id: 'c_speak', label: '主动开口试探对方对今晚事态的核心底线', intent: '利益博弈与施压' },
    ],
  };

  return {
    id: draft.id,
    title: draft.worldTitle,
    premise: draft.worldSeed,
    timeSetting: '关键时刻 · 当夜',
    locations,
    characters,
    relationships,
    rules,
    coreEvent: draft.creatorBrief.coreGoal,
    surpriseLevel: 2,
    goals,
    tasks,
    difficultyConstraints: [],
    scheduledEvents: [],
    endingConditions,
    openingScene,
    storyGraph: draft.creatorBrief.storyGraph,
    storyHook: draft.draftRoles[0]?.cardHook || draft.worldTitle,
    discoveryGenre: draft.creatorBrief.discoveryGenre || '剧情推演',
  };
}

export function createCreatorDocumentFromDraft(draft: GeneratedWorldDraft): {
  id: string;
  savedAt: number;
  data: any;
} {
  const generatedWorld = buildWorldDefinitionFromDraft(draft);
  return {
    id: draft.id,
    savedAt: Date.now(),
    data: {
      worldTitle: draft.worldTitle,
      worldSeed: draft.worldSeed,
      surprise: 50,
      draftRoles: draft.draftRoles.map((r) => ({
        name: r.name,
        identity: r.identity,
        personality: r.personality,
        relationship: r.relationship,
        appearance: r.appearance,
        goal: r.goal,
        cardHook: r.cardHook,
        publicIntroduction: r.publicIntroduction,
        editorId: r.editorId,
        playable: r.playable,
      })),
      generated: true,
      publishedWorld: false,
      generatedWorld,
      creatorDetailBaseline: {
        roles: draft.draftRoles,
        outline: draft.generatedStoryOutline,
      },
      generatedStoryOutline: draft.generatedStoryOutline,
      creatorBrief: draft.creatorBrief,
      creatorMessages: [
        {
          role: 'agent',
          content: `已为你生成《${draft.worldTitle}》的完整故事草稿！包含 ${draft.draftRoles.length} 位核心角色（含明确的 NPC 设定）、3 节点故事画布因果连线与核心主线任务。你可以随时在下方继续调整细节，或点击直接前往创作者工作区进行更深度的创作与形象绘制。`,
        },
      ],
      creatorSession: {
        questions: [],
        answers: {},
        openStep: 1,
        continuation: null,
      },
      creatorAssets: {
        cover: '',
        portraits: {},
      },
      releaseHistory: [],
    },
  };
}
