import type { CreatorAgentRequest, CreatorAgentResponse } from './ai-contracts.ts';
import { isCreatorAgentResponse } from './ai-validation.ts';
import { creatorStoryIssues } from './creator-story-graph.ts';

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Recover transport formatting, never guess missing story data or incomplete dialogue. */
export function parseCreatorContent(content: string, truncated = false): unknown {
  const text = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (!truncated) {
    try { return JSON.parse(text); } catch { /* Try a JSON object surrounded by prose. */ }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch { /* Preserve only complete reply below. */ }
    }
  }
  // JSON string grammar: escaped quotes/newlines are decoded by JSON.parse, not rewritten.
  const reply = text.match(/"reply"\s*:\s*("(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*")/);
  if (reply) return { reply: JSON.parse(reply[1]), proposal: null,
    proposalIssue: '对话已保留；本轮画布建议未完整返回，尚未写入。你可以继续聊，或让我重新整理画布。' };
  // A real plain-language response is still a conversation, but never expose raw JSON as prose.
  if (!truncated && text && !/[{}\[\]]/.test(text) && !/^```/.test(text)) return { reply: text, proposal: null };
  throw new Error(truncated ? 'model_output_truncated' : 'invalid_model_output');
}

/** Preserve a real model reply without turning malformed suggestions into saved facts. */
export function creatorDiscussion(reply: string, input: CreatorAgentRequest, proposalIssue?: string): CreatorAgentResponse {
  return { reply, discussionOnly: true, ...(proposalIssue ? { proposalIssue } : {}),
    proposal: { ...input.currentDraft }, nextQuestions: [], readiness: 'needs_detail' };
}

/** Omitted fields mean unchanged, not blank. Supplied invalid fields are never adopted. */
export function readCreatorResponse(value: unknown, input: CreatorAgentRequest): CreatorAgentResponse | null {
  if (!record(value) || typeof value.reply !== 'string' || !value.reply.trim()) return null;
  if (value.proposal === undefined || value.proposal === null) return creatorDiscussion(value.reply, input,
    typeof value.proposalIssue === 'string' ? value.proposalIssue : undefined);
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
