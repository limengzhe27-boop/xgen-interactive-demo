import type { WorldDefinition, WorldTurnRequest } from './ai-contracts';

/**
 * Character chat only needs the current scene and the people in it. Sending the
 * whole creator graph, task tree and every off-screen character makes Grok take
 * tens of seconds just to read the prompt. Keep the world rules/background but
 * trim the runtime input to the conversation that is actually happening.
 */
export function compactCharacterChatInput(input: WorldTurnRequest): WorldTurnRequest {
  const targetId = input.interaction?.targetCharacterId;
  const presentIds = new Set([
    input.selectedRoleId,
    ...(targetId ? [targetId] : []),
    ...input.world.openingScene.presentCharacterIds,
  ]);
  const currentLocation = input.world.locations.find(location =>
    location.id === input.state.location || location.name === input.state.location);
  const characters = input.world.characters
    .filter(character => presentIds.has(character.id))
    .map(character => character.id === targetId ? character : {
      ...character,
      privateKnowledge: [],
      secrets: [],
      characterProfile: undefined,
      agentTask: undefined,
      basicInfo: undefined,
      keyPlotNodes: undefined,
      outputRules: undefined,
    });
  const { storyGraph: _storyGraph, system: _system, entryPolicy: _entryPolicy, entryAdmission: _entryAdmission, ...worldBase } = input.world;
  const world: WorldDefinition = {
    ...worldBase,
    locations: currentLocation ? [currentLocation] : input.world.locations.slice(0, 1),
    characters,
    relationships: input.world.relationships.filter(relationship =>
      presentIds.has(relationship.fromCharacterId) || presentIds.has(relationship.toCharacterId)),
    rules: input.world.rules.slice(0, 8),
    goals: [],
    tasks: [],
    difficultyConstraints: [],
    scheduledEvents: [],
    endingConditions: [],
    openingScene: {
      ...input.world.openingScene,
      presentCharacterIds: [...presentIds],
    },
  };
  return {
    ...input,
    world,
    state: {
      ...input.state,
      rolePerspectives: undefined,
      characterStates: Object.fromEntries(Object.entries(input.state.characterStates)
        .filter(([id]) => presentIds.has(id))),
      eventLedger: input.state.eventLedger.slice(-3),
      committedFacts: input.state.committedFacts?.slice(-8) ?? [],
      clues: input.state.clues.slice(-8),
      knownSecrets: input.state.knownSecrets.slice(-8),
    },
    recentTurns: input.recentTurns.slice(-4),
  };
}
