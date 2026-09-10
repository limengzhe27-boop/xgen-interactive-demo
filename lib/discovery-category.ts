/** Stable discovery channels; legacy story-specific genres remain intact. */
export const STORY_CATEGORIES = ['都市情感', '逆袭爽剧', '古风历史', '仙侠奇幻', '悬疑惊悚', '冒险生存', '轻松搞笑', '知识体验'] as const;
export const DISCOVERY_CHANNELS = ['全部', '热梗名场面', ...STORY_CATEGORIES] as const;
export function validDiscoveryGenre(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || STORY_CATEGORIES.some(category => value === category || value === category + ' · 热梗名场面'));
}
type DiscoveryItem = { id?: string; genre?: string; title?: string; premise?: string; world?: { discoveryGenre?: string }; discoveryGenre?: string };
export function discoveryCategory(item: DiscoveryItem): string {
  const chosen = item.world?.discoveryGenre || item.discoveryGenre;
  if (chosen && validDiscoveryGenre(chosen)) return chosen.split(' · ')[0];
  const genre = item.genre || '';
  if (STORY_CATEGORIES.some(category => genre === category)) return genre;
  // Migrate legacy metadata only; broad words in plot prose must not override a reviewed genre.
  const rules: [RegExp, string][] = [
    [/古文|名著证据|英语|物理|信息辨别/, '知识体验'],
    [/整活|荒诞|跨界乱入|反派穿书/, '轻松搞笑'],
    [/悬疑|推理|怪谈|疑局|市井风暴/, '悬疑惊悚'],
    [/末世|末日|生存|决赛圈|冒险|高燃守家/, '冒险生存'],
    [/修仙|仙侠|西游|三界|宿命改写/, '仙侠奇幻'],
    [/宫廷|历史|三国|长安|宅院/, '古风历史'],
    [/逆袭|复仇|重生|翻身|夺权|继承人|翻红|遗产/, '逆袭爽剧'],
    [/情感|婚|关系|恋爱|豪门/, '都市情感'],
    [/王者|峡谷/, '轻松搞笑'],
    [/影视名场面/, '悬疑惊悚'],
  ];
  return rules.find(([pattern]) => pattern.test(genre))?.[1] || '待分类';
}
export function isMemeScene(item: DiscoveryItem): boolean {
  const chosen = item.world?.discoveryGenre || item.discoveryGenre;
  if (chosen && validDiscoveryGenre(chosen)) return chosen.includes('热梗名场面');
  return /热梗|整活|影视名场面|跨界乱入/.test(item.genre || '');
}
export function matchesDiscovery(item: DiscoveryItem, channel: string): boolean {
  return channel === '全部' || (channel === '热梗名场面' ? isMemeScene(item) : discoveryCategory(item) === channel);
}
