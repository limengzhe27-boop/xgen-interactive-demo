import { DISCOVERY_HEADLINES, discoveryHeadline } from './discovery-headlines.ts';
/** Card copy only: canonical stories, character names and saved IDs are unchanged. */
export const HOME_EDITORIAL = [
  { key: 'world:emperor-last-decree' },
  { key: 'character:libai-moon-debt:r1' },
  { key: 'world:ximen-red-ledger' },
  { key: 'world:surrounded-by-beauties' },
  { key: 'world:ascension-work-number' },
  { key: 'character:conquest-watermelon:liu' },
  { key: 'world:peach-source' },
  { key: 'world:rome-three-percent' },
] as const;

/** Discovery artwork only. Never rewrite saved portraits, video references or world state. */
export const HOME_ARTWORK: Record<string, string> = {
  'world:emperor-last-decree': '/assets/expansion/emperor-last-decree/cover-v2.webp',
  'character:libai-moon-debt:r1': '/assets/expansion/libai-moon-debt/r1-v2.webp',
  'world:ximen-red-ledger': '/assets/expansion/ximen-red-ledger/cover-v2.webp',
  'world:surrounded-by-beauties': '/assets/expansion/surrounded-by-beauties/cover-v2.webp',
  'world:ascension-work-number': '/assets/ascension-v1/cover-v2.webp',
  'character:conquest-watermelon:liu': '/assets/conquest-v1/liu-v2.webp',
  'world:peach-source': '/assets/expansion/peach-source/cover-v2.webp',
  'world:rome-three-percent': '/assets/expansion/rome-three-percent/cover-v2.webp',
};

export function editorialCopy(key: string): { title?: string; tagline?: string } | undefined {
  return discoveryHeadline(key);
}

/** Compatibility exports for catalogue audits; copy has one maintained source. */
export const WORLD_INVITATIONS = Object.fromEntries(Object.entries(DISCOVERY_HEADLINES).map(([id, entry]) => ['world:' + id, { title: entry.world }]));
export const CHARACTER_INVITATIONS = Object.fromEntries(Object.entries(DISCOVERY_HEADLINES).flatMap(([id, entry]) => Object.entries(entry.characters).map(([role, tagline]) => ['character:' + id + ':' + role, { tagline }])));
export function featureHomeItems<T>(items: T[], key: (item: T) => string): T[] {
  const byKey = new Map(items.map(item => [key(item), item]));
  const selected = HOME_EDITORIAL.flatMap(entry => byKey.has(entry.key) ? [byKey.get(entry.key)!] : []);
  const selectedKeys = new Set(selected.map(key));
  return [...selected, ...items.filter(item => !selectedKeys.has(key(item)))];
}
