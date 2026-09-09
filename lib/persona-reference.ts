import { readPersonaDraft, type PersonaDraft } from './persona-design.ts';

export const referenceFields = ['name', 'identity', 'personality', 'appearance', 'abilities'] as const;
export type ReferenceField = typeof referenceFields[number];
export const referenceLabels = { name: '角色名称', identity: '身份背景', personality: '性格', appearance: '外貌', abilities: '原作能力与限制' };
export type PersonaReference = { title: string; url: string; retrievedAt: number; fields: ReferenceField[] };
export type ReferenceCandidate = { id: string; title: string; url: string; description: string; publisher: string };
export type ReferenceSuggestion = { proposal: PersonaDraft; reference: PersonaReference; warning: string };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function publicReferenceUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1500) return false;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port
    && (u.hostname === 'one-piece.com' && ['/character/Boa_Hancock/index.html', '/news/o20200902_11463/index.html'].includes(u.pathname) && !u.search
      || u.hostname === 'zh.wikipedia.org' && u.pathname === '/w/index.php' && /^\?curid=\d{1,10}$/.test(u.search)); } catch { return false; }
}
export function readPersonaReference(value: unknown): PersonaReference | undefined {
  if (!record(value) || typeof value.title !== 'string' || !value.title || value.title.length > 160 || !publicReferenceUrl(value.url)
    || typeof value.retrievedAt !== 'number' || !Number.isFinite(value.retrievedAt) || value.retrievedAt <= 0
    || !Array.isArray(value.fields) || value.fields.length > 5 || !value.fields.every(f => referenceFields.includes(f as ReferenceField))) return undefined;
  return { title: value.title, url: value.url, retrievedAt: value.retrievedAt, fields: [...new Set(value.fields)] as ReferenceField[] };
}
export function referenceQuery(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const q = value.trim();
  // A public character/work name, not a URL, email, phone number or a conversation.
  return q && q.length <= 80 && !/[\r\n@<>]|https?:|\d{7,}/i.test(q) ? q : null;
}
export function readReferenceSuggestion(value: unknown): ReferenceSuggestion | null {
  if (!record(value)) return null;
  const proposal = readPersonaDraft(value.proposal), reference = readPersonaReference(value.reference);
  if (!proposal || !reference || typeof value.warning !== 'string' || value.warning.length > 1000) return null;
  return { proposal, reference, warning: value.warning };
}
export function mergeReference(draft: PersonaDraft, suggestion: PersonaDraft, selected: ReferenceField[]): PersonaDraft {
  return Object.fromEntries(referenceFields.map(key => [key, selected.includes(key) && suggestion[key].trim() ? suggestion[key].trim() : draft[key]])) as PersonaDraft;
}
// Evidence must occur in the fetched document. No citation or permission supplied by the model is trusted.
export function groundedReferenceProposal(value: unknown, document: string): PersonaDraft | null {
  if (!record(value) || !record(value.evidence)) return null;
  const proposal = readPersonaDraft(value.proposal); if (!proposal) return null;
  const normalized = document.replace(/\s+/g, '');
  for (const field of referenceFields) {
    const quote = value.evidence[field];
    if (typeof quote !== 'string' || quote.trim().length < 2 || quote.length > 200 || !normalized.includes(quote.replace(/\s+/g, ''))) proposal[field] = '';
  }
  return referenceFields.some(f => f !== 'name' && proposal[f]) ? proposal : null;
}
