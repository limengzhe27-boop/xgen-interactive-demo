// Explicitly fictional presentation data. Never persist or use for ranking.
export function demoPlayCount(key: string): string {
  let hash = 0;
  for (const char of key) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return `${(120 + hash % 9800).toLocaleString('zh-CN')} 人玩过 · 演示`;
}
