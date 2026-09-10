import type { WorldTurnRequest, WorldTurnResponse } from './ai-contracts';

/** Only unambiguous transcript questions bypass generation. Never interpret story dialogue as commands. */
export function exactChatRecall(input: WorldTurnRequest): WorldTurnResponse | null {
  if (input.interaction?.mode !== 'character-chat' || !input.conversationMemory) return null;
  const question = input.userAction.replace(/[\s，,。.!！?？]/g, '');
  if (!/^(?:请问|你还记得|你记得)?(?:我的第一句话|我(?:给你)?(?:发送|发|说)的第一句话)(?:是什么|说了什么|是什么内容)?$/.test(question)
    && question !== '我的第一句话我给你发送的第一句话是什么') return null;
  const first = input.conversationMemory.firstUserMessage;
  return {
    actionDecision: { allowed: true }, narrative: '',
    dialogue: [{ characterId: input.interaction.targetCharacterId, visibleToRoleIds: [input.selectedRoleId],
      text: first === null ? '这段会话还没有更早的用户消息。' : `你给我发的第一句话是：“${first}”` }],
    statePatch: { committedFacts: [] }, nextChoices: [],
    image: { required: false, reason: 'reuse', sceneId: input.currentScene.id },
    goalProgress: { activeTaskIds: [], completedTaskIds: input.state.completedTaskIds, summary: '回查本次会话原文，剧情状态不变' },
    ending: { reached: false, canContinue: true },
  };
}

/** Keep recent context plus up to three relevant older exchanges, not the whole growing transcript. */
export function chatHistoryIndices(actions: string[], query: string): number[] {
  const start = Math.max(0, actions.length - 12);
  const clean = (s: string) => s.replace(/[\s\p{P}\p{S}]/gu, '');
  const q = clean(query);
  const grams = new Set(Array.from({ length: Math.max(0, q.length - 1) }, (_, i) => q.slice(i, i + 2)));
  const older = actions.slice(0, start).map((action, index) => ({ index,
    score: [...grams].filter(g => clean(action).includes(g)).length,
  })).filter(item => item.score >= 2).sort((a, b) => b.score - a.score || b.index - a.index).slice(0, 3);
  return [...older.map(item => item.index), ...actions.slice(start).map((_, i) => start + i)].sort((a, b) => a - b);
}
