/** Card copy only: canonical stories, character names and saved IDs are unchanged. */
export const HOME_EDITORIAL = [
  { key: 'world:emperor-last-decree', title: '刚当上皇帝，百官就请我赴死' },
  { key: 'character:libai-moon-debt:r1', tagline: '这杯酒，敬知己还是买我的沉默？' },
  { key: 'world:spider-under-table', title: '变成蜘蛛后，我的家在人类桌底' },
  { key: 'world:surrounded-by-beauties', title: '完蛋！我被美女包围了！' },
  { key: 'world:ascension-work-number', title: '飞升了，怎么还要签契约？' },
  { key: 'character:conquest-watermelon:liu', tagline: '瓜摊就在眼前，你打算怎么开口？' },
  { key: 'world:peach-source', title: '穿进桃花源，他们还以为外面是秦朝' },
  { key: 'world:rome-three-percent', title: '行李在巴黎，我在罗马，手机只剩 3%' },
] as const;

/** Discovery artwork only. Never rewrite saved portraits, video references or world state. */
export const HOME_ARTWORK: Record<string, string> = {
  'world:emperor-last-decree': '/assets/expansion/emperor-last-decree/cover-v2.webp',
  'character:libai-moon-debt:r1': '/assets/expansion/libai-moon-debt/r1-v2.webp',
  'world:spider-under-table': '/assets/expansion/spider-under-table/cover-v2.webp',
  'world:surrounded-by-beauties': '/assets/expansion/surrounded-by-beauties/cover-v2.webp',
  'world:ascension-work-number': '/assets/ascension-v1/cover-v2.webp',
  'character:conquest-watermelon:liu': '/assets/conquest-v1/liu-v2.webp',
  'world:peach-source': '/assets/expansion/peach-source/cover-v2.webp',
  'world:rome-three-percent': '/assets/expansion/rome-three-percent/cover-v2.webp',
};

export function editorialCopy(key: string): { title?: string; tagline?: string } | undefined {
  return CHARACTER_INVITATIONS[key] ?? HOME_EDITORIAL.find(item => item.key === key);
}

/** Public, original card invitations — not canonical dialogue or private knowledge. */
export const CHARACTER_INVITATIONS: Record<string, { tagline: string }> = {
  'character:apocalypse-labels:r2': { tagline: '车钥匙在我手里。最后这箱物资，你到底带不带？' },
  'character:ximen-red-ledger:r3': { tagline: '你想接近西门庆？先说说，你能帮我什么。' },
  'character:banquet-creditor:yi': { tagline: '一边是家人的脸面，一边是丈夫——她会站在哪边？' },
};

export function featureHomeItems<T>(items: T[], key: (item: T) => string): T[] {
  const byKey = new Map(items.map(item => [key(item), item]));
  const selected = HOME_EDITORIAL.flatMap(entry => byKey.has(entry.key) ? [byKey.get(entry.key)!] : []);
  const selectedKeys = new Set(selected.map(key));
  return [...selected, ...items.filter(item => !selectedKeys.has(key(item)))];
}
