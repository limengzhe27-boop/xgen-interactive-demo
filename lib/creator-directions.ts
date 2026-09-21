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
