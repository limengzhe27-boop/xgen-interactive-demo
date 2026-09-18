import type { CharacterDefinition } from './ai-contracts';
import type { CharacterGreeting } from './character-greeting';

// Legacy content falls back only to fields already designated public. No secret
// keyword filtering: private prose must never become public by accident.
export function characterPublicIntroduction(role: CharacterDefinition): string {
  return role.publicIntroduction !== undefined ? role.publicIntroduction.trim() : role.publicBackground?.trim() || '';
}

export function initialConversationSuggestions(greeting?: CharacterGreeting): string[] {
  if (Array.isArray(greeting?.suggestions)) {
    return [...new Set(greeting.suggestions.filter(text => typeof text === 'string' && text.trim())
      .map(text => text.trim()))].slice(0, 3);
  }
  // Legacy fallback is intentionally modest: no invented clues, relationship,
  // user identity, or guaranteed outcome. Picking one only fills the composer.
  return greeting?.text ? ['你刚才说的，能再讲讲吗？', '先看看周围，听听对方接下来想说什么。'] : [];
}

export function validCharacterPresentation(role: Record<string, unknown>): boolean {
  if (role.publicIntroduction !== undefined && (typeof role.publicIntroduction !== 'string' || role.publicIntroduction.length > 1200)) return false;
  if (role.chatOpening === undefined) return true;
  const opening = role.chatOpening as Record<string, unknown> | null;
  return !!opening && typeof opening === 'object' && !Array.isArray(opening)
    && typeof opening.scene === 'string' && !!opening.scene.trim() && opening.scene.length <= 2000
    && typeof opening.text === 'string' && !!opening.text.trim() && opening.text.length <= 1000
    && (opening.suggestions === undefined || (Array.isArray(opening.suggestions) && opening.suggestions.length <= 3
      && opening.suggestions.every(item => typeof item === 'string' && !!item.trim() && item.length <= 180)));
}
