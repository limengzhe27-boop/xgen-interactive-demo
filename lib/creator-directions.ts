/** Migrate creator-level names only. Task completion criteria remain unchanged.
 * Explicit new values (including '') win; missing fields stay missing in patches.
 */
export function migrateCreatorDirections<T extends object>(value: T): T & { preferredDirection?: unknown; alternativeDirection?: unknown } {
  const next: Record<string, unknown> = Object.fromEntries(Object.entries(value ?? {}));
  for (const [oldKey, newKey] of [['successCondition', 'preferredDirection'], ['failureCondition', 'alternativeDirection']]) {
    if (!(newKey in next) && oldKey in next) next[newKey] = next[oldKey];
    delete next[oldKey];
  }
  return next as T & { preferredDirection?: unknown; alternativeDirection?: unknown };
}

/** Wire-only aliases for tabs opened before the field migration. Never persist these. */
export function creatorResponseForTransport(value: unknown): unknown {
  if (!value || typeof value !== 'object' || !('proposal' in value)) return value;
  const proposal = value.proposal;
  if (!proposal || typeof proposal !== 'object' || !('brief' in proposal)) return value;
  const brief = proposal.brief;
  if (!brief || typeof brief !== 'object') return value;
  const migrated = migrateCreatorDirections(brief);
  return { ...value, proposal: { ...proposal, brief: { ...migrated,
    successCondition: migrated.preferredDirection,
    failureCondition: migrated.alternativeDirection,
  } } };
}

export function normalizeCreatorTransport(value: unknown): unknown {
  if (!value || typeof value !== 'object' || !('proposal' in value)) return value;
  const proposal = value.proposal;
  if (!proposal || typeof proposal !== 'object' || !('brief' in proposal) || !proposal.brief || typeof proposal.brief !== 'object') return value;
  return { ...value, proposal: { ...proposal, brief: migrateCreatorDirections(proposal.brief) } };
}
