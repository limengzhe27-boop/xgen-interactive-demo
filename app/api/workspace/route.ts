import { authConfigured, authContext, sameOrigin } from '@/lib/server-auth';
import { readCloudSnapshot, SNAPSHOT_LIMIT } from '@/lib/cloud-workspace';

async function handle(request: Request, writing: boolean) {
  if (writing && !sameOrigin(request)) return Response.json({ error: 'invalid_origin' }, { status: 403 });
  if (!authConfigured()) return Response.json({ error: 'login_not_configured' }, { status: 503 });
  const auth = authContext(request);
  const reply = (body: unknown, status = 200) => auth.finish(Response.json(body, { status }));
  try {
    const { data: { user }, error } = await auth.client.auth.getUser();
    if (error || !user) return reply({ error: 'login_required' }, 401);
    if (request.headers.get('x-xgen-account') !== user.id) return reply({ error: 'account_changed' }, 409);
    if (!writing) {
      const result = await auth.client.from('demo_private_workspaces').select('revision,document,updated_at').eq('owner_id', user.id).maybeSingle();
      if (result.error) return reply({ error: 'cloud_unavailable' }, 503);
      return reply({ revision: result.data?.revision ?? 0, updatedAt: result.data?.updated_at ?? null, snapshot: result.data?.document ? readCloudSnapshot(result.data.document) : null });
    }
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'invalid_request' }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > SNAPSHOT_LIMIT + 1000) return reply({ error: 'snapshot_too_large' }, 413); chunks.push(next.value); } }
    finally { await reader.cancel(); }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (body.consent !== (request.method === 'DELETE' ? 'delete-private-workspace-v1' : 'save-private-workspace-v1')
      || !Number.isSafeInteger(body.revision) || body.revision < 0 || typeof body.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.requestId)) return reply({ error: 'consent_or_revision_required' }, 400);
    const snapshot = request.method === 'DELETE' ? null : readCloudSnapshot(body.snapshot);
    const result = await auth.client.rpc('demo_save_workspace', { p_document: snapshot, p_expected_revision: body.revision, p_request_id: body.requestId });
    if (result.error) return reply({ error: 'cloud_unavailable' }, 503);
    if (result.data?.status === 'conflict') return reply({ error: 'version_conflict' }, 409);
    if (result.data?.status === 'quota') return reply({ error: 'cloud_quota' }, 429);
    if (result.data?.status !== 'saved') return reply({ error: 'cloud_unavailable' }, 503);
    return reply({ revision: result.data.revision, updatedAt: result.data.updatedAt });
  } catch { return reply({ error: 'invalid_or_unavailable_snapshot' }, 400); }
}
export const GET = (request: Request) => handle(request, false);
export const PUT = (request: Request) => handle(request, true);
export const DELETE = (request: Request) => handle(request, true);
