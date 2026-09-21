import type { CreatorAgentRequest } from './ai-contracts.ts';
import type { CreatorTriage } from './typesafe-creator-triage.ts';

/** Runtime excerpts of research/skill-drafts/creator-suite-v1, not a second output schema. */
export const CREATOR_SKILL_VERSION = 'six-by-six-2026-09-21.1';
export const horizontalSkills = {
  H1: '内容方向：承接核心设想，按缺口讨论主要体验、基调尺度、参与方式与必要边界。工作方法：提炼已定内容，聚焦核心设想/主要体验/基调尺度/参与方式/基本局面关键缺口；提供2~3个有差异方向供比较，已清楚的不重问，不发问卷阻断。明确委托时给出具体定位草案与建议。成果落点：设定与方向（title、premise、entryPolicy、brief.discoveryGenre），待定构思与设计假设保留在 reply，不强制世界规则先行或自动补齐全员秘密。',
  H2: '人物塑造：作者只讨论某个人，就不要替其他人定案；仅在指定人物范围内讨论身份、诉求、性格如何影响行动、能力与限制。工作方法：用相关情境对比行为差异，避免空泛追问形容词；未知留空，不为返回完整名单扩写其他人。建议与确认事实分开，局部提案只改该角色。成果落点：人物与关系（characters[i]: id、name、identity、persona、personality、appearance、goal）。重点边界：禁止拿私密目标或秘密当公开文案，人物图片不是本阶段必交成果，严禁自动调用收费生图。',
  H3: '世界与关系：只补影响当前创作的规则、相互依赖与认知边界。工作方法：从具体诉求连接双方（谁帮助、依赖、阻碍谁，允许单向或不对称）；落实四分法（客观事实、角色已知、怀疑推断及玩家见闻依据）。修改关系时说明受影响入口和事件，不自动重写。成果落点：设定与方向及人物与关系（relationshipNotes、characters[].relationships、node.worldFacts、entry.knownFacts、beliefs）。重点边界：共享世界绝不等于共享秘密，禁止全员广播秘密；图上连线或更早入场不代表在场或知情；规则不能预演玩家最终结果。',
  H4: '角色入场：共享客观开场基准（时间、地点、已发生事实与正在发生之事），分别交代每个可选角色的位置、必要已知、诉求及眼前可回应局面。工作方法：为目标角色说明处境与行动空间，晚入场注明成立条件与认知来源；多角色作品逐一覆盖入口，可先提供视角样本并标注其余待补；玩家初见时自然补足上下文，不强迫NPC背资料。成果落点：故事画布（storyGraph.startNodeId、storyGraph.nodes[0]、storyGraph.entries[roleId]）。重点边界：后续事件不改变角色首次入场起点，绝不因新增事件搬移入口；接管后不替玩家行动，文字方案不等于制作视频。',
  H5: '互动发展与收束：围绕当前锚点按“触发条件—行动空间—影响与代价—他人回应”组织事件，让局面产生实际变化。工作方法：分清既成事实、条件事件与作者里程碑；汇合保留路线带来的知识、关系、物品与损失；明确委托构思时直接交付完整局部节点提案（ID、scene、nextNodeIds），严禁机械反问死锁。成果落点：故事画布与目标任务（storyGraph.nodes、nextNodeIds、possibilities 与 brief.tasks 分开维护）。重点边界：讨论可能不等于已发生；分支不机械穷举凑数；无写入回执不宣称已入画布。',
  H6: '作品展示：从已存在内容提炼公开标题、简介、选角介绍与素材视觉需求，严格分级脱敏。工作方法：三级公开权限（发现页简介、选角公开介绍、内部私密档案）；区分“扮演角色”与“与角色对话”的不同入口语义与按钮文案；给出符合调性的展示文案和封面设计要求。成果落点：展示与素材（title、brief.synopsis、brief.cardHook、characters[].publicIntroduction，封面设计规格在 reply 交付）。重点边界：绝不把私人目标或内部设定当作公开文案；素材制作独立于内容讨论，严禁自动发起收费生成或发布。',
} as const;
export const verticalMethods = {
  V1: '调查与发现：信息如何获取、解释与揭示。调用操作：1. 选一个本轮需澄清的未知，分清作者未定与角色未知；2. 围绕已定真相设计可接触信息、获取途径与支持的判断；3. 比较询问、观察或交叉核对的收益与风险；4. 结论与线索交给 H5，知情依据交给 H3。检查与反例：线索必须可合理获得；怀疑不写成事实；不用微动作直接证明有罪，不强制物证或全员撒谎。',
  V2: '关系与相处：表达、倾听、边界与相处反馈。调用操作：1. 找出双方在相处中希望获得或避免的事项（允许无冲突）；2. 选择能表达需求的言行机会（倾听、帮忙、婉拒、保持距离）；3. 依据性格设计可感知回应；4. 累积变化与一次反应分开交付 H3/H5。检查与反例：关系变化必须有原因；不把一次帮助直接升级为亲密关系；允许日常安静相处、并肩协作，不强制恋爱、阴谋或好感数字；拒绝仍可继续。',
  V3: '博弈与协商：目标不完全一致时的争取、交换、协调或竞争。调用操作：1. 找出本次需协调的目标差异及双方打交道必要性；2. 核对筹码实际归属与兑现能力，不凭空造权力；3. 构思接受、拒绝、换条件或退出的可行影响；4. 条件与可能回应交给 H5，筹码关系交给 H3。检查与反例：筹码必须有实际来源与控制权；口头承诺不等于兑现；不让全员索要把柄，不以威胁背叛为默认解法。',
  V4: '求生与风险取舍：有限条件下的保全、消耗与风险承担。调用操作：1. 确认威胁来源与玩家可感知征兆；2. 只挑影响眼前选择的资源、限制与恢复途径；3. 比较方案保全什么、消耗什么、何时看见代价；4. 消耗条件与失败后可行行动交给 H5。检查与反例：玩家需能事先理解重要风险；不凭空增加死亡或倒计时惩罚；不将谨慎行动惩罚为无聊；失败不等于必死或直接结束。',
  V5: '探索与成长：发现未知空间、尝试方法、获得能力并突破障碍。调用操作：1. 明确未知区域或新办法及探索动力；2. 设置可读提示与尝试机会，确保障碍与已有能力相容；3. 设计成功、失误、求助带来的反馈，让下次尝试有新依据；4. 理解与通路交给 H5，能力边界交给 H2/H3。检查与反例：尝试必须提供信息；突破必须有依据；不强制数值等级或无理剥夺能力；新能力不能随意抹掉既有世界规则限制。',
  V6: '建设与经营：通过持续投入、分工和计划改变对象或组织。调用操作：1. 确定体验者能管理的对象与不能直接控制的外部因素；2. 选少量影响决策的投入、产出与持续状态，区分预期与已实现收益；3. 设计分工、投入、调整与反馈机会，说明反馈延迟；4. 阶段目标与持续状态交给 H5。检查与反例：资源守恒于已定规则；收益必须有来源；NPC是具有性格自主意愿的角色而非冷冰生产按钮；不强制无限增长，允许缩小规模或平稳退出。',
} as const;
type H = keyof typeof horizontalSkills;
type V = keyof typeof verticalMethods;

export function selectCreatorSkills(input: CreatorAgentRequest, triage: CreatorTriage | null = null): { horizontal: H; vertical: V[]; source: string } {
  const text = input.userMessage || '';
  // Routing is advisory, never authorization. Prefer current explicit subject over an open panel.
  const characterNames = Array.isArray(input.characters)
    ? (input.characters as Array<{ name?: string }>).map((c) => c?.name).filter(Boolean) as string[]
    : [];
  const mentionsKnownRole = characterNames.some(name => name.length >= 2 && text.includes(name));

  const rules: [H, RegExp][] = [
    ['H6', /简介|封面|公开介绍|选角介绍|展示文案|标题|发布/],
    ['H4', /入场|开场|前情|接管/],
    ['H5', /节点|分支|后续|结局|后果|事件|剧情发展|收束|预期走向|其他走向|任务/],
    ['H3', /世界规则|世界观|谁知道|知情|关系|能力边界/],
    ['H2', /人物|角色|性格|动机|身份|外貌|改名|名字/],
    ['H1', /方向|题材|风格|基调|世界框架/],
  ];
  const matchedRule = rules.find(([, pattern]) => pattern.test(text));
  const explicitHorizontal = matchedRule?.[0] ?? (mentionsKnownRole ? 'H2' : undefined);
  const hints: Record<CreatorTriage['focus'], H> = { world_foundation: 'H3', character_depth: 'H2', event_evolution: 'H5', story_canvas: 'H5', open_discussion: 'H1' };
  // A validated semantic judgment understands negation/continuation; regex is only fallback.
  const horizontal = triage?.horizontal ?? explicitHorizontal ?? (triage ? hints[triage.focus] : 'H1');
  const methods: [V, RegExp][] = [
    ['V1', /调查|线索|查明|揭示真相|发现真相/], ['V2', /相处|倾听|亲近|陪伴|关系变化/],
    ['V3', /协商|谈判|交换条件|筹码|让步|结盟/], ['V4', /求生|稀缺|资源分配|风险取舍/],
    ['V5', /探索未知|成长|学习能力|突破障碍/], ['V6', /经营|建设|投入产出|采买|管理店/],
  ];
  const localEdit = /改名|名字改|改成|错别字|删除|删掉/.test(text);
  const vertical = localEdit || horizontal === 'H6' ? [] : triage?.vertical
    ? triage.vertical === 'none' ? [] : [triage.vertical]
    : methods.filter(([, p]) => p.test(text)).slice(0, 2).map(([id]) => id);
  return { horizontal, vertical, source: triage?.horizontal ? 'semantic-triage' : explicitHorizontal ? 'current-message' : triage ? 'advisory-triage' : 'fallback' };
}

export function creatorSkillGuidance(input: CreatorAgentRequest, triage: CreatorTriage | null = null) {
  const selected = selectCreatorSkills(input, triage);
  return `\n【创作能力 ${CREATOR_SKILL_VERSION}；${selected.horizontal}${selected.vertical.length ? '+' + selected.vertical.join('+') : ''}】
本轮执行规则（严禁违背）：
1. 局限性修改原则：作者只讨论某个人，就不要替其他人定案；局部提案只返回涉及该角色的字段，不扩写其他人。
2. 明确委托交付原则：作者明确委托（如“帮我想想”、“你推荐一个”、“完善这个节点”）时，必须直接交付成果方案，严禁机械反问阻断。
3. 事实与可能性分离：回复与提案必须分清“作者已确认事实”、“待确认建议”与“未来条件性可能性”。
4. 入场不可逆与知情隔离：后续情节事件不改变角色首次入场起点；共享世界不等于共享秘密，一个角色获知的秘密不得广播给其他人。
5. 制作独立原则：图片与视频制作独立于内容讨论，严禁自动发起收费生成。
6. 适时补缺原则：完成作者本轮事项后，结合已确认草稿、待采纳建议与对话检查“人物眼前想做什么—能采取什么行动—行动改变什么—在哪里暂告一段落”。只在正在讨论开场、后续、目标或作者询问下一步时，挑一个实际影响体验的缺口，用当前故事的具体问题或可比较方案引导；已回答的不重问，局部改字不附加问卷。字段为空不等于没有讨论，先读已有设定；作者要求开放延续时尊重留白。
7. 走向不是输赢：preferredDirection 是作者期待的发展，alternativeDirection 是其他可能的发展，不必成对填写。讨论收束时问“什么变化发生后，这一段可以停下来”，而不是问玩家怎样获胜。tasks 只用于需要持续追踪的目标和完成依据，不要求每个故事配任务。不得把未来期待写入开场事实、强迫玩家照做，或未经授权自动补全并采纳。明确委托则交付建议，不再次反问阻断。
【当前选用任务规则】
${horizontalSkills[selected.horizontal]}
${selected.vertical.map(id => verticalMethods[id]).join('\n')}`;
}
