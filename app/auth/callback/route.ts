import { appOrigin, authContext } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const auth = authContext(request);
    const code = new URL(request.url).searchParams.get('code');
    const { error } = code ? await auth.client.auth.exchangeCodeForSession(code) : { error: true };
    return auth.finish(new Response(null, { status: 303, headers: { Location: `${appOrigin(request)}/?account=${error ? 'error' : 'signed-in'}`, 'Referrer-Policy': 'no-referrer' } }));
  } catch { return new Response('登录未完成，请返回网站重试。', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } }); }
}
