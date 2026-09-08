import { appOrigin, authContext } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const auth = authContext(request);
    const { data, error } = await auth.client.auth.signInWithOAuth({
      provider: process.env.AUTH_PROVIDER as 'github' | 'google',
      options: { redirectTo: `${appOrigin(request)}/auth/callback`, skipBrowserRedirect: true },
    });
    if (error || !data.url || new URL(data.url).origin !== new URL(process.env.SUPABASE_URL!).origin) throw new Error('login_failed');
    return auth.finish(new Response(null, { status: 303, headers: { Location: data.url } }));
  } catch {
    return new Response('账号登录尚未配置完成，请返回网站继续以游客体验。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}
