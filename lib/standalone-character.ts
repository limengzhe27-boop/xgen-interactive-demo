import type { WorldDefinition } from './ai-contracts';
import type { StudioWorld } from './studio-worlds';
import { localPortrait } from './persona-upload';
import { EMPTY_CHARACTER_PROFILE, characterProfileIsEmpty, readCharacterProfile, type CharacterProfile } from './character-profile';

/**
 * A character created outside any world. It is stored on its own and converted
 * to a single-character studio entry only when it needs to be listed or chatted
 * with, so it never appears as a world in 我的世界.
 */
export type StandaloneCharacter = {
  id: string;
  name: string;
  identity: string;
  agentTask: string;
  basicInfo: string;
  keyPlotNodes: string;
  outputRules: string;
  personality: string;
  appearance: string;
  opening: string;
  sceneName: string;
  worldBackground: string;
  portrait: string;
  /** L1-L5 character bible; optional for characters created before this field. */
  profile: CharacterProfile;
  createdAt: number;
};

export type StandaloneCharacterInput = Omit<StandaloneCharacter, 'id' | 'createdAt'>;

export const EMPTY_STANDALONE_CHARACTER: StandaloneCharacterInput = {
  name: '',
  identity: '',
  agentTask: '',
  basicInfo: '',
  keyPlotNodes: '',
  outputRules: '',
  personality: '',
  appearance: '',
  opening: '',
  sceneName: '',
  worldBackground: '',
  portrait: '',
  profile: { ...EMPTY_CHARACTER_PROFILE },
};

const LIMITS = {
  name: 24,
  identity: 120,
  agentTask: 4000,
  basicInfo: 5000,
  keyPlotNodes: 5000,
  outputRules: 4000,
  personality: 300,
  appearance: 300,
  opening: 600,
  sceneName: 60,
  worldBackground: 3000,
} as const;

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const PUBLIC_PORTRAIT = /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/world-public\/[a-f0-9]{64}\.webp$/i;

/** A locally compressed portrait or an already-published public image URL. */
export function validCharacterPortrait(value: unknown): value is string {
  return localPortrait(value) || (typeof value === 'string' && PUBLIC_PORTRAIT.test(value));
}

export function readStandaloneCharacterInput(value: unknown): StandaloneCharacterInput | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const profile = readCharacterProfile(record.profile);
  const legacyBasicInfo = [record.personality, record.appearance, profile.lifeContext, profile.traits]
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .join('\n\n');
  const draft: StandaloneCharacterInput = {
    name: text(record.name, LIMITS.name),
    identity: text(record.identity, LIMITS.identity),
    agentTask: text(record.agentTask, LIMITS.agentTask),
    basicInfo: text(record.basicInfo, LIMITS.basicInfo) || text(legacyBasicInfo, LIMITS.basicInfo),
    keyPlotNodes: text(record.keyPlotNodes, LIMITS.keyPlotNodes),
    outputRules: text(record.outputRules, LIMITS.outputRules),
    personality: text(record.personality, LIMITS.personality),
    appearance: text(record.appearance, LIMITS.appearance),
    opening: text(record.opening, LIMITS.opening),
    sceneName: text(record.sceneName, LIMITS.sceneName),
    worldBackground: text(record.worldBackground, LIMITS.worldBackground),
    portrait: validCharacterPortrait(record.portrait) ? record.portrait : '',
    profile,
  };
  const hasCardText = [draft.name, draft.identity, draft.agentTask, draft.basicInfo, draft.keyPlotNodes, draft.outputRules,
    draft.personality, draft.appearance, draft.opening, draft.sceneName].some(Boolean);
  return hasCardText || !characterProfileIsEmpty(profile) ? draft : null;
}

export type CharacterDraftState = { sourceId: string; draft: StandaloneCharacterInput };

export function readCharacterDraft(value: unknown): CharacterDraftState | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const sourceId = typeof record.sourceId === 'string' && /^[A-Za-z0-9-]{8,80}$/.test(record.sourceId) ? record.sourceId : '';
  const draft = readStandaloneCharacterInput(record.draft);
  return sourceId && draft ? { sourceId, draft } : null;
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
    const profile = readCharacterProfile(record.profile);
    const legacyBasicInfo = [record.personality, record.appearance, profile.lifeContext, profile.traits]
      .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      .join('\n\n');
    characters.push({
      id,
      name,
      identity: text(record.identity, LIMITS.identity),
      agentTask: text(record.agentTask, LIMITS.agentTask),
      basicInfo: text(record.basicInfo, LIMITS.basicInfo) || text(legacyBasicInfo, LIMITS.basicInfo),
      keyPlotNodes: text(record.keyPlotNodes, LIMITS.keyPlotNodes),
      outputRules: text(record.outputRules, LIMITS.outputRules),
      personality: text(record.personality, LIMITS.personality),
      appearance: text(record.appearance, LIMITS.appearance),
      opening: text(record.opening, LIMITS.opening),
      sceneName: text(record.sceneName, LIMITS.sceneName),
      worldBackground: text(record.worldBackground, LIMITS.worldBackground),
      portrait: validCharacterPortrait(record.portrait) ? record.portrait : '',
      profile,
      createdAt: typeof record.createdAt === 'number' && Number.isFinite(record.createdAt) ? record.createdAt : Date.now(),
    });
    if (characters.length >= 200) break;
  }
  return characters;
}

export function makeStandaloneCharacter(input: StandaloneCharacterInput, id = crypto.randomUUID()): StandaloneCharacter {
  const name = text(input.name, LIMITS.name) || '未命名角色';
  return {
    id,
    name,
    identity: text(input.identity, LIMITS.identity),
    agentTask: text(input.agentTask, LIMITS.agentTask),
    basicInfo: text(input.basicInfo, LIMITS.basicInfo),
    keyPlotNodes: text(input.keyPlotNodes, LIMITS.keyPlotNodes),
    outputRules: text(input.outputRules, LIMITS.outputRules),
    personality: text(input.personality, LIMITS.personality),
    appearance: text(input.appearance, LIMITS.appearance),
    opening: text(input.opening, LIMITS.opening),
    sceneName: text(input.sceneName, LIMITS.sceneName),
    worldBackground: text(input.worldBackground, LIMITS.worldBackground),
    portrait: validCharacterPortrait(input.portrait) ? input.portrait : '',
    profile: readCharacterProfile(input.profile),
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
export function standalonePortrait(character: Pick<StandaloneCharacter, 'name' | 'portrait'>): string {
  if (character.portrait) return character.portrait;
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
  const worldBackground = character.worldBackground.trim();

  const world: WorldDefinition = {
    id: worldId,
    title: character.name,
    premise: character.identity || opening,
    ...(worldBackground ? { worldBackground } : {}),
    timeSetting: '此刻',
    locations: [{ id: locationId, name: sceneName, description: `${sceneName}，${character.name}在这里。`, connectedLocationIds: [] }],
    characters: [{
      id: roleId,
      name: character.name,
      identity,
      persona: character.personality || '性格会在对话中逐渐显露。',
      ...(character.agentTask ? { agentTask: character.agentTask } : {}),
      ...(character.basicInfo ? { basicInfo: character.basicInfo } : {}),
      ...(character.keyPlotNodes ? { keyPlotNodes: character.keyPlotNodes } : {}),
      ...(character.outputRules ? { outputRules: character.outputRules } : {}),
      ...(characterProfileIsEmpty(character.profile) ? {} : { characterProfile: character.profile }),
      publicBackground: character.identity || '',
      privateKnowledge: [],
      secrets: [],
      goal: '自由交流',
      startLocationId: locationId,
      imagePrompt: character.appearance || '',
      publicIntroduction: character.identity || '',
      cardHook,
      chatOpening: { scene: sceneLine, text: opening },
    }],
    relationships: [],
    rules: [],
    coreEvent: '与角色自由交谈',
    surpriseLevel: 1,
    goals: [{ id: 'free-conversation', title: '自由交流', description: '与角色自在交谈，不要求完成主线。', scope: 'world', requiredTaskIds: [] }],
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
    characterCreatedAt: character.createdAt,
    world,
  };
}
