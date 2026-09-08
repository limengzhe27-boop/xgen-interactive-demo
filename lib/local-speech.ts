export function localChineseVoices<T extends { localService: boolean; lang: string; voiceURI: string }>(voices: T[]): T[] {
  return voices.filter(v => v.localService && /^(zh|cmn)(-|_|$)/i.test(v.lang)).sort((a, b) => a.voiceURI.localeCompare(b.voiceURI));
}
export function voiceIndex(key: string, count: number): number {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return count ? hash % count : 0;
}
export function speechChunks(text: string): string[] {
  return (text.match(/[^。！？\n]{1,140}[。！？\n]?/gu) ?? []).filter(s => s.trim());
}
