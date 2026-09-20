import type { CreatorAgentRequest } from './ai-contracts.ts';
import type { CreatorTriage } from './typesafe-creator-triage.ts';

/** Runtime excerpts of research/skill-drafts/creator-suite-v1, not a second output schema. */
export const CREATOR_SKILL_VERSION = 'six-by-six-2026-09-20.3';
export const horizontalSkills = {
  H1: '内容方向：承接核心设想，按缺口讨论主要体验、基调尺度、参与方式与必要边界。已清楚的不再问，不强制世界规则先行。受众吸引力只是设计假设，不自动补齐全员秘密。明确委托时给出具体建议与定位草案，不发问卷阻断。',
  H2: '人物塑造：作者只讨论某个人，就不要替其他人定案；仅在指定人物范围内讨论身份、诉求、性格如何影响行动、能力与限制。未知留空，不为返回完整名单扩写其他人。建议与确认事实分开，局部提案只改该角色。禁止拿私密目标或秘密当公开文案，人物图片不是本阶段必交成果。',
  H3: '世界与关系：只补影响当前创作的规则、相互依赖与认知。共享世界绝不等于共享秘密，禁止全员广播秘密。区分客观事实、角色已知、怀疑及玩家见闻；每项知情必须有依据。图上更早入场不代表当前在场或知情。',
  H4: '角色入场：共享客观开场，分别交代每个可选角色的位置、必要已知、诉求及可回应局面。后续事件不改变角色首次入场；晚入场注明成立条件，不随新增事件搬移入口。接管后不替玩家行动，文字方案不等于视频。',
  H5: '互动发展与收束：围绕当前锚点设计触发、行动空间、条件性影响与他人回应。建议、作者确认事实、未来可能性必须分开；讨论可能不等于已发生；分支汇合保留不同前史。明确委托时直接交付完整局部提案，不能机械反问死锁。任务与事件分开，无写入回执不称已添加。',
  H6: '作品展示：从已存在内容提取公开标题、简介与选角介绍，严格脱敏，绝不把私人目标、内部设定或秘密当公开文案。区分扮演角色与和角色聊天，不夸大尚不存在的体验。图片与视频制作独立于内容讨论，严禁自动发起收费生成或发布。',
} as const;
export const verticalMethods = {
  V1: '调查与发现：先分清客观事实、现场物理痕迹、角色声称与角色已知；设计信息来源、获取方式、支持的判断与误判影响。观察不直接证明秘密，不强制物证或全员撒谎。',
  V2: '关系与相处：明确双方需求和边界，设计表达、倾听、帮助或拒绝的机会及性格相符的反馈。允许日常安静相处、并肩协作，不强制恋爱、阴谋或好感数字。',
  V3: '博弈与协商：核对不同目标、实际可控制的筹码、可接受条件与让步代价。承诺不等于兑现，合作不必变背叛。拆解死局，提供可衡量的谈判条件。',
  V4: '求生与风险取舍：先确认威胁及可感知依据，只取影响选择的资源限制；比较保全、消耗、恢复与失败后机会。不凭空倒计时或随机惩罚，保留取舍与转机。',
  V5: '探索与成长：明确值得探索的未知、可读提示及可尝试办法，让反馈带来理解、能力或新通路。尊重能力边界，不搞纯数值刷取或无理剥夺能力。',
  V6: '建设与经营：明确可管理对象、投入产出、反馈延迟和持续状态，设计分工及调整机会。角色具有自主性格与意愿，不是冷冰冰的生产按钮；预期收益不是已实现收益。',
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
    ['H5', /节点|分支|后续|结局|后果|事件|剧情发展/],
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
【当前选用任务规则】
${horizontalSkills[selected.horizontal]}
${selected.vertical.map(id => verticalMethods[id]).join('\n')}`;
}
