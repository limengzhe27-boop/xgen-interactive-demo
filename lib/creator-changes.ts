// Compare-and-swap applies and undoes only the chosen section. A later manual
// edit wins over an old model response or an old undo record.
export type CreatorChange = { key: string; label: string; before: unknown; after: unknown };
export function creatorChanges(before: Record<string, unknown>, after: Record<string, unknown>, labels: Record<string, string>): CreatorChange[] {
  return Object.entries(after).filter(([key, value]) => key in labels && JSON.stringify(before[key]) !== JSON.stringify(value))
    .map(([key, value]) => ({ key, label: labels[key], before: before[key], after: value }));
}
export function applyCreatorChange(current: Record<string, unknown>, change: CreatorChange, undo = false) {
  const expected = undo ? change.after : change.before;
  if (JSON.stringify(current[change.key]) !== JSON.stringify(expected)) return null;
  return { ...current, [change.key]: undo ? change.before : change.after };
}
