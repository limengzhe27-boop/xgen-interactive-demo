// Public discovery copy, never a character's sent message or world fact.
export const CARD_HOOK_LIMIT = 60;
export function validCardHook(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && value.length <= CARD_HOOK_LIMIT && !/[\r\n]/.test(value));
}
export function characterHook(authored: string | undefined, editorial?: string): string {
  // Explicitly clearing the author's field must not resurrect an editorial hook.
  return authored !== undefined ? authored.trim() : editorial ?? '';
}

export function characterSearchText(character: { name: string; identity: string; worldTitle: string; persona: string; cardHook?: string }, editorial?: string, worldHeadline?: string): string {
  return [character.name, character.identity, character.worldTitle, character.persona, characterHook(character.cardHook, editorial), worldHeadline ?? ''].join(' ');
}
