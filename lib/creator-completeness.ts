import type { CreatorAgentRequest } from './ai-contracts.ts';

/** Guidance inventory, not mandatory publishing fields or permission to invent facts. */
export function creatorContentGaps(input: CreatorAgentRequest): string[] {
  const draft = input.pendingProposal ?? input.currentDraft;
  const roles = ('characters' in draft ? draft.characters : undefined) ?? input.characters;
  const gaps: string[] = [];
  if (!draft.brief.synopsis?.trim()) gaps.push('展示与素材：作品公开简介');
  for (const role of roles) {
    if (!role.name?.trim() || /^角色\s*\d+$/.test(role.name)) continue;
    const fields = [['persona', '性格及行为特点'], ['appearance', '外貌与服饰'], ['goal', '诉求'], ['relationship', '人物关系'], ['publicIntroduction', '公开介绍'], ['cardHook', '卡片短句']] as const;
    const absent = fields.filter(([key]) => !role[key]?.trim()).map(([, label]) => label);
    if (absent.length) gaps.push(`${role.name}：${absent.join('、')}`);
  }
  return gaps;
}
