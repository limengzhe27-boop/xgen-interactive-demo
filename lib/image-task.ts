import type { ImageDirective } from '@/lib/ai-contracts';

export type ImageTaskStatus = 'ready' | 'reused' | 'generating' | 'fallback';

export type ImageTask = {
  requestId: number;
  sceneId: string;
  status: ImageTaskStatus;
  assetUrl: string;
  cacheKey?: string;
  reason: ImageDirective['reason'];
  message: string;
};

export function createInitialImageTask(assetUrl: string): ImageTask {
  return {
    requestId: 0,
    sceneId: 'opening',
    status: 'ready',
    assetUrl,
    reason: 'opening',
    message: '开场场景图',
  };
}

export function startImageTask(current: ImageTask, directive: ImageDirective, requestId: number): ImageTask {
  if (!directive.required || directive.reason === 'reuse') {
    return {
      requestId,
      sceneId: directive.sceneId,
      status: 'reused',
      assetUrl: current.assetUrl,
      cacheKey: current.cacheKey,
      reason: 'reuse',
      message: '复用上一张场景图',
    };
  }
  return {
    requestId,
    sceneId: directive.sceneId,
    status: 'generating',
    assetUrl: current.assetUrl,
    reason: directive.reason,
    message: '硅基流动正在生成场景图',
  };
}

export function finishImageTask(
  current: ImageTask,
  requestId: number,
  result: { assetUrl?: string; cacheKey?: string; error?: string },
): ImageTask {
  if (current.requestId !== requestId) return current;
  if (result.assetUrl) {
    return {
      ...current,
      status: 'ready',
      assetUrl: result.assetUrl,
      cacheKey: result.cacheKey,
      message: result.cacheKey ? '硅基流动场景图已更新 · 本机已保存' : '硅基流动场景图已更新',
    };
  }
  return {
    ...current,
    status: 'fallback',
    message: result.error || '图片模型未接入，已复用上一张场景图',
  };
}
