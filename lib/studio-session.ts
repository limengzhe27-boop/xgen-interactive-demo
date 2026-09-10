import type { StudioWorld } from './studio-worlds';
import type { WorldState } from './world-state';
import { turnMemoryText } from './world-state.ts';
import type { WorldTurnRequest, WorldTurnResponse } from './ai-contracts';
import type { CharacterGreeting } from './character-greeting';
import { chatHistoryIndices } from './chat-memory.ts';

export function upsertById<T extends { id: string }>(records: T[], next: T): T[] {
  return [next, ...records.filter((record) => record.id !== next.id)];
}

export type ChatSession = {
  id: string;
  entry: StudioWorld;
  playerRoleId: string;
  targetCharacterId: string;
  state: WorldState;
  narrative: string;
  turns: { action: string; response: WorldTurnResponse }[];
  savedAt: number;
  imageCacheKey?: string;
  greeting?: CharacterGreeting;
  draftInput?: string;
};

// A neutral participant is transport state, not an imposed role or an account profile.
export function directConversationEntry(entry: StudioWorld, targetId: string): StudioWorld {
  const target = entry.world.characters.find(role => role.id === targetId);
  if (!target) throw new Error('invalid_conversation_target');
  let id = 'chat-visitor';
  while (entry.world.characters.some(role => role.id === id)) id += '-new';
  const visitor = { ...target, id, name: '你', identity: '自由对话的用户，未设定剧情身份',
    persona: '由用户在交流中自行表达，不预设性格、关系或能力。',
    publicBackground: '首次与对方交谈，不继承任何已有角色的经历。',
    privateKnowledge: [], secrets: [], goal: '自由交流，不要求完成世界主线。', imagePrompt: '' };
  const meeting = conversationEntry({ ...entry, world: { ...entry.world,
    characters: [...entry.world.characters, visitor], entryAdmission: undefined,
  } }, id, targetId);
  return { ...meeting, world: { ...meeting.world,
    openingScene: { ...meeting.world.openingScene,
      narrative: `你打开了与${target.name}的对话。可以直接打个招呼，或聊聊你感兴趣的事情。` },
  } };
}

// A conversation starts a separate encounter; it never moves an existing exploration run.
export function conversationEntry(entry: StudioWorld, playerId: string, targetId: string): StudioWorld {
  const player = entry.world.characters.find((role) => role.id === playerId);
  const target = entry.world.characters.find((role) => role.id === targetId);
  if (!player || !target || playerId === targetId) throw new Error('invalid_conversation_identity');
  const location = entry.world.locations.find((place) => place.id === target.startLocationId);
  if (!location) throw new Error('invalid_conversation_location');
  return { ...entry, world: { ...entry.world,
    characters: entry.world.characters.map((role) => role.id === playerId ? { ...role, startLocationId: location.id } : role),
    openingScene: { locationId: location.id, presentCharacterIds: [playerId, targetId], choices: [],
      narrative: `你是${player.name}，${player.identity}。这是一段独立会面：你与${target.name}在${location.name}开始交谈。${location.description}\n\n${target.publicBackground}\n\n${entry.world.coreEvent}你可以先说一句话，也可以询问对方的打算。` },
  } };
}

export function chatRequest(session: ChatSession, action: string): WorldTurnRequest {
  return { contractVersion: '2026-09-04.v2', world: session.entry.world, selectedRoleId: session.playerRoleId,
    interaction: { mode: 'character-chat', targetCharacterId: session.targetCharacterId },
    conversationMemory: { firstUserMessage: session.turns[0]?.action ?? null,
      greeting: session.greeting?.text ?? null, totalTurns: session.turns.length },
    userAction: action, state: { ...session.state, eventLedger: session.state.eventLedger.slice(-12) },
    recentTurns: chatHistoryIndices(session.turns.map(turn => turn.action), action).map(index => session.turns[index]).map((turn) => ({ action: turn.action, result: turnMemoryText(turn.response, session.entry.world, session.playerRoleId) })),
    currentScene: { id: `chat-${session.state.turn}`, title: session.entry.title, narrative: session.narrative,
      speakerCharacterId: session.targetCharacterId, choices: session.turns.at(-1)?.response.nextChoices ?? [] },
  };
}
