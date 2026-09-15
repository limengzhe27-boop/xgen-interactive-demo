import type { CreatorAgentRequest, CreatorAgentResponse } from './ai-contracts.ts';
import { isCreatorAgentResponse } from './ai-validation.ts';
import { creatorStoryIssues } from './creator-story-graph.ts';
import { normalizeCreatorProposal } from './creator-normalization.ts';

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
  // eslint-disable-next-line no-control-regex -- JSON forbids literal control characters in quoted strings.
  const reply = text.match(/"reply"\s*:\s*("(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*")/);
  if (reply) return { reply: JSON.parse(reply[1]), proposal: null,
    proposalIssue: '对话已保留；本轮画布建议未完整返回，尚未写入。你可以继续聊，或让我重新整理画布。' };
  // A real plain-language response is still a conversation, but never expose raw JSON as prose.
  if (!truncated && text && !['{', '}', '[', ']'].some(c => text.includes(c)) && !text.startsWith('```')) return { reply: text, proposal: null };
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
  const pending = input.pendingProposal;
  const base = pending && isCreatorAgentResponse({ reply: 'pending', proposal: pending, nextQuestions: [], readiness: 'needs_detail' }) ? pending : input.currentDraft;
  const { proposal: p, notices } = normalizeCreatorProposal(value.proposal, base.brief?.storyGraph?.nodes.map(n => n.id));
  const brief = { ...(base.brief ?? {}), ...(record(p.brief) ? p.brief : {}) };
  const count = Array.isArray(p.characters) ? p.characters.length : ('characters' in base ? base.characters?.length : undefined) ?? input.characters?.length ?? 0;
  const roleIds = Array.from({ length: count }, (_, i) => `draft-role-${i}`);
  const graphIssues = creatorStoryIssues(brief.storyGraph, roleIds);
  if (graphIssues.length) {
    const oldRoles = 'characters' in base ? base.characters ?? input.characters ?? [] : input.characters ?? [];
    if (base.brief?.storyGraph && Array.isArray(p.characters) && base.brief.storyGraph.entries.some(entry => {
      const index = Number(entry.roleId.replace('draft-role-', ''));
      const proposed = (p.characters as unknown[])[index];
      return !record(proposed) || proposed.name !== oldRoles[index]?.name;
    })) return creatorDiscussion(value.reply, input,
      '本轮画布关联不完整，同时人物名单发生了变化；为避免把旧角色的认知绑定给另一个人，原画布和待采纳内容已保留，请先整理人物对应关系。');
    // Reject only the new graph. Never erase a previously edited/confirmed graph.
    if (base.brief?.storyGraph) {
      const validEntries = base.brief.storyGraph.entries.filter(e => roleIds.includes(e.roleId));
      const filteredGraph = { ...base.brief.storyGraph, entries: validEntries };
      if (creatorStoryIssues(filteredGraph, roleIds).length === 0) brief.storyGraph = filteredGraph;
      else delete brief.storyGraph;
    } else delete brief.storyGraph;
    notices.push(`画布建议暂未更新：${graphIssues[0]} 其他有效建议仍可查看和采纳。`);
    const otherFields = Object.keys(p).some(k => k !== 'brief')
      || (record(p.brief) && Object.keys(p.brief).some(k => k !== 'storyGraph'));
    if (!otherFields) return creatorDiscussion(value.reply, input, notices.join(' '));
  }
  const response = { ...value, discussionOnly: false, proposal: { ...base, ...p,
    brief }, ...(notices.length ? { proposalIssue: notices.join(' ') } : {}),
    nextQuestions: Array.isArray(value.nextQuestions) ? value.nextQuestions.filter(x => typeof x === 'string').slice(0, 1) : [],
    readiness: value.readiness === 'ready' && !graphIssues.length ? 'ready' : 'needs_detail' };
  if (!isCreatorAgentResponse(response)) return creatorDiscussion(value.reply, input,
    '本轮设定建议未能整理完整，原草稿和待采纳建议保持不变；可以继续讨论。');
  if (response.proposal.brief.storyGraph) {
    const issues = creatorStoryIssues(response.proposal.brief.storyGraph, roleIds);
    if (issues.length) {
      delete response.proposal.brief.storyGraph;
      notices.push(`画布建议暂未写入：${issues[0]} 原草稿保持不变。`);
      response.proposalIssue = notices.join(' ');
    }
  }
  return response;
}
