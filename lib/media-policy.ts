export const SPEECH_MAX_CHARS = 1200;
export const SPEECH_VOICES = [
  { id: 'zh_female_vv_uranus_bigtts', label: '明亮女声' },
  { id: 'zh_male_m191_uranus_bigtts', label: '清朗男声' },
] as const;
export type MediaKind = 'speech' | 'video';
export function readMediaInput(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (!['speech','video'].includes(String(v.kind)) || typeof v.text !== 'string' || !v.text.trim()
    || v.text.length > (v.kind === 'speech' ? SPEECH_MAX_CHARS : 2000) || v.confirmed !== true) return null;
  if (v.kind === 'speech' && !SPEECH_VOICES.some(voice => voice.id === v.voice)) return null;
  return { kind: v.kind as MediaKind, text: v.text.trim(), voice: v.kind === 'speech' ? v.voice as string : '' };
}
export function mediaLimit(kind: MediaKind) { return kind === 'video' ? 20_000_000 : 2_000_000; }
export function videoPayload(model: string, text: string) {
  return { model, prompt: `把以下已经发生的一幕演绎成一个连续镜头，不追加剧情，不出现字幕：${text}`, seconds: '5', size: '1920x1080', mode: 'pro' };
}
export function videoResult(value: unknown): { status: 'queued' | 'ready' | 'failed'; url?: string } {
  if (!value || typeof value !== 'object') throw new Error('invalid_video_response');
  const v = value as { status?: string; video?: { url?: string }; metadata?: { url?: string }; content?: { video_url?: string } };
  if (['failed','cancelled','canceled','error'].includes(v.status ?? '')) return { status: 'failed' };
  if (['completed','succeeded'].includes(v.status ?? '')) {
    const url = v.video?.url || v.metadata?.url || v.content?.video_url;
    if (!url) throw new Error('video_url_missing');
    return { status: 'ready', url };
  }
  if (!['queued','pending','processing','running','submitted','in_progress'].includes(v.status ?? '')) throw new Error('invalid_video_status');
  return { status: 'queued' };
}
