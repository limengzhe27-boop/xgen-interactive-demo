import { authConfigured, authContext, sameOrigin } from '@/lib/server-auth';
import { storageFetch } from '@/lib/server-image-store';

const headers = { 'Cache-Control': 'private, no-store' };
export const maxDuration = 30;
async function handle(request: Request, write: boolean) {
  if (write && !sameOrigin(request)) return Response.json({ error: 'invalid_origin' }, { status: 403, headers });
  if (!authConfigured()) return Response.json({ message: '请先登录。' }, { status: 401, headers });
  const auth = authContext(request);
  const reply = (body: unknown, status = 200) => auth.finish(Response.json(body, { status, headers }));
  try {
    const { data: { user }, error } = await auth.client.auth.getUser();
    if (error || !user) return reply({ message: '请先登录后再催更。' }, 401);
    if (request.headers.get('x-xgen-account') !== user.id) return reply({ message: '账号已变化，请刷新。' }, 409);
    if (write) {
      const text = await request.text();
      if (text.length > 300) return reply({ error: 'request_too_large' }, 413);
      let id: unknown;
      try { id = JSON.parse(text).id; } catch { return reply({ error: 'invalid_request' }, 400); }
      if (typeof id !== 'string' || !/^community-[a-f0-9]{64}$/.test(id)) return reply({ message: '这部作品尚未开放作者催更。' }, 400);
      const response = await storageFetch('/rest/v1/rpc/demo_request_world_update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_id: id.slice(10), p_requester: user.id }) });
      const data = await response.json() as { status?: string };
      if (data.status === 'own_world') return reply({ message: '这是你的作品，可以直接继续创作。' }, 409);
      if (data.status === 'unavailable') return reply({ message: '作品已下架或不存在，未发送催更。' }, 404);
      if (data.status !== 'received') throw new Error('invalid_result');
      return reply({ received: true, message: '已记入作者的催更列表。同一发布版只计一次。' });
    }
    const query = new URL(request.url).searchParams;
    const id = query.get('id');
    if (id) {
      if (!/^[a-f0-9]{64}$/.test(id)) return reply({ error: 'invalid_request' }, 400);
      const owned = await storageFetch(`/rest/v1/demo_world_publications?id=eq.${id}&owner_id=eq.${encodeURIComponent(user.id)}&select=id`);
      if (!(await owned.json() as unknown[]).length) return reply({ error: 'not_found' }, 404);
      const edition = query.get('edition');
      if (edition !== null) {
        if (!/^[1-9][0-9]{0,8}$/.test(edition)) return reply({ error: 'invalid_request' }, 400);
        const response = await storageFetch(`/rest/v1/demo_world_editions?publication_id=eq.${id}&edition=eq.${edition}&select=edition,saved_at,document&limit=1`);
        const rows = await response.json() as unknown[];
        return rows.length ? reply({ edition: rows[0] }) : reply({ error: 'not_found' }, 404);
      }
      const before = query.get('before');
      if (before && !/^[1-9][0-9]{0,8}$/.test(before)) return reply({ error: 'invalid_request' }, 400);
      const response = await storageFetch(`/rest/v1/demo_world_editions?publication_id=eq.${id}&select=edition,saved_at,document->>title&order=edition.desc&limit=10${before ? `&edition=lt.${before}` : ''}`);
      return reply({ editions: await response.json() });
    }
    const response = await storageFetch('/rest/v1/rpc/demo_world_update_inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_owner: user.id }) });
    return reply({ inbox: await response.json() });
  } catch {
    return reply({ message: write ? '催更暂未送达，请稍后重试。' : '发布历史与催更暂时不可用。' }, 503);
  }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
