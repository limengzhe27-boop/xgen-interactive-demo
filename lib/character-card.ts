// Public discovery copy, never a character's sent message or world fact.
export const CARD_HOOK_LIMIT = 60;
export function validCardHook(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && value.length <= CARD_HOOK_LIMIT && !/[\r\n]/.test(value));
}
export function characterHook(authored: string | undefined, editorial?: string): string {
  // Explicitly clearing the author's field must not resurrect an editorial hook.
  return authored !== undefined ? authored.trim() : editorial ?? '';
}
