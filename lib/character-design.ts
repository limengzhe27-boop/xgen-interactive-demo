export type CharacterDesignDraft = {
  name: string;
  identity: string;
  personality: string;
  appearance: string;
  sceneName: string;
  opening: string;
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
  personality: 300,
  appearance: 300,
  sceneName: 60,
  opening: 600,
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
角色需要能被陌生人第一次见面就进入对话：名字、身份、性格、外观、见面地点和开场白。开场白是角色看见来访者时说的第一句话，不替来访者说话，不预设关系、成功或用户身份。
输出 JSON：
{"reply":"自然、具体的中文回复和至多一个关键追问","proposal":{"name":"","identity":"","personality":"","appearance":"","sceneName":"","opening":""}}
proposal 只返回本轮明确建议新增或修改的字段，没有建议的字段不要返回，不要用空字符串占位。name 最多24字，identity 最多120字，personality 最多300字，appearance 最多300字，sceneName 最多60字，opening 最多600字。
不要生成图片链接，不要声称已保存、已发布或已邀请用户进入，不要写世界任务、胜负或多角色关系网。`;
