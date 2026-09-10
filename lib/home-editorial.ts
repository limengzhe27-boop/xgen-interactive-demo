/** Card copy only: canonical stories, character names and saved IDs are unchanged. */
export const HOME_EDITORIAL = [
  { key: 'world:emperor-last-decree', title: '刚当上皇帝，百官就请我赴死' },
  { key: 'character:libai-moon-debt:r1', tagline: '这杯酒，敬知己还是买我的沉默？' },
  { key: 'world:ximen-red-ledger', title: '金瓶梅：潘金莲进门，先过大娘子这一关' },
  { key: 'world:surrounded-by-beauties', title: '完蛋！我被美女包围了！' },
  { key: 'world:ascension-work-number', title: '飞升了，怎么还要签契约？' },
  { key: 'character:conquest-watermelon:liu', tagline: '瓜摊就在眼前，你打算怎么开口？' },
  { key: 'world:peach-source', title: '误入桃花源，第一句话该告诉他们什么？' },
  { key: 'world:rome-three-percent', title: '行李在巴黎，我在罗马，手机只剩 3%' },
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
  return CHARACTER_INVITATIONS[key] ?? WORLD_INVITATIONS[key] ?? HOME_EDITORIAL.find(item => item.key === key);
}

/** Reviewed against public openings; never reveal a private answer or promise an ending. */
export const WORLD_INVITATIONS: Record<string, { title: string }> = {
  'world:libai-moon-debt': { title: '李白的酒局：写一首诗，还是卖一次沉默？' },
  'world:inheritance-night': { title: '遗嘱还没宣读，谁已经坐不住了？' },
  'world:borrow-arrows': { title: '诸葛亮借二十条船，却不许我告诉周瑜' },
  'world:campus-three-truths': { title: '同一件事，三份报道：你敢发哪一份？' },
  'world:moon-parcel': { title: '月球包裹变轻了，同事说质量也少了' },
};

/** Public, original card invitations — not canonical dialogue or private knowledge. */
export const CHARACTER_INVITATIONS: Record<string, { tagline: string }> = {
  'character:apocalypse-labels:r2': { tagline: '最后这箱物资，你到底带不带？' },
  'character:ximen-red-ledger:r1': { tagline: '这一屋的脸色，该先看谁的？' },
  'character:ximen-red-ledger:r2': { tagline: '新宠进门，内宅就能太平吗？' },
  'character:ximen-red-ledger:r3': { tagline: '新来的第五房，该怎样接这个礼？' },
  'character:banquet-creditor:yi': { tagline: '家人的脸面，丈夫的委屈，她选哪边？' },
  'character:banquet-creditor:yan': { tagline: '门边这把椅子，你觉得我该坐吗？' },
  'character:banquet-creditor:ting': { tagline: '喝了这杯，过去的事就算了？' },
  'character:libai-moon-debt:r2': { tagline: '欠的是钱，还是还不清的人情？' },
  'character:libai-moon-debt:r3': { tagline: '若诗里不能说真话，这酒还喝吗？' },
  'character:yoga-lotus-boundary:lin': { tagline: '门外有人敲，丈夫的消息也来了。' },
  'character:yoga-lotus-boundary:lu': { tagline: '体贴之外，他愿不愿谈一句承诺？' },
  'character:yoga-lotus-boundary:zhou': { tagline: '一句“你去接”，她还能忍多久？' },
  'character:yoga-lotus-boundary:wang': { tagline: '我以为，自己才是被偏爱的那个。' },
  'character:inheritance-night:xu': { tagline: '遗嘱没听到，为什么先让我签字？' },
  'character:inheritance-night:he': { tagline: '我替家里做的事，就不值一个位置？' },
  'character:inheritance-night:lu': { tagline: '亲情能不能代替一份正式文件？' },
  'character:emperor-last-decree:r1': { tagline: '刚睁眼，就有人替我选好了死法。' },
  'character:emperor-last-decree:r2': { tagline: '为天下赴死，陛下还有何疑问？' },
  'character:emperor-last-decree:r3': { tagline: '不许我入殿，军令是谁下的？' },
  'character:surrounded-by-beauties:r1': { tagline: '我只是来租房，怎么成了试镜的？' },
  'character:surrounded-by-beauties:r2': { tagline: '先别躲镜头，你是来试镜的吗？' },
  'character:surrounded-by-beauties:r3': { tagline: '菜还等着送审，谁拖走了我的箱子？' },
  'character:surrounded-by-beauties:r4': { tagline: '先别走，你脚边那个是我的样机。' },
  'character:peach-source:r1': { tagline: '他们问今是何世，我该从哪说起？' },
  'character:peach-source:r2': { tagline: '客从何来？外面如今是何世？' },
  'character:peach-source:r3': { tagline: '外面的日子，真比这里好吗？' },
  'character:borrow-arrows:r1': { tagline: '二十条船，只凭一句话就借？' },
  'character:borrow-arrows:r2': { tagline: '船可以借，这事能替我瞒住吗？' },
  'character:borrow-arrows:r3': { tagline: '要调军资，谁来给我一个交代？' },
  'character:live-apology:yao': { tagline: '让我念道歉稿，敢不敢先放原片？' },
  'character:live-apology:xiao': { tagline: '直播快开始了，她会照着稿念吗？' },
  'character:live-apology:yin': { tagline: '这场澄清，谁的话能进直播？' },
  'character:boardroom-reckoning:chuan': { tagline: '三个人批的款，凭什么只剩我签字？' },
  'character:boardroom-reckoning:zheng': { tagline: '拿张委托，就想坐我的位置？' },
  'character:boardroom-reckoning:lan': { tagline: '保管审批记录的人，能只做旁观者吗？' },
};

export function featureHomeItems<T>(items: T[], key: (item: T) => string): T[] {
  const byKey = new Map(items.map(item => [key(item), item]));
  const selected = HOME_EDITORIAL.flatMap(entry => byKey.has(entry.key) ? [byKey.get(entry.key)!] : []);
  const selectedKeys = new Set(selected.map(key));
  return [...selected, ...items.filter(item => !selectedKeys.has(key(item)))];
}
