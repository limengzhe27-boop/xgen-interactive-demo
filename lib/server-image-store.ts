import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
// Explicit entry avoids the legacy Sites/Vinext ambient `sharp: unknown` stub.
import sharp from 'sharp/lib/index.js';

export const IMAGE_COOKIE = 'xgen-image-owner';
export function storageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY && process.env.IMAGE_SESSION_SECRET);
}
export function imageOwner(request: Request, create = false, accountId?: string | null) {
  const secret = process.env.IMAGE_SESSION_SECRET;
  if (!secret) return null;
  if (accountId) return { id: createHmac('sha256', secret).update(`account-image-v1:${accountId}`).digest('hex'), cookie: null };
  const value = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${IMAGE_COOKIE}=`))?.slice(IMAGE_COOKIE.length + 1);
  const sign = (id: string) => createHmac('sha256', secret).update(id).digest('hex');
  if (value && /^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(value)) {
    const [id, signature] = value.split('.');
    if (timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id)))) return { id, cookie: null };
  }
  if (!create) return null;
  const id = randomBytes(32).toString('hex');
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return { id, cookie: `${IMAGE_COOKIE}=${id}.${sign(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}` };
}
export function imageId(parts: unknown[]) {
  return createHash('sha256').update(JSON.stringify(['webp-v1', ...parts])).digest('hex');
}
export async function storageFetch(path: string, init: RequestInit = {}) {
  if (!storageConfigured()) throw new Error('image_storage_not_configured');
  const headers = new Headers(init.headers);
  headers.set('apikey', process.env.SUPABASE_SECRET_KEY!);
  headers.set('Authorization', `Bearer ${process.env.SUPABASE_SECRET_KEY!}`);
  const response = await fetch(`${process.env.SUPABASE_URL}${path}`, {
    ...init, headers, cache: 'no-store', signal: init.signal ?? AbortSignal.timeout(15000), redirect: 'error',
  });
  if (!response.ok) throw new Error('image_storage_unavailable');
  return response;
}
export type StoredImage = { id: string; owner_id: string; bucket: 'world-public' | 'world-private'; status: string; model: string };
export async function findImage(id: string): Promise<StoredImage | null> {
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  const response = await storageFetch(`/rest/v1/demo_image_assets?id=eq.${id}&select=id,owner_id,bucket,status,model`);
  return (await response.json() as StoredImage[])[0] ?? null;
}
export async function claimImage(id: string, owner: string, model: string, bucket = 'world-private') {
  const response = await storageFetch('/rest/v1/rpc/demo_claim_image', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_id: id, p_owner: owner, p_bucket: bucket, p_model: model }),
  });
  return await response.json() as { status: string };
}
export async function completeImage(id: string, bytes: number) {
  await storageFetch(`/rest/v1/demo_image_assets?id=eq.${id}&status=eq.pending`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ready', bytes }),
  });
}
export async function compressImage(buffer: Buffer) {
  if (!buffer.length || buffer.length > 8_000_000) throw new Error('image_too_large');
  const result = await sharp(buffer, { limitInputPixels: 16_000_000, animated: false })
    .rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  if (result.length > 2_000_000) throw new Error('image_too_large');
  return result;
}
export async function saveImage(id: string, buffer: Buffer, bucket = 'world-private') {
  await storageFetch(`/storage/v1/object/${bucket}/${id}.webp`, {
    method: 'POST', headers: { 'Content-Type': 'image/webp', 'Cache-Control': '31536000', 'x-upsert': 'false' },
    body: new Uint8Array(buffer),
  });
  await completeImage(id, buffer.length);
}
export async function boundedImageDownload(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, redirect: 'error' });
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > 8_000_000) throw new Error('image_download_failed');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 8_000_000) throw new Error('image_too_large');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return compressImage(Buffer.concat(chunks));
}
