import type { StudioWorld } from './studio-worlds';
import type { WorldState } from './world-state';
import type { WorldTurnRequest, WorldTurnResponse } from './ai-contracts';

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
};

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
    userAction: action, state: session.state,
    recentTurns: session.turns.slice(-4).map((turn) => ({ action: turn.action, result: turn.response.narrative })),
    currentScene: { id: `chat-${session.state.turn}`, title: session.entry.title, narrative: session.narrative,
      speakerCharacterId: session.targetCharacterId, choices: session.turns.at(-1)?.response.nextChoices ?? [] },
  };
}
