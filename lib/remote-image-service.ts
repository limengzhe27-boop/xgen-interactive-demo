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
  provider: 'yibu';
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
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    const messages: Record<string,string> = {
      account_changed_or_unavailable: '登录状态已变化，请刷新后再发布。已有图片不会重新生成。',
      image_pending: '这张图片已有生成请求，暂未完成；请稍后再查看，不要重复提交。',
      image_generation_or_storage_failed: '图片服务暂时不可用，已有图片已保留。本次发布未完成。',
      image_model_not_configured: '图片服务暂不可用，无法补齐缺少的图片。',
      image_storage_not_configured: '图片存储暂不可用，已有图片不会重做。',
    };
    throw new Error(messages[data.error || ''] || (response.status === 409
      ? '图片请求已有记录或账号状态变化，请稍后查看。已有图片已保留。'
      : response.status === 503 ? '图片服务暂时不可用，已有图片已保留。'
      : `图片准备未完成（${response.status}），已有图片已保留。`));
  }
  const body = await response.json() as Partial<ImageGenerationResult>;
  if (body.requestId !== input.requestId
    || body.sceneId !== input.sceneId
    || typeof body.assetUrl !== 'string'
    || !(body.assetUrl.startsWith('https://') || body.assetUrl.startsWith('data:image/') || /^\/api\/image\/asset\/[a-f0-9]{64}$/.test(body.assetUrl))
    || body.provider !== 'yibu'
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
