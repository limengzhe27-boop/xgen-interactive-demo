import { findImage, imageOwner, storageFetch } from '@/lib/server-image-store';
import { requestAccount } from '@/lib/server-auth';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const account = await requestAccount(request);
    const asset = await findImage(id);
    if (!asset || asset.status !== 'ready' || (asset.bucket === 'world-private' && imageOwner(request, false, account.id)?.id !== asset.owner_id)) {
      return new Response('Image not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    const response = await storageFetch(`/storage/v1/object/${asset.bucket}/${id}.webp`);
    return account.finish(new Response(response.body, { headers: {
      'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': asset.bucket === 'world-public' ? 'public, max-age=31536000, immutable' : 'private, no-store',
      Vary: 'Cookie',
    } }));
  } catch {
    return new Response('Image storage unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
