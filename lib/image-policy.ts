import type { ImageDirective } from './ai-contracts';

export type ImagePurpose = 'scene' | 'portrait';
export const DEFAULT_IMAGE_MODEL = 'doubao-seedream-4-0-250828';
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
  const model = env[purpose === 'portrait' ? 'YIBU_PORTRAIT_MODEL' : 'YIBU_SCENE_MODEL']?.trim()
    || env.YIBU_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  if (!['doubao-seedream-4-0-250828', 'doubao-seedream-4-5-251128'].includes(model)) throw new Error('unsupported_image_model');
  return model;
}
