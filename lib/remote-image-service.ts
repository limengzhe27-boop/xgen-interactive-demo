export type ImageGenerationInput = {
  purpose?: 'scene' | 'portrait';
  requestId: number;
  sceneId: string;
  prompt: string;
  seed: number;
};

export type ImageGenerationResult = {
  requestId: number;
  sceneId: string;
  assetUrl: string;
  provider: 'siliconflow';
  model: string;
  persistent: boolean;
  seed?: number;
};

export async function generateSceneImage(
  input: ImageGenerationInput,
  signal?: AbortSignal,
  accountScope = 'guest',
): Promise<ImageGenerationResult> {
  await getRemoteImageStatus();
  const response = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-xgen-account': accountScope },
    body: JSON.stringify(input),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error(`Image request failed with status ${response.status}`);
  const body = await response.json() as Partial<ImageGenerationResult>;
  if (body.requestId !== input.requestId
    || body.sceneId !== input.sceneId
    || typeof body.assetUrl !== 'string'
    || !(body.assetUrl.startsWith('https://') || body.assetUrl.startsWith('data:image/') || /^\/api\/image\/asset\/[a-f0-9]{64}$/.test(body.assetUrl))
    || body.provider !== 'siliconflow'
    || typeof body.model !== 'string'
    || typeof body.persistent !== 'boolean') {
    throw new Error('Image response did not match the request');
  }
  return body as ImageGenerationResult;
}

export async function getRemoteImageStatus(): Promise<{
  configured: boolean;
  provider: string | null;
  model: string | null;
}> {
  const response = await fetch('/api/image', { cache: 'no-store' });
  if (!response.ok) return { configured: false, provider: null, model: null };
  const body = await response.json() as { configured?: unknown; provider?: unknown; model?: unknown };
  return {
    configured: body.configured === true,
    provider: typeof body.provider === 'string' ? body.provider : null,
    model: typeof body.model === 'string' ? body.model : null,
  };
}
