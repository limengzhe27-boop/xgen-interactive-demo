import { createHash } from 'node:crypto';
import { requestAccount, sameOrigin } from '@/lib/server-auth';
import { claimImage, compressImage, imageId, imageOwner, saveImage, storageConfigured } from '@/lib/server-image-store';

export const maxDuration = 60;

/**
 * Uploads a locally compressed character portrait to the public image bucket.
 * Publication only accepts public storage assets, never client data URLs.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'invalid_origin' }, { status: 403 });
  if (!storageConfigured()) return Response.json({ error: 'image_storage_not_configured' }, { status: 503 });
  try {
    const account = await requestAccount(request, true);
    if (!account.id) return Response.json({ error: 'login_required' }, { status: 401 });
    return account.finish(await upload(request, account.id));
  } catch {
    return Response.json({ error: 'account_changed_or_unavailable' }, { status: 409 });
  }
}

async function upload(request: Request, accountId: string) {
  const owner = imageOwner(request, false, accountId);
  if (!owner) return Response.json({ error: 'image_session_required' }, { status: 401 });
  let body: { dataUrl?: unknown };
  try {
    const text = await request.text();
    if (text.length > 400_000) return Response.json({ error: 'request_too_large' }, { status: 413 });
    body = JSON.parse(text) as { dataUrl?: unknown };
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (typeof body.dataUrl !== 'string') return Response.json({ error: 'invalid_request' }, { status: 400 });
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(body.dataUrl);
  if (!match) return Response.json({ error: 'invalid_image' }, { status: 400 });
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 8_000_000) return Response.json({ error: 'image_too_large' }, { status: 413 });
  const digest = createHash('sha256').update(buffer).digest('hex');
  const id = imageId([owner.id, 'character-portrait', digest]);
  try {
    const claim = await claimImage(id, owner.id, 'character-upload', 'world-public');
    if (claim.status === 'claimed') {
      const compressed = await compressImage(buffer);
      await saveImage(id, compressed, 'world-public');
    } else if (claim.status !== 'ready') {
      return Response.json({ error: `image_${claim.status}` }, { status: claim.status.endsWith('limit') ? 429 : 409 });
    }
    const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/world-public/${id}.webp`;
    return Response.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'image_upload_failed' }, { status: 503 });
  }
}
