// Server configuration only. No direct-provider fallback and no client-selected models.
export const COMPANY_MODELS = {
  text: ['deepseek-v4-flash', 'deepseek-v3.2'],
  image: ['doubao-seedream-4-0-250828', 'doubao-seedream-4-5-251128'],
  video: ['kling-video-o1'],
  speech: ['doubao-tts'],
} as const;
export type CompanyModality = keyof typeof COMPANY_MODELS;
export function companyModel(kind: CompanyModality, env: Record<string, string | undefined> = process.env) {
  const model = env[`YIBU_${kind.toUpperCase()}_MODEL`]?.trim() || COMPANY_MODELS[kind][0];
  if (!(COMPANY_MODELS[kind] as readonly string[]).includes(model)) throw new Error('unsupported_company_model');
  return model;
}
export function companyGateway(env: Record<string, string | undefined> = process.env) {
  const key = env.YIBU_API_KEY?.trim();
  const base = new URL(env.YIBU_BASE_URL?.trim() || 'https://yibuapi.com');
  if (base.origin !== 'https://yibuapi.com' || base.username || base.password || base.search || base.hash || !['/', '/v1', '/v1/'].includes(base.pathname)) throw new Error('invalid_company_gateway');
  return key ? { apiKey: key, endpoint: `${base.origin}/v1` } : null;
}
export async function companyFetch(path: string, body?: unknown, timeoutMs = 60000) {
  const gateway = companyGateway();
  if (!gateway || !/^\/(chat\/completions|images\/generations|audio\/speech|videos(?:\/[A-Za-z0-9_-]+)?)$/.test(path)) throw new Error('company_gateway_not_configured');
  return fetch(gateway.endpoint + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${gateway.apiKey}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs),
  });
}
export function companyAssetUrl(value: unknown) {
  if (typeof value !== 'string') throw new Error('invalid_company_asset');
  const url = new URL(value);
  // Only the gateway and documented upstream CDNs. Never forward gateway credentials.
  const allowed = ['yibuapi.com', 'volces.com', 'klingai.com', 'klingai.com.cdn20.com'];
  // Observed in the authenticated Kling O1 result; authorize this exact CDN host only.
  const exactCdn = url.hostname === 'aitoken-video.qnaigc.com';
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !(exactCdn || allowed.some(host => url.hostname === host || url.hostname.endsWith('.' + host)))) throw new Error('invalid_company_asset');
  return url.href;
}
