import type { WorldDefinition } from './ai-contracts';
import type { StudioWorld } from './studio-worlds';

/**
 * A character created outside any world. It is stored on its own and converted
 * to a single-character studio entry only when it needs to be listed or chatted
 * with, so it never appears as a world in 我的世界.
 */
export type StandaloneCharacter = {
  id: string;
  name: string;
  identity: string;
  personality: string;
  appearance: string;
  opening: string;
  sceneName: string;
  createdAt: number;
};

export type StandaloneCharacterInput = Omit<StandaloneCharacter, 'id' | 'createdAt'>;

const LIMITS = {
  name: 24,
  identity: 120,
  personality: 300,
  appearance: 300,
  opening: 600,
  sceneName: 60,
} as const;

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function readStandaloneCharacters(value: unknown): StandaloneCharacter[] {
  if (!Array.isArray(value)) return [];
  const characters: StandaloneCharacter[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const id = text(record.id, 80);
    const name = text(record.name, LIMITS.name);
    if (!id || !name) continue;
    characters.push({
      id,
      name,
      identity: text(record.identity, LIMITS.identity),
      personality: text(record.personality, LIMITS.personality),
      appearance: text(record.appearance, LIMITS.appearance),
      opening: text(record.opening, LIMITS.opening),
      sceneName: text(record.sceneName, LIMITS.sceneName),
      createdAt: typeof record.createdAt === 'number' && Number.isFinite(record.createdAt) ? record.createdAt : Date.now(),
    });
    if (characters.length >= 200) break;
  }
  return characters;
}

export function makeStandaloneCharacter(input: StandaloneCharacterInput): StandaloneCharacter {
  const name = text(input.name, LIMITS.name);
  if (!name) throw new Error('character_name_required');
  return {
    id: crypto.randomUUID(),
    name,
    identity: text(input.identity, LIMITS.identity),
    personality: text(input.personality, LIMITS.personality),
    appearance: text(input.appearance, LIMITS.appearance),
    opening: text(input.opening, LIMITS.opening),
    sceneName: text(input.sceneName, LIMITS.sceneName),
    createdAt: Date.now(),
  };
}

function hueFor(value: string): number {
  let hue = 0;
  for (const character of value) hue = (hue * 31 + (character.codePointAt(0) ?? 0)) % 360;
  return hue;
}

/**
 * An inline cover that gives every custom character a distinct card without a
 * generation call. Stored as a data URI so it survives reloads and exports.
 */
export function standalonePortrait(character: Pick<StandaloneCharacter, 'name'>): string {
  const initial = character.name.trim().charAt(0) || '角';
  const escaped = initial.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hue = hueFor(character.name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 34% 90%)"/><stop offset="1" stop-color="hsl(${(hue + 38) % 360} 38% 72%)"/></linearGradient></defs><rect width="600" height="800" fill="url(#g)"/><circle cx="300" cy="292" r="118" fill="rgba(255,255,255,.28)"/><text x="300" y="316" text-anchor="middle" dominant-baseline="middle" font-family="Songti SC, Noto Serif SC, serif" font-size="150" fill="rgba(42,42,42,.58)">${escaped}</text><text x="300" y="520" text-anchor="middle" font-family="PingFang SC, Noto Sans SC, sans-serif" font-size="38" letter-spacing="6" fill="rgba(42,42,42,.52)">角色</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function standaloneCharacterToWorld(character: StandaloneCharacter): StudioWorld {
  const worldId = `character-${character.id}`;
  const roleId = 'lead';
  const locationId = 'scene';
  const sceneName = character.sceneName || '相遇之处';
  const opening = character.opening || `${character.name}看向你，等你先开口。`;
  const identity = character.identity || '身份未设定';
  const portrait = standalonePortrait(character);
  const cardHook = character.identity ? `${character.name}｜${character.identity}`.slice(0, 60) : character.name;
  const sceneLine = character.identity ? `${character.name}就在你面前。${character.identity}` : `${character.name}就在你面前。`;

  const world: WorldDefinition = {
    id: worldId,
    title: character.name,
    premise: character.identity || opening,
    timeSetting: '此刻',
    locations: [{ id: locationId, name: sceneName, description: `${sceneName}，${character.name}在这里。`, connectedLocationIds: [] }],
    characters: [{
      id: roleId,
      name: character.name,
      identity,
      persona: character.personality || '性格会在对话中逐渐显露。',
      publicBackground: character.identity || '',
      privateKnowledge: [],
      secrets: [],
      goal: '自由交流',
      startLocationId: locationId,
      imagePrompt: character.appearance || '',
      publicIntroduction: character.identity || character.personality || '',
      cardHook,
      chatOpening: { scene: sceneLine, text: opening },
    }],
    relationships: [],
    rules: [],
    coreEvent: '与角色自由交谈',
    surpriseLevel: 1,
    goals: [],
    tasks: [],
    difficultyConstraints: [],
    scheduledEvents: [],
    endingConditions: [],
    openingScene: { locationId, narrative: opening, presentCharacterIds: [roleId], choices: [] },
  };

  return {
    id: worldId,
    title: character.name,
    genre: '角色',
    premise: character.identity || opening,
    cover: portrait,
    portraits: { [roleId]: portrait },
    characterOnly: true,
    world,
  };
}
