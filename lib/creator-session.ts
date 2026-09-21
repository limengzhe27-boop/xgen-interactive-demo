import type { CreatorAgentResponse } from './ai-contracts';
import type { CreatorChange } from './creator-changes';
import { isCreatorAgentResponse } from './ai-validation.ts';
import { isWorldGenerationResponse } from './ai-validation.ts';
import { publicationWorld } from './publication.ts';
import type { ContinuationDraft } from './story-continuation';
import { migrateCreatorDirections } from './creator-directions.ts';

export type CreatorSession = { proposal: CreatorAgentResponse['proposal'] | null; changes: CreatorChange[]; input: string; questions: string[]; continuation?: ContinuationDraft };
export function restoreCreatorSession(value: unknown): CreatorSession {
  const empty: CreatorSession = { proposal: null, changes: [], input: '', questions: [] };
  if (!value || typeof value !== 'object') return empty;
  const s = { ...value } as Partial<CreatorSession>;
  if (s.proposal?.brief && typeof s.proposal.brief === 'object') {
    s.proposal = { ...s.proposal, brief: migrateCreatorDirections(s.proposal.brief) };
  }
  const input = typeof s.input === 'string' ? s.input.slice(0, 3000) : '';
  let continuation: ContinuationDraft | undefined;
  try { if (s.continuation) continuation = { base: publicationWorld(s.continuation.base), draftFingerprint: typeof s.continuation.draftFingerprint === 'string' ? s.continuation.draftFingerprint : undefined, ...(isWorldGenerationResponse(s.continuation.proposal) ? { proposal: s.continuation.proposal } : {}) }; } catch { /* invalid draft cannot replace the author's world */ }
  if (!s.proposal || !isCreatorAgentResponse({ reply: '', proposal: s.proposal, nextQuestions: [], readiness: 'ready' })) return { ...empty, input, continuation };
  if (!Array.isArray(s.changes) || s.changes.length > 150 || !s.changes.every(c => c && typeof c.key === 'string' && typeof c.label === 'string'
    && (!c.roleOrder || Array.isArray(c.roleOrder))
    && (!c.target || ((c.target.kind === 'role' || c.target.kind === 'task') && typeof c.target.id === 'string')))) return { ...empty, input };
  const changes = s.changes.map(c => ({ ...c,
    key: c.key === 'successCondition' ? 'preferredDirection' : c.key === 'failureCondition' ? 'alternativeDirection' : c.key,
    // Bulk changes contain flattened brief fields. Do not migrate task payloads.
    ...(c.key === '__all' ? {
      before: c.before && typeof c.before === 'object' ? migrateCreatorDirections(c.before) : c.before,
      after: c.after && typeof c.after === 'object' ? migrateCreatorDirections(c.after) : c.after,
    } : {}),
  }));
  return { proposal: s.proposal, changes, input, continuation, questions: Array.isArray(s.questions) ? s.questions.filter(q => typeof q === 'string').slice(0, 3) : [] };
}
