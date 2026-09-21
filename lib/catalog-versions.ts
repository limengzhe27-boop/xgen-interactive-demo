/** Public catalog is authoritative for a matching published ID. Draft IDs stay separate. */
export function catalogVersions<T extends { id: string }>(builtIn: T[], local: T[], published: T[]): T[] {
  const entries = new Map<string, T>();
  for (const entry of [...builtIn, ...local, ...published]) entries.set(entry.id, entry);
  return [...entries.values()];
}
