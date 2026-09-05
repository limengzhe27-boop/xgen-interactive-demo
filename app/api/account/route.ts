import { authConfigured, authContext, sameOrigin } from '@/lib/server-auth';

export async function GET(request: Request) {
  if (!authConfigured()) return Response.json({ configured: false, user: null }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const auth = authContext(request);
    const { data: { user } } = await auth.client.auth.getUser();
    return auth.finish(Response.json({ configured: true, canPublish: process.env.WORLD_PUBLICATION_ENABLED === 'true', provider: process.env.AUTH_PROVIDER, user: user ? {
      id: user.id, name: String(user.user_metadata?.user_name ?? user.user_metadata?.full_name ?? '创作者').slice(0, 80),
    } : null }));
  } catch { return Response.json({ error: 'account_unavailable' }, { status: 503 }); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'invalid_origin' }, { status: 403 });
  try {
    const auth = authContext(request);
    const { error } = await auth.client.auth.signOut({ scope: 'local' });
    return auth.finish(Response.json(error ? { error: 'signout_failed' } : { signedOut: true }, { status: error ? 503 : 200 }));
  } catch { return Response.json({ error: 'account_unavailable' }, { status: 503 }); }
}
