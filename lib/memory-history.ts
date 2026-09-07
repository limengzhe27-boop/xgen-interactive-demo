// Private display metadata only. Model requests continue to use current strings.
export type MemoryDetail = {
  source: 'confirmed-suggestion' | 'legacy';
  confirmedAt?: number;
  editedAt?: number;
  revisions: { previous: string; changedAt: number }[];
};
export type MemoryDetails = Record<string, MemoryDetail>;
const timestamp = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0 && v <= 8_640_000_000_000_000;
export function restoreMemoryDetails(value: unknown, memories: string[]): MemoryDetails {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(memories.slice(0, 24).map(text => {
    const raw = Object.hasOwn(data, text) ? data[text] as Partial<MemoryDetail> | null : null;
    const valid = raw && typeof raw === 'object';
    const confirmedAt = valid && raw.source === 'confirmed-suggestion' && timestamp(raw.confirmedAt) ? raw.confirmedAt : undefined;
    return [text, {
      source: confirmedAt ? 'confirmed-suggestion' : 'legacy',
      ...(confirmedAt ? { confirmedAt } : {}),
      ...(valid && timestamp(raw.editedAt) ? { editedAt: raw.editedAt } : {}),
      revisions: valid && Array.isArray(raw.revisions) ? raw.revisions.filter(r => r && typeof r.previous === 'string' && r.previous.length <= 300 && timestamp(r.changedAt)).slice(-5).map(r => ({ previous: r.previous, changedAt: r.changedAt })) : [],
    }];
  }));
}
export function confirmMemoryDetail(details: MemoryDetails, text: string, now = Date.now()): MemoryDetails {
  if (Object.hasOwn(details, text)) return details;
  return { ...details, [text]: { source: 'confirmed-suggestion', confirmedAt: now, revisions: [] } };
}
export function editMemoryDetail(details: MemoryDetails, old: string, text: string, now = Date.now()): MemoryDetails {
  if (old === text) return details;
  const prior = restoreMemoryDetails(details, [old])[old];
  const next = { ...details };
  delete next[old];
  return { ...next, [text]: { ...prior, editedAt: now, revisions: [...prior.revisions, { previous: old, changedAt: now }].slice(-5) } };
}
export function removeMemoryDetail(details: MemoryDetails, text: string): MemoryDetails {
  const next = { ...details }; delete next[text]; return next;
}
