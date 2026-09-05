import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';

const PRODUCTION_ORIGIN = 'https://xgen-interactive-demo.vercel.app';
export function appOrigin(request: Request) {
  const host = request.headers.get('host') ?? new URL(request.url).host;
  if (host === new URL(PRODUCTION_ORIGIN).host) return PRODUCTION_ORIGIN;
  if (process.env.VERCEL_URL && host === process.env.VERCEL_URL) return `https://${host}`;
  if (!process.env.VERCEL && /^(localhost|127\.0\.0\.1):(3000|3102)$/.test(host)) return `http://${host}`;
  throw new Error('invalid_app_origin');
}
export function sameOrigin(request: Request) {
  try { return request.headers.get('origin') === appOrigin(request); } catch { return false; }
}
export function authConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY && ['github', 'google'].includes(process.env.AUTH_PROVIDER ?? ''));
}
export function authContext(request: Request) {
  if (!authConfigured()) throw new Error('auth_not_configured');
  const pending: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const client = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { httpOnly: true, sameSite: 'lax', secure: appOrigin(request).startsWith('https:') },
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('cookie') ?? ''),
      setAll: (cookies) => { pending.push(...cookies); },
    },
  });
  return {
    client,
    finish: (response: Response) => {
      for (const { name, value, options } of pending) {
        response.headers.append('Set-Cookie', serializeCookieHeader(name, value, { ...options, path: '/', httpOnly: true, sameSite: 'lax' }));
      }
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    },
  };
}
