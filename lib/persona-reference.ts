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

export type ReferenceNote = { field: ReferenceField; kind: 'addition' | 'conflict'; text: string; reason: string; evidence: string };
export type ReferenceReview = { notes: ReferenceNote[]; reference: PersonaReference; rejectedCount: number };
// Extract only fictional text fields; never forward a portrait, account, real profile or chat.
export function referenceDraft(value: unknown): PersonaDraft | null { return readPersonaDraft(value); }
export function readReferenceReview(value: unknown): ReferenceReview | null {
  if (!record(value) || !Array.isArray(value.notes) || value.notes.length > 6) return null;
  const reference = readPersonaReference(value.reference);
  if (!reference || !Number.isInteger(value.rejectedCount) || Number(value.rejectedCount) < 0 || Number(value.rejectedCount) > 6) return null;
  const notes: ReferenceNote[] = [];
  for (const n of value.notes) {
    if (!record(n) || !referenceFields.includes(n.field as ReferenceField) || !['addition', 'conflict'].includes(String(n.kind))
      || typeof n.text !== 'string' || !n.text.trim() || n.text.length > 450
      || typeof n.reason !== 'string' || n.reason.length > 200 || typeof n.evidence !== 'string' || n.evidence.trim().length < 2 || n.evidence.length > 200) return null;
    notes.push({ field: n.field as ReferenceField, kind: n.kind as ReferenceNote['kind'], text: n.text.trim(), reason: n.reason.trim(), evidence: n.evidence.trim() });
  }
  return { notes, reference, rejectedCount: Number(value.rejectedCount) };
}
export function groundedReferenceNotes(value: unknown, document: string, draft: PersonaDraft): { notes: ReferenceNote[]; rejectedCount: number } | null {
  if (!record(value) || !Array.isArray(value.notes) || value.notes.length > 6) return null;
  const parsed = readReferenceReview({ notes: value.notes, rejectedCount: 0, reference: { title: '验证', url: 'https://zh.wikipedia.org/w/index.php?curid=1', retrievedAt: 1, fields: [] } });
  if (!parsed) return null;
  const normalize = (text: string) => text.replace(/\s+/g, '');
  const notes: ReferenceNote[] = []; let rejectedCount = 0;
  for (const note of parsed.notes) {
    if (!normalize(document).includes(normalize(note.evidence))) { rejectedCount++; continue; }
    // A name is an alias/custom choice, not a paragraph to append or replace.
    if (note.field === 'name' && draft.name.trim()) continue;
    if (normalize(draft[note.field]).includes(normalize(note.text)) || notes.some(n => n.field === note.field && n.text === note.text)) continue;
    notes.push(note);
  }
  return { notes, rejectedCount };
}
export function appendReferenceNotes(draft: PersonaDraft, notes: ReferenceNote[]): PersonaDraft | null {
  const next = { ...draft };
  for (const note of notes) {
    if (note.kind !== 'addition' || !note.text.trim()) continue;
    if (next[note.field].replace(/\s+/g, '').includes(note.text.replace(/\s+/g, ''))) continue;
    if (note.field === 'name' && next.name.trim()) continue;
    const appended = next[note.field] ? `${next[note.field]}\n${note.text.trim()}` : note.text.trim();
    if (appended.length > (note.field === 'name' ? 40 : 1000)) return null; // atomic: no silent truncation
    next[note.field] = appended;
  }
  return next;
}
