import { AUTO_IMAGE_INTERVAL, imageModelFor } from '@/lib/image-policy';
import { requestAccount } from '@/lib/server-auth';
import { boundedImageDownload, claimImage, imageId, imageOwner, saveImage, storageConfigured } from '@/lib/server-image-store';

export const maxDuration = 120;
export async function GET(request: Request) {
  try {
  const account = await requestAccount(request);
  const configured = Boolean(process.env.SILICONFLOW_API_KEY) && storageConfigured();
  const owner = imageOwner(request, true, account.id);
  return account.finish(Response.json({
    configured, cloudStorage: storageConfigured(), provider: configured ? 'siliconflow' : null,
    model: imageModelFor('scene', process.env),
    models: { scene: imageModelFor('scene', process.env), portrait: imageModelFor('portrait', process.env) },
    policy: { automaticIntervalTurns: AUTO_IMAGE_INTERVAL, premiumAutoUpgrade: false, batchSize: 1, dailyGlobalLimit: 30, dailyDeviceLimit: 10, privateByDefault: true },
  }, { headers: { 'Cache-Control': 'no-store', ...(owner?.cookie ? { 'Set-Cookie': owner.cookie } : {}) } }));
  } catch { return Response.json({ error: 'account_unavailable' }, { status: 503 }); }
}

export async function POST(request: Request) {
  try {
    const account = await requestAccount(request, true);
    return account.finish(await handlePost(request, account.id));
  } catch { return Response.json({ error: 'account_changed_or_unavailable' }, { status: 409 }); }
}

async function handlePost(request: Request, accountId: string | null) {
  const origin = request.headers.get('origin');
  // Next's internal URL may use localhost behind a proxy; Host is the browser-facing authority.
  if (origin) {
    try {
      const source = new URL(origin);
      if (!['http:', 'https:'].includes(source.protocol) || source.host !== (request.headers.get('host') ?? new URL(request.url).host)) throw new Error('origin mismatch');
    } catch { return Response.json({ error: 'invalid_origin' }, { status: 403 }); }
  }
  const owner = imageOwner(request, false, accountId);
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!storageConfigured()) return reply({ error: 'image_storage_not_configured' }, 503);
  if (!owner) return reply({ error: 'image_session_required' }, 401);
  let body;
  try {
    const text = await request.text();
    if (text.length > 32000) return reply({ error: 'request_too_large' }, 413);
    body = JSON.parse(text);
  } catch { return reply({ error: 'invalid_json' }, 400); }
  if (!body || (body.purpose !== undefined && !['scene', 'portrait'].includes(body.purpose))
    || !Number.isSafeInteger(body.requestId) || typeof body.sceneId !== 'string' || !body.sceneId.trim() || body.sceneId.length > 120
    || typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 4000
    || (body.seed !== undefined && (!Number.isSafeInteger(body.seed) || body.seed < 0 || body.seed > 9999999999))) return reply({ error: 'invalid_request' }, 400);
  const purpose = body.purpose === 'portrait' ? 'portrait' : 'scene';
  const model = imageModelFor(purpose, process.env);
  const size = process.env.SILICONFLOW_IMAGE_SIZE?.trim() || '1024x576';
  const seed = body.seed ?? 0;
  const id = imageId([owner.id, purpose, model, size, seed, body.prompt.trim()]);
  const success = (reused: boolean) => reply({ requestId: body.requestId, sceneId: body.sceneId, assetUrl: `/api/image/asset/${id}`, persistent: true, cloudStored: true, reused, provider: 'siliconflow', model, purpose, seed });
  const key = process.env.SILICONFLOW_API_KEY?.trim();
  if (!key) return reply({ error: 'image_model_not_configured' }, 503);
  try {
    // Atomic across Vercel instances; uncertain attempts never automatically retry the model.
    const claim = await claimImage(id, owner.id, model);
    if (claim.status === 'ready') return success(true);
    if (claim.status !== 'claimed') return reply({ error: `image_${claim.status}` }, claim.status.endsWith('limit') ? 429 : 409);
    const signal = AbortSignal.timeout(90000);
    const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: body.prompt.trim(), negative_prompt: '文字，字幕，水印，界面元素，logo，低清晰度，重复人物，畸形手指', image_size: size, seed, batch_size: 1 }), signal,
    });
    if (!response.ok) return reply({ error: 'siliconflow_failed' }, 502);
    const result = await response.json() as { images?: { url: string }[] };
    const url = new URL(result.images?.[0]?.url ?? '');
    if (url.protocol !== 'https:' || !(url.hostname === 'siliconflow.cn' || url.hostname.endsWith('.siliconflow.cn'))) return reply({ error: 'invalid_image_response' }, 502);
    const buffer = await boundedImageDownload(url.href, signal);
    await saveImage(id, buffer);
    return success(false);
  } catch {
    // Reservation is retained after uncertain failures, preventing duplicate billing.
    return reply({ error: 'image_generation_or_storage_failed' }, 503);
  }
}
