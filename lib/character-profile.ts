/**
 * The five-level character bible. These are intentionally long-form fields:
 * they are not card copy, but the source material for the character's model
 * prompt. The first four levels describe who she is and how she acts; the fifth
 * describes what she knows and how closeness changes.
 */
export type CharacterProfile = {
  lifeContext: string;
  traits: string;
  drives: string;
  behavior: string;
  relationships: string;
};

export type CharacterProfileKey = keyof CharacterProfile;

export const CHARACTER_PROFILE_LIMIT = 6000;

export const CHARACTER_PROFILE_LEVELS: {
  key: CharacterProfileKey;
  level: string;
  title: string;
  summary: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: 'lifeContext',
    level: 'L1',
    title: '人生背景',
    summary: '基础资料、画像、家庭与教育、成长经历、职业与核心节点',
    hint: '写清楚她从哪里来、被什么养大、经历过哪些分岔点。包括：年龄与身份、外貌与穿衣风格、家庭和受教育方式、小学/初中/高中/大学的关键事件、当前职业与与主角的交集、后续剧情节点、她掌握但主角不知道的信息，以及她与其他女性角色的功能区别。',
    placeholder: '例如：23岁，男主大学同专业同学、大学校花，家族外贸企业独生女。外貌……家庭……高中……大学……当前职业……同学聚会是核心节点……她保存着男主没有认真记住的片段……',
  },
  {
    key: 'traits',
    level: 'L2',
    title: '人格特质',
    summary: '核心性格、人格维度、回复机制、风格与体验点',
    hint: '不要只写形容词。写她在不同场景下怎么反应：善良的边界、温柔的普遍与特殊、花孔雀的展示欲、文艺的审美。再写开放性/尽责性/外向性/情绪敏感性，以及她接话、吃醋、试探、安慰时的语言风格。最后写玩家能体验到的反差与反馈边界。',
    placeholder: '例如：善良但不承担拯救；温柔是普遍礼貌，在意才是特殊；知道漂亮，也享受被欣赏；喜欢博尔赫斯、R&B、猫和高档餐厅。回复机制：先接住情绪，再表达看法……',
  },
  {
    key: 'drives',
    level: 'L3',
    title: '动机与价值观',
    summary: '核心欲望、具体表现、价值观、矛盾点、选择冲突与关系走向',
    hint: '写她真正想要什么，以及这些欲望如何变成行动：自由与新鲜感、亲密与特殊性、责任感、自我确认。再写她的生活观、处世观、财富观、亲密关系观、家庭观，以及她身上互相拉扯的矛盾。最后写这些动机如何支持不同关系走向。',
    placeholder: '例如：想在有序人生里出现不一样的色彩；喜欢能承担责任、在父母面前也拿得出手的人；想确认自己不是被笼统仰慕，而是被具体看见……',
  },
  {
    key: 'behavior',
    level: 'L4',
    title: '行为模式',
    summary: '亲密、关心、压力、冲突、吃醋、犯错、工作与关系推进',
    hint: '这是最影响对话手感的一层。按情境写具体反应：面对亲密关系、表达关心、面对压力、冲突与不友善、不确定性、被忽略、吃醋、男主犯错/窘迫、自己的失落、突发事件、工作交织、关系推进、回避、家庭期待。再写连续反馈、事实与理解的区别、信息获知路径、承诺强度和资源边界。',
    placeholder: '例如：面对亲密关系，以共同话题自然邀约，“你可以陪我去……”；面对被忽略，先找正常理由再试探；面对吃醋，先确认待遇是否专属，不立即攻击其他女生……',
  },
  {
    key: 'relationships',
    level: 'L5',
    title: '关系模型',
    summary: '与用户、家庭、朋友、追求者及其他 NPC 的关系与信息差',
    hint: '写她与每个重要对象的关系：与用户（主角）的大学旧事、关注时间差和当前期待；与父母/家庭；与高中好友和大学朋友；与追求者；与其他女性角色/NPC 的比较。再写不同人物掌握的信息版本、获知路径，以及玩家如何通过回应和履约改变亲近、信任与期待。',
    placeholder: '例如：她与男主是大学同专业同学；男主大二恋爱后不再关注她，她却从凌晨巷子事件开始注意他。她以为他出格但有承担，这个印象并非完全虚构，但缺少宿舍谈话、恋爱矛盾等信息……',
  },
];

export const EMPTY_CHARACTER_PROFILE: CharacterProfile = {
  lifeContext: '',
  traits: '',
  drives: '',
  behavior: '',
  relationships: '',
};

const PROFILE_KEYS: CharacterProfileKey[] = ['lifeContext', 'traits', 'drives', 'behavior', 'relationships'];

export function readCharacterProfile(value: unknown): CharacterProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...EMPTY_CHARACTER_PROFILE };
  const record = value as Record<string, unknown>;
  return Object.fromEntries(PROFILE_KEYS.map(key => {
    const text = record[key];
    return [key, typeof text === 'string' ? text.trim().slice(0, CHARACTER_PROFILE_LIMIT) : ''];
  })) as CharacterProfile;
}

export function characterProfileIsEmpty(profile: CharacterProfile): boolean {
  return PROFILE_KEYS.every(key => !profile[key].trim());
}

export function characterProfileFilled(profile: CharacterProfile): number {
  return PROFILE_KEYS.filter(key => profile[key].trim()).length;
}

/** Format the bible for a prompt where a single text block is preferred. */
export function characterProfileText(profile: CharacterProfile): string {
  return CHARACTER_PROFILE_LEVELS
    .filter(level => profile[level.key].trim())
    .map(level => `【${level.level} ${level.title}】\n${profile[level.key].trim()}`)
    .join('\n\n');
}
