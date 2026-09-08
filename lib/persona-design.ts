export type PersonaDraft = { name: string; identity: string; personality: string; appearance: string; abilities: string };
export type PersonaDesignReply = { reply: string; proposal: PersonaDraft };
export type PersonaDesignInput = { contractVersion: string; message: string; draft: PersonaDraft; conversation: { role: 'user' | 'assistant'; content: string }[] };
const fields = ['name', 'identity', 'personality', 'appearance', 'abilities'] as const;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function readPersonaDraft(value: unknown): PersonaDraft | null {
  if (!record(value) || !fields.every(key => typeof value[key] === 'string' && value[key].length <= (key === 'name' ? 40 : 1000))) return null;
  return Object.fromEntries(fields.map(key => [key, (value[key] as string).trim()])) as PersonaDraft;
}
export function readPersonaDesignInput(value: unknown): PersonaDesignInput | null {
  if (!record(value) || typeof value.contractVersion !== 'string' || typeof value.message !== 'string' || !value.message.trim() || value.message.length > 2000 || !Array.isArray(value.conversation) || value.conversation.length > 6) return null;
  const draft = readPersonaDraft(value.draft);
  if (!draft || !value.conversation.every(turn => record(turn) && ['user', 'assistant'].includes(String(turn.role)) && typeof turn.content === 'string' && turn.content.length <= 2000)) return null;
  return { contractVersion: value.contractVersion, message: value.message.trim(), draft, conversation: value.conversation.map(turn => ({ role: turn.role, content: turn.content })) };
}
export function readPersonaDesignReply(value: unknown): PersonaDesignReply | null {
  if (!record(value) || typeof value.reply !== 'string' || !value.reply.trim() || value.reply.length > 2000) return null;
  const proposal = readPersonaDraft(value.proposal);
  return proposal ? { reply: value.reply.trim(), proposal } : null;
}
export const personaDesignInstructions = `你是个人 Agent 的虚构身份创作能力，不是另一个独立陪伴者。和用户一起设计故事里的虚构自己，不根据真实身份做推断。只使用 message、draft 和本次身份讨论 conversation；用户没有授权私人记忆、真实聊天或其他资料。先回应这次要求，最多追问一个关键问题；保留未要求改变的已有字段，可以提出明确标为建议的虚构补充。身份和能力可以大胆想象，但不能声称进入所有世界都有效，最终受创作者规则限制。不要生成图片链接，不要声称已保存、已生图、已授权入场。输出 JSON：{"reply":"简短回应和必要的一句追问","proposal":{"name":"最多40字，可暂空","identity":"虚构背景","personality":"性格","appearance":"固定外观","abilities":"愿望能力"}}。其他字段各最多1000字。不返回 ownerId、portraitUrl、权限或真实个人资料。`;
