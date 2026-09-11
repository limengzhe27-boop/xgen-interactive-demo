import { storageFetch } from './server-image-store';
import { companyFetch, companyAssetUrl } from './company-gateway';
import { mediaLimit, videoResult, type MediaKind } from './media-policy';
export type MediaAsset = { id: string; owner_id: string; kind: MediaKind; model: string; status: string; task_id: string | null };
export async function findMedia(id: string): Promise<MediaAsset | null> {
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  const r = await storageFetch(`/rest/v1/demo_media_assets?id=eq.${id}&select=id,owner_id,kind,model,status,task_id`);
  return (await r.json() as MediaAsset[])[0] ?? null;
}
export async function updateMedia(id: string, values: { status: string; task_id?: string; bytes?: number }) {
  await storageFetch(`/rest/v1/demo_media_assets?id=eq.${id}&status=neq.ready`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
}
export async function boundedMedia(response: Response, kind: MediaKind) {
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > mediaLimit(kind)) throw new Error('media_download_failed');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; total += value.length; if (total > mediaLimit(kind)) throw new Error('media_too_large'); chunks.push(value); } }
  finally { await reader.cancel(); }
  const buffer = Buffer.concat(chunks);
  const mp3 = buffer.subarray(0,3).toString() === 'ID3' || (buffer[0] === 255 && (buffer[1] & 224) === 224);
  const mp4 = buffer.subarray(4,8).toString() === 'ftyp';
  if (!buffer.length || (kind === 'speech' ? !mp3 : !mp4)) throw new Error('invalid_media_format');
  return buffer;
}
export const mediaPath = (id: string, kind: MediaKind) => `/storage/v1/object/demo-media-private/${id}.${kind === 'speech' ? 'mp3' : 'mp4'}`;
export async function saveMedia(asset: Pick<MediaAsset,'id'|'kind'>, buffer: Buffer, taskMetadata?:()=>string) {
  await storageFetch(mediaPath(asset.id, asset.kind), { method:'POST', headers: { 'Content-Type': asset.kind === 'speech' ? 'audio/mpeg' : 'video/mp4', 'x-upsert':'true' }, body: new Uint8Array(buffer) });
  await updateMedia(asset.id, { status:'ready', bytes:buffer.length,...(taskMetadata?{task_id:taskMetadata()}:{}) });
}
export async function refreshVideo(asset: MediaAsset) {
  if (asset.kind !== 'video' || asset.status !== 'queued' || !asset.task_id || !/^[A-Za-z0-9_-]{1,160}$/.test(asset.task_id)) return asset;
  const response = await companyFetch(`/videos/${asset.task_id}`, undefined, 20000);
  if (!response.ok) throw new Error('video_query_failed');
  const result = videoResult(await response.json());
  if (result.status === 'failed') { await updateMedia(asset.id, { status:'failed' }); return { ...asset, status:'failed' }; }
  if (result.status === 'ready') {
    // No credentials sent to the output CDN, redirects are forbidden.
    const download = await fetch(companyAssetUrl(result.url), { signal:AbortSignal.timeout(60000), redirect:'error' });
    await saveMedia(asset, await boundedMedia(download,'video'));
    return { ...asset, status:'ready' };
  }
  return asset;
}
