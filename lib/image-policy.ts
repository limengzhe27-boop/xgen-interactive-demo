import type { ImageDirective } from './ai-contracts';

export type ImagePurpose = 'scene' | 'portrait';
export const DEFAULT_IMAGE_MODEL = 'Tongyi-MAI/Z-Image-Turbo';
export const AUTO_IMAGE_INTERVAL = 3;

// Application policy, not a billing limit: a public API still needs account quotas.
export function shouldGenerateImage(directive: ImageDirective, turn: number, lastAttemptTurn: number, hasOpeningArt = false): boolean {
  if (!directive.required || directive.reason === 'reuse') return false;
  if (directive.reason === 'opening') return turn === 0 && !hasOpeningArt;
  if (directive.reason !== 'location_changed' && directive.reason !== 'major_event') return false;
  return turn - lastAttemptTurn >= AUTO_IMAGE_INTERVAL;
}

export function imageModelFor(purpose: ImagePurpose, env: Record<string, string | undefined>): string {
  // No automatic premium upgrade or provider fallback. Overrides are operator-controlled.
  return env[purpose === 'portrait' ? 'SILICONFLOW_PORTRAIT_MODEL' : 'SILICONFLOW_SCENE_MODEL']?.trim()
    || env.SILICONFLOW_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
}
