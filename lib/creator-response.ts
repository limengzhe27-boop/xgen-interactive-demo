import type { CreatorAgentRequest, CreatorAgentResponse } from './ai-contracts.ts';
import { isCreatorAgentResponse } from './ai-validation.ts';
import { creatorStoryIssues } from './creator-story-graph.ts';

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Preserve a real model reply without turning malformed suggestions into saved facts. */
export function creatorDiscussion(reply: string, input: CreatorAgentRequest, proposalIssue?: string): CreatorAgentResponse {
  return { reply, discussionOnly: true, ...(proposalIssue ? { proposalIssue } : {}),
    proposal: { ...input.currentDraft }, nextQuestions: [], readiness: 'needs_detail' };
}

/** Omitted fields mean unchanged, not blank. Supplied invalid fields are never adopted. */
export function readCreatorResponse(value: unknown, input: CreatorAgentRequest): CreatorAgentResponse | null {
  if (!record(value) || typeof value.reply !== 'string' || !value.reply.trim()) return null;
  if (value.proposal === undefined || value.proposal === null) return creatorDiscussion(value.reply, input);
  if (!record(value.proposal) || (value.proposal.brief !== undefined && !record(value.proposal.brief))) {
    return creatorDiscussion(value.reply, input, '本轮设定建议未能整理完整，原草稿和待采纳建议保持不变；可以继续讨论。');
  }
  const p = value.proposal;
  const pending = input.pendingProposal;
  const base = pending && isCreatorAgentResponse({ reply: 'pending', proposal: pending, nextQuestions: [], readiness: 'needs_detail' }) ? pending : input.currentDraft;
  const response = { ...value, discussionOnly: false, proposal: { ...base, ...p,
    brief: { ...base.brief, ...(record(p.brief) ? p.brief : {}) } },
    nextQuestions: Array.isArray(value.nextQuestions) ? value.nextQuestions.filter(x => typeof x === 'string') : [],
    readiness: value.readiness === 'ready' ? 'ready' : 'needs_detail' };
  if (!isCreatorAgentResponse(response)) return creatorDiscussion(value.reply, input,
    '本轮设定建议未能整理完整，原草稿和待采纳建议保持不变；可以继续讨论。');
  const count = response.proposal.characters?.length ?? input.characters.length;
  const issues = creatorStoryIssues(response.proposal.brief.storyGraph, Array.from({ length: count }, (_, i) => `draft-role-${i}`));
  if (issues.length) return creatorDiscussion(value.reply, input, `画布建议暂未写入：${issues[0]} 原草稿保持不变。`);
  return response;
}
