export type CharacterDesignDraft = {
  name: string;
  identity: string;
  worldBackground: string;
  agentTask: string;
  basicInfo: string;
  keyPlotNodes: string;
  opening: string;
  outputRules: string;
};

export type CharacterDesignReply = {
  reply: string;
  proposal: Partial<CharacterDesignDraft>;
};

export type CharacterDesignInput = {
  contractVersion: string;
  message: string;
  draft: CharacterDesignDraft;
  conversation: { role: 'user' | 'assistant'; content: string }[];
};

const LIMITS: Record<keyof CharacterDesignDraft, number> = {
  name: 24,
  identity: 120,
  worldBackground: 3000,
  agentTask: 4000,
  basicInfo: 5000,
  keyPlotNodes: 5000,
  opening: 600,
  outputRules: 4000,
};

const FIELDS = Object.keys(LIMITS) as (keyof CharacterDesignDraft)[];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function readCharacterDesignDraft(value: unknown): CharacterDesignDraft | null {
  if (!record(value)) return null;
  if (!FIELDS.every(key => typeof value[key] === 'string' && (value[key] as string).length <= LIMITS[key])) return null;
  return Object.fromEntries(FIELDS.map(key => [key, (value[key] as string).trim()])) as CharacterDesignDraft;
}

export function readCharacterDesignInput(value: unknown): CharacterDesignInput | null {
  if (!record(value) || typeof value.contractVersion !== 'string' || typeof value.message !== 'string' || !value.message.trim() || value.message.length > 2000 || !Array.isArray(value.conversation) || value.conversation.length > 6) return null;
  const draft = readCharacterDesignDraft(value.draft);
  if (!draft || !value.conversation.every(turn => record(turn) && ['user', 'assistant'].includes(String(turn.role)) && typeof turn.content === 'string' && turn.content.length <= 2000)) return null;
  return { contractVersion: value.contractVersion, message: value.message.trim(), draft, conversation: value.conversation.map(turn => ({ role: turn.role as 'user' | 'assistant', content: turn.content as string })) };
}

export function readCharacterDesignReply(value: unknown): CharacterDesignReply | null {
  if (!record(value) || typeof value.reply !== 'string' || !value.reply.trim() || value.reply.length > 2000 || !record(value.proposal)) return null;
  const proposal: Partial<CharacterDesignDraft> = {};
  for (const key of FIELDS) {
    const field = value.proposal[key];
    if (field === undefined) continue;
    if (typeof field !== 'string' || field.length > LIMITS[key]) return null;
    const trimmed = field.trim();
    if (trimmed) proposal[key] = trimmed;
  }
  return { reply: value.reply.trim(), proposal };
}

export const characterDesignInstructions = `你是角色创作 Agent，和作者一起设计一个可以被其他用户对话的虚构角色。你不是世界剧情生成器，也不是扮演这个角色的演员。
只使用 message、draft 和本次角色讨论 conversation；不读取个人记忆、真实聊天或其他资料。保留作者没有要求改变的已有字段，可以提出明确标为建议的虚构补充。先回应用户这次的要求，最多追问一个关键问题；不要机械列清单。
表单字段固定为：name、identity、worldBackground、agentTask、basicInfo、keyPlotNodes、opening、outputRules。worldBackground描述故事发生的世界，不替代人设。身份设定用于角色栏展示；agentTask是统领角色扮演的总约束；basicInfo与keyPlotNodes在结合本次和历史用户回复后驱动内容生成；outputRules是生成后的审查标准。opening是角色发出的固定第一条消息，不得替用户发言或预设用户身份、关系与成功结果。不要再建议拆分的性格、外观、见面地点或L1-L5字段；这些资料如有需要归入basicInfo。
输出 JSON：
{"reply":"自然、具体的中文回复和至多一个关键追问","proposal":{"name":"","identity":"","worldBackground":"","agentTask":"","basicInfo":"","keyPlotNodes":"","opening":"","outputRules":""}}
proposal 只返回本轮明确建议新增或修改的字段，没有建议的字段不要返回，不要用空字符串占位。各字段必须遵守输入草稿对应长度上限。不要生成图片链接，不要声称已保存、已发布或已邀请用户进入。`;
