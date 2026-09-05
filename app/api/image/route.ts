import { AUTO_IMAGE_INTERVAL, imageModelFor } from '@/lib/image-policy';
import type { ImagePurpose } from '@/lib/image-policy';

type ImageGenerationRequest = {
  purpose?: unknown;
  requestId?: unknown;
  sceneId?: unknown;
  prompt?: unknown;
  seed?: unknown;
};

const SILICONFLOW_IMAGE_ENDPOINT = 'https://api.siliconflow.cn/v1/images/generations';

function getImageConfig(purpose: ImagePurpose = 'scene') {
  const apiKey = process.env.SILICONFLOW_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    model: imageModelFor(purpose, process.env),
    imageSize: process.env.SILICONFLOW_IMAGE_SIZE?.trim() || '1024x576',
  };
}

function isSafeImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'siliconflow.cn' || url.hostname.endsWith('.siliconflow.cn'));
  } catch {
    return false;
  }
}

function detectImageType(buffer: ArrayBuffer, declaredType?: string): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') return 'image/webp';
  return declaredType === 'image/jpeg' || declaredType === 'image/png' || declaredType === 'image/webp' ? declaredType : null;
}

function encodeBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

async function materializeImage(assetUrl: string, signal: AbortSignal): Promise<string | null> {
  const response = await fetch(assetUrl, { signal });
  if (!response.ok) return null;
  const declaredType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > 8_000_000) return null;
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0 || buffer.byteLength > 8_000_000) return null;
  const contentType = detectImageType(buffer, declaredType);
  if (!contentType) return null;
  return `data:${contentType};base64,${encodeBase64(buffer)}`;
}

export async function GET() {
  const config = getImageConfig();
  return Response.json({
    configured: Boolean(config),
    provider: config ? 'siliconflow' : null,
    model: config?.model ?? null,
    models: config ? { scene: config.model, portrait: imageModelFor('portrait', process.env) } : null,
    policy: { automaticIntervalTurns: AUTO_IMAGE_INTERVAL, premiumAutoUpgrade: false, batchSize: 1 },
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 32_000) return Response.json({ error: 'request_too_large' }, { status: 413 });

  let body: ImageGenerationRequest;
  try {
    body = await request.json() as ImageGenerationRequest;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  if ((body.purpose !== undefined && body.purpose !== 'scene' && body.purpose !== 'portrait')
    || !Number.isSafeInteger(body.requestId)
    || typeof body.sceneId !== 'string'
    || !body.sceneId.trim()
    || body.sceneId.length > 120
    || typeof body.prompt !== 'string'
    || !body.prompt.trim()
    || body.prompt.length > 4_000
    || (body.seed !== undefined && (!Number.isSafeInteger(body.seed) || Number(body.seed) < 0 || Number(body.seed) > 9_999_999_999))) {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }

  const purpose = body.purpose === 'portrait' ? 'portrait' : 'scene';
  const config = getImageConfig(purpose);
  if (!config) return Response.json({ error: 'image_model_not_configured' }, { status: 503 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(SILICONFLOW_IMAGE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        prompt: body.prompt.trim(),
        negative_prompt: '文字，字幕，水印，界面元素，logo，低清晰度，重复人物，畸形手指',
        image_size: config.imageSize,
        seed: body.seed,
        batch_size: 1,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return Response.json({ error: 'siliconflow_failed' }, { status: 502 });

    const result = await response.json() as { images?: { url?: unknown }[]; seed?: unknown };
    const temporaryAssetUrl = result.images?.[0]?.url;
    if (!isSafeImageUrl(temporaryAssetUrl)) return Response.json({ error: 'invalid_image_response' }, { status: 502 });
    const persistentAssetUrl = await materializeImage(temporaryAssetUrl, controller.signal).catch(() => null);

    return Response.json({
      requestId: body.requestId,
      sceneId: body.sceneId,
      assetUrl: persistentAssetUrl ?? temporaryAssetUrl,
      persistent: Boolean(persistentAssetUrl),
      provider: 'siliconflow',
      model: config.model,
      purpose,
      seed: typeof result.seed === 'number' ? result.seed : undefined,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'siliconflow_failed' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
