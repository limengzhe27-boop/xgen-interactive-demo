import { authConfigured, authContext, sameOrigin } from '@/lib/server-auth';
import { claimImage, findImage, imageId, imageOwner, saveImage, storageFetch } from '@/lib/server-image-store';
import { publicationWorld } from '@/lib/publication';
import publicImages from '@/lib/public-image-manifest.json';
import { libraryArtPaths } from '@/lib/library-art';
import { legacyArt, legacyArtPaths } from '@/lib/legacy-art';

export const maxDuration = 120;
const noStore = { 'Cache-Control': 'no-store' };
const publicPrefix = () => `${process.env.SUPABASE_URL}/storage/v1/object/public/world-public/`;
async function publishImage(path: unknown, request: Request, userId: string): Promise<string> {
  if (typeof path !== 'string' || !path) return legacyArt['storm-manor'].cover;
  if (path === '/assets/storm-manor-cover.png' || path === '/assets/storm-manor-cast.png') return path;
  if (libraryArtPaths.has(path) || legacyArtPaths.has(path)) return path;
  if (Object.hasOwn(publicImages, path)) return `${publicPrefix()}${(publicImages as Record<string, string>)[path]}.webp`;
  const id = /^\/api\/image\/asset\/([a-f0-9]{64})$/.exec(path)?.[1];
  const sharedId = path.startsWith(publicPrefix()) ? /^([a-f0-9]{64})\.webp$/.exec(path.slice(publicPrefix().length))?.[1] : null;
  if (sharedId) {
    const asset = await findImage(sharedId);
    if (asset?.bucket === 'world-public' && asset.status === 'ready') return path;
  }
  if (!id) throw new Error('image_not_publishable');
  const asset = await findImage(id);
  if (!asset || asset.status !== 'ready' || asset.bucket !== 'world-private' || asset.owner_id !== imageOwner(request, false, userId)?.id) throw new Error('image_not_owned');
  const publishedId = imageId(['published-copy', userId, id]);
  const claim = await claimImage(publishedId, imageId(['account', userId]), 'published-copy', 'world-public');
  if (claim.status === 'claimed') {
    const response = await storageFetch(`/storage/v1/object/world-private/${id}.webp`);
    await saveImage(publishedId, Buffer.from(await response.arrayBuffer()), 'world-public');
  } else if (claim.status !== 'ready') throw new Error('image_publish_pending_or_limit');
  return `${publicPrefix()}${publishedId}.webp`;
}

export async function GET(request?: Request) {
  if (request && new URL(request.url).searchParams.get('mine') === 'true') {
    if (!authConfigured()) return Response.json({ error: 'login_required' }, { status: 401, headers: noStore });
    const auth = authContext(request);
    const reply = (body: unknown, status = 200) => auth.finish(Response.json(body, { status }));
    try {
      const { data: { user }, error } = await auth.client.auth.getUser();
      if (error || !user) return reply({ error: 'login_required' }, 401);
      if (request.headers.get('x-xgen-account') !== user.id) return reply({ error: 'account_changed' }, 409);
      const response = await storageFetch(`/rest/v1/demo_world_publications?owner_id=eq.${encodeURIComponent(user.id)}&select=id,document,published,updated_at&order=updated_at.desc&limit=10`);
      return reply({ publications: await response.json(), canPublish: process.env.WORLD_PUBLICATION_ENABLED === 'true' });
    } catch { return reply({ error: 'publications_unavailable' }, 503); }
  }
  try {
    const response = await storageFetch('/rest/v1/demo_world_publications?published=eq.true&select=document&order=updated_at.desc&limit=200');
    const rows = await response.json() as { document: Record<string, unknown> }[];
    return Response.json({ worlds: rows.map(row => {
      const { sourceId: _privateDraftId, ...document } = row.document;
      return document;
    }) }, { headers: noStore });
  } catch { return Response.json({ error: 'world_catalog_unavailable', worlds: [] }, { status: 503, headers: noStore }); }
}

// Unpublishing remains available even while new publication is paused.
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'invalid_origin' }, { status: 403, headers: noStore });
  if (!authConfigured()) return Response.json({ error: 'login_required' }, { status: 401, headers: noStore });
  const auth = authContext(request);
  const reply = (body: unknown, status = 200) => auth.finish(Response.json(body, { status }));
  try {
    const { data: { user }, error } = await auth.client.auth.getUser();
    if (error || !user) return reply({ error: 'login_required' }, 401);
    if (request.headers.get('x-xgen-account') !== user.id) return reply({ error: 'account_changed' }, 409);
    const text = await request.text();
    if (text.length > 2000) return reply({ error: 'request_too_large' }, 413);
    const body = JSON.parse(text);
    if (!/^[a-f0-9]{64}$/.test(body.id) || typeof body.published !== 'boolean' || typeof body.updatedAt !== 'string' || !Number.isFinite(Date.parse(body.updatedAt))) return reply({ error: 'invalid_request' }, 400);
    if (body.published && (process.env.WORLD_PUBLICATION_ENABLED !== 'true' || body.consent !== 'publish-world-and-selected-images-v1')) return reply({ error: 'publication_not_open_or_no_consent' }, 403);
    const response = await storageFetch(`/rest/v1/demo_world_publications?id=eq.${body.id}&owner_id=eq.${encodeURIComponent(user.id)}&updated_at=eq.${encodeURIComponent(body.updatedAt)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ published: body.published, updated_at: new Date().toISOString() }),
    });
    const rows = await response.json() as unknown[];
    if (!rows.length) return reply({ error: 'publication_changed', message: '作品不存在、无权管理或已在别处更新，请刷新列表。' }, 409);
    return reply({ ok: true });
  } catch { return reply({ error: 'publication_update_failed' }, 503); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'invalid_origin' }, { status: 403, headers: noStore });
  if (!authConfigured()) return Response.json({ error: 'login_not_configured' }, { status: 503, headers: noStore });
  if (process.env.WORLD_PUBLICATION_ENABLED !== 'true') return Response.json({ error: 'publication_not_open', message: '公开发布尚未开放，草稿仍可保存在本机。' }, { status: 503, headers: noStore });
  const auth = authContext(request);
  const reply = (body: unknown, status = 200) => auth.finish(Response.json(body, { status }));
  try {
    const { data: { user }, error } = await auth.client.auth.getUser();
    if (error || !user) return reply({ error: 'login_required' }, 401);
    if (request.headers.get('x-xgen-account') !== user.id) return reply({ error: 'account_changed' }, 409);
    const text = await request.text();
    if (text.length > 150000) return reply({ error: 'world_too_large' }, 413);
    const body = JSON.parse(text);
    if (body.consent !== 'publish-world-and-selected-images-v1' || typeof body.sourceId !== 'string' || !body.sourceId || body.sourceId.length > 120) return reply({ error: 'publication_consent_required' }, 400);
    const world = publicationWorld(body.world);
    const id = imageId(['publication', user.id, body.sourceId]);
    const portraits: Record<string, string> = {};
    // Images may become public only after the caller explicitly acknowledges the scope.
    for (const role of world.characters) portraits[role.id] = await publishImage(body.portraits?.[role.id], request, user.id);
    const cover = await publishImage(body.cover, request, user.id);
    const document = { id: `community-${id}`, sourceId: body.sourceId, title: world.title, premise: world.premise, genre: '社区创作', cover, portraits, world: { ...world, id: `community-${id}` } };
    await storageFetch('/rest/v1/rpc/demo_publish_world', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_id: id, p_owner: user.id, p_document: document }) });
    return reply({ published: true, world: document });
  } catch { return reply({ error: 'publication_failed', message: '发布未完成。请检查角色、地点、任务及图片是否有效；原草稿不会被删除。' }, 400); }
}
