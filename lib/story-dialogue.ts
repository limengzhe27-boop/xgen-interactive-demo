import type { WorldTurnResponse } from './ai-contracts';
export type StoryDialogue = { characterId: string; text: string };
export function visibleDialogue(response: Pick<WorldTurnResponse, 'dialogue'>, playerId: string, roleIds: string[]): StoryDialogue[] {
  return response.dialogue.filter(line => line.visibleToRoleIds.includes(playerId) && roleIds.includes(line.characterId))
    .map(line => ({ characterId: line.characterId, text: line.text }));
}
export function dialogueContext(lines: StoryDialogue[], roles: { id: string; name: string }[]) {
  return lines.map(line => `${roles.find(role => role.id === line.characterId)?.name ?? '未标注人物'}：${line.text}`).join('\n');
}
