import type {
  PersonalAgentResponse,
  WorldGenerationResponse,
  WorldTurnResponse,
} from '@/lib/ai-contracts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isPersonalAgentResponse(value: unknown): value is PersonalAgentResponse {
  if (!isRecord(value) || typeof value.reply !== 'string' || !Array.isArray(value.memoryCandidates) || !Array.isArray(value.recommendations)) return false;
  return value.memoryCandidates.every((memory) => isRecord(memory)
    && typeof memory.id === 'string'
    && typeof memory.value === 'string'
    && typeof memory.confidence === 'number'
    && typeof memory.requiresConfirmation === 'boolean')
    && value.recommendations.every((recommendation) => isRecord(recommendation)
      && typeof recommendation.worldId === 'string'
      && typeof recommendation.reason === 'string'
      && isStringArray(recommendation.matchedMemoryIds));
}

export function isWorldGenerationResponse(value: unknown): value is WorldGenerationResponse {
  if (!isRecord(value)
    || !isRecord(value.world)
    || !Array.isArray(value.storyOutline)
    || value.storyOutline.length < 3
    || !isStringArray(value.generationNotes)
    || !isStringArray(value.unresolvedQuestions)) return false;
  const world = value.world;
  return typeof world.id === 'string'
    && typeof world.title === 'string'
    && typeof world.premise === 'string'
    && typeof world.timeSetting === 'string'
    && Array.isArray(world.locations)
    && Array.isArray(world.characters)
    && world.characters.length >= 2
    && Array.isArray(world.relationships)
    && Array.isArray(world.rules)
    && typeof world.coreEvent === 'string'
    && [1, 2, 3, 4].includes(world.surpriseLevel as number)
    && Array.isArray(world.endingConditions)
    && isRecord(world.openingScene)
    && Array.isArray(world.openingScene.choices)
    && world.openingScene.choices.length >= 2
    && value.storyOutline.every((beat) => isRecord(beat)
      && typeof beat.id === 'string'
      && typeof beat.title === 'string'
      && typeof beat.location === 'string'
      && typeof beat.objective === 'string'
      && typeof beat.turningPoint === 'string');
}

export function isWorldTurnResponse(value: unknown): value is WorldTurnResponse {
  if (!isRecord(value) || !isRecord(value.actionDecision) || !isRecord(value.statePatch) || !isRecord(value.image) || !isRecord(value.ending)) return false;
  return typeof value.actionDecision.allowed === 'boolean'
    && typeof value.narrative === 'string'
    && Array.isArray(value.dialogue)
    && Array.isArray(value.nextChoices)
    && isStringArray(value.statePatch.committedFacts)
    && typeof value.image.required === 'boolean'
    && typeof value.image.reason === 'string'
    && typeof value.image.sceneId === 'string'
    && typeof value.ending.reached === 'boolean'
    && typeof value.ending.canContinue === 'boolean';
}
