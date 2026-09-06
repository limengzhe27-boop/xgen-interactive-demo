import type { PersonalAgentResponse } from './ai-contracts';

// Restore the original order, including unavailable worlds. Never turn item #2 into #1.
export function restoreRecommendations(value: unknown): PersonalAgentResponse['recommendations'] {
  if (!Array.isArray(value) || value.length > 2) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item.worldId !== 'string' || !item.worldId || item.worldId.length > 200
      || typeof item.reason !== 'string' || !item.reason.trim() || item.reason.length > 2000
      || !Array.isArray(item.matchedMemoryIds) || !item.matchedMemoryIds.every((id: unknown) => typeof id === 'string')
      || seen.has(item.worldId)) return [];
    seen.add(item.worldId);
  }
  return value.map(({ worldId, reason, matchedMemoryIds }) => ({ worldId, reason, matchedMemoryIds: matchedMemoryIds.slice(0, 24) }));
}

type Selection = { kind: 'chat' } | { kind: 'clarify'; reply: string } | { kind: 'open'; worldId: string };

export function resolveWorldSelection(message: string, recommendations: PersonalAgentResponse['recommendations'], worlds: { id: string; title: string }[]): Selection {
  const text = message.trim().replace(/[\s，。！!、]/g, '');
  const ordinal = text.match(/^(?:那|好|好的)?(?:我)?(?:就)?(?:请)?(?:帮我)?(?:选择|选|打开|进入|玩|来)?(?:推荐的)?第?([一二三四五六七八九十123456789])(?:个|本|部|项)?(?:世界|故事|剧本)?(?:吧|好了)?$/);
  const single = /^(?:就)?(?:选|打开|进入|玩)(?:这个|这本|它)(?:吧)?$/.test(text);
  if (ordinal || single) {
    if (!recommendations.length) return { kind: 'clarify', reply: '还没有可以对应这个选择的推荐列表。告诉我想体验什么，我先找出可进入的世界。' };
    if (single && recommendations.length !== 1) return { kind: 'clarify', reply: '目前有两本推荐，你指哪一本？可以说“第一个”或“第二个”，也可以点击对应卡片。' };
    const index = ordinal ? ('一二三四五六七八九十'.includes(ordinal[1]) ? '一二三四五六七八九十'.indexOf(ordinal[1]) : Number(ordinal[1]) - 1) : 0;
    const selected = recommendations[index];
    if (!selected) return { kind: 'clarify', reply: `当前推荐只有 ${recommendations.length} 本，请按显示的编号选择。` };
    if (!worlds.some((world) => world.id === selected.worldId)) return { kind: 'clarify', reply: '这本推荐目前已不可用。我没有替你换成其他世界；可以选另一张卡片，或让我重新推荐。' };
    return { kind: 'open', worldId: selected.worldId };
  }
  // Full title plus explicit command; questions, negation and comparisons go to the model.
  const matches = worlds.filter((world) => {
    const title = world.title.replace(/[\s，。！!、]/g, '');
    return [`打开${title}`, `进入${title}`, `我选${title}`, `选${title}`, `玩${title}`, `打开《${title}》`, `进入《${title}》`, `我选《${title}》`].includes(text);
  });
  return matches.length === 1 ? { kind: 'open', worldId: matches[0].id } : { kind: 'chat' };
}

export function recommendationReply(reply: string, recommendations: PersonalAgentResponse['recommendations'], worlds: { id: string; title: string }[]) {
  if (!recommendations.length) return reply;
  return `${reply}\n\n本次可选世界（按以下编号选择）：\n${recommendations.map((item, index) => `${index + 1}.《${worlds.find((world) => world.id === item.worldId)?.title ?? '暂不可用'}》：${item.reason}`).join('\n')}\n\n可以直接说“第一个”，或点击对应卡片，打开身份选择。`;
}

export const personalActionInstructions = `在原有JSON中增加action字段，默认{"type":"none"}。你现在可以申请一个真实的站内操作：{"type":"open-world","worldId":"availableWorldIds中的ID"}，它只打开身份选择，不会开始游戏。用户明确选择或要求进入一本已有世界时才申请；不要在个人聊天里演绎开场、替用户选择角色或声称游戏已经开始。只有查资料、比较、询问、否定或想先聊天时action必须为none。recommendationContext是界面仍展示的最近推荐列表，序号严格按该数组，不可重新排序来解释“第一个”。指代不清时追问，不猜测。推荐时reply简短解释匹配思路，不另列一套编号或书名顺序；界面会根据recommendations显示权威编号。没有合适世界时诚实说明，不虚构可玩世界。申请open-world时recommendations=[]，reply不能声称操作已经完成；客户端在执行成功后会展示结果。`;

export function guardPersonalAction(output: PersonalAgentResponse, userMessage: string, worldIds: string[]): PersonalAgentResponse {
  if (output.action?.type === 'create-world' || output.action?.type === 'resume-creation') {
    if (/不要|不想|先别|先不|先聊|不急|[?？]|有什么|区别/.test(userMessage)) return { ...output, action: { type: 'none' }, reply: '先不切换到创作，我们继续聊你的想法。确定后，可以随时让我陪你创作。' };
    return { ...output, recommendations: [], reply: output.action.type === 'create-world'
      ? '我们可以把这个想法接着做成世界。下面先确认创作方向和要带入的上下文；原来的聊天会保留，设定仍由你决定是否采纳。'
      : '可以接着讨论已有作品，下面点击“继续当前创作”，不会新建或覆盖原稿。' };
  }
  if (output.action?.type === 'open-world') {
    if (!worldIds.includes(output.action.worldId)) throw new Error('action_outside_catalogue');
    // Navigation is reversible, but explicit negation/questions must not cause an unsolicited jump.
    if (/不要|不想|不进|先别|别进入|别打开|不打开|不选择|不选|先聊|不急|先不|[?？]|怎么样|好不好|有什么|介绍|比较|区别/.test(userMessage)) {
      return { ...output, action: { type: 'none' }, reply: '先不打开世界。你可以继续询问剧情或比较推荐；确定后说“第一个”或点击对应卡片。' };
    }
    return { ...output, recommendations: [], reply: '正在为你打开这个世界的身份选择，尚未开始游戏。' };
  }
  // Never treat prose saying "entered" as an executable instruction.
  if (/(?:正式进入|已经进入|已进入|我们就进入|现在你是|你现在是)/.test(output.reply)) {
    return { ...output, reply: '还没有开始游戏。请从推荐卡片选择世界，或告诉我要打开哪一本；先选身份，再开始体验。' };
  }
  return output;
}

export function knownRecommendations(recommendations: PersonalAgentResponse['recommendations'], worldIds: string[]) {
  const allowed = new Set(worldIds);
  const seen = new Set<string>();
  return recommendations.filter((item) => {
    if (!allowed.has(item.worldId) || !item.reason.trim() || seen.has(item.worldId)) return false;
    seen.add(item.worldId); return true;
  }).slice(0, 2);
}
