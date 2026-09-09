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

export function editorialCopy(key: string): { title?: string; tagline?: string } | undefined {
  return HOME_EDITORIAL.find(item => item.key === key);
}

export function featureHomeItems<T>(items: T[], key: (item: T) => string): T[] {
  const byKey = new Map(items.map(item => [key(item), item]));
  const selected = HOME_EDITORIAL.flatMap(entry => byKey.has(entry.key) ? [byKey.get(entry.key)!] : []);
  const selectedKeys = new Set(selected.map(key));
  return [...selected, ...items.filter(item => !selectedKeys.has(key(item)))];
}
