import type {
  CreatorAgentResponse,
  PersonalAgentResponse,
  WorldGenerationResponse,
  WorldTurnResponse,
} from '@/lib/ai-contracts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isCreatorBrief(value: unknown) {
  if (!isRecord(value)
    || typeof value.coreGoal !== 'string'
    || typeof value.successCondition !== 'string'
    || typeof value.failureCondition !== 'string'
    || ![1, 2, 3, 4].includes(value.complexityLevel as number)
    || !Array.isArray(value.tasks)
    || !isStringArray(value.difficulties)
    || !Array.isArray(value.scheduledEvents)) return false;
  return value.tasks.every((task) => isRecord(task)
    && typeof task.id === 'string'
    && typeof task.title === 'string'
    && typeof task.description === 'string'
    && (task.kind === 'main' || task.kind === 'side')
    && isStringArray(task.prerequisiteTaskIds)
    && typeof task.successCondition === 'string'
    && typeof task.difficulty === 'string')
    && value.scheduledEvents.every((event) => isRecord(event)
      && typeof event.title === 'string'
      && typeof event.trigger === 'string'
      && typeof event.effect === 'string');
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

export function isCreatorAgentResponse(value: unknown): value is CreatorAgentResponse {
  return isRecord(value)
    && typeof value.reply === 'string'
    && isRecord(value.proposal)
    && typeof value.proposal.title === 'string'
    && typeof value.proposal.premise === 'string'
    && isCreatorBrief(value.proposal.brief)
    && isStringArray(value.nextQuestions)
    && (value.readiness === 'needs_detail' || value.readiness === 'ready');
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
    && Array.isArray(world.goals)
    && world.goals.length >= 1
    && world.goals.every((goal) => isRecord(goal)
      && typeof goal.id === 'string'
      && typeof goal.title === 'string'
      && typeof goal.description === 'string'
      && (goal.scope === 'world' || goal.scope === 'role')
      && isStringArray(goal.requiredTaskIds))
    && Array.isArray(world.tasks)
    && world.tasks.length >= 1
    && world.tasks.every((task) => isRecord(task)
      && typeof task.id === 'string'
      && typeof task.title === 'string'
      && typeof task.description === 'string'
      && (task.kind === 'main' || task.kind === 'side')
      && isStringArray(task.assignedRoleIds)
      && isStringArray(task.prerequisiteTaskIds)
      && typeof task.successCondition === 'string'
      && typeof task.difficulty === 'string')
    && Array.isArray(world.difficultyConstraints)
    && world.difficultyConstraints.every((constraint) => isRecord(constraint)
      && typeof constraint.id === 'string'
      && typeof constraint.description === 'string'
      && typeof constraint.bypassCondition === 'string'
      && typeof constraint.consequence === 'string')
    && Array.isArray(world.scheduledEvents)
    && world.scheduledEvents.every((event) => isRecord(event)
      && typeof event.id === 'string'
      && typeof event.title === 'string'
      && typeof event.trigger === 'string'
      && typeof event.earliestTurn === 'number'
      && typeof event.effect === 'string')
    && Array.isArray(world.endingConditions)
    && world.endingConditions.length >= 1
    && world.endingConditions.every((condition) => isRecord(condition)
      && typeof condition.id === 'string'
      && typeof condition.description === 'string'
      && isStringArray(condition.requiredTaskIds)
      && isStringArray(condition.requiredFacts))
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
    && isRecord(value.goalProgress)
    && isStringArray(value.goalProgress.activeTaskIds)
    && isStringArray(value.goalProgress.completedTaskIds)
    && typeof value.goalProgress.summary === 'string'
    && typeof value.ending.reached === 'boolean'
    && typeof value.ending.canContinue === 'boolean';
}
