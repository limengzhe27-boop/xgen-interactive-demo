import {
  AI_CONTRACT_VERSION,
  type CreatorAgentResponse,
  type PersonalAgentResponse,
  type WorldGenerationResponse,
  type WorldTurnRequest,
  type WorldTurnResponse,
} from './ai-contracts.ts';

import { validEntryPolicy, validPersonaAdmission } from './player-persona.ts';
import { validWorldSystem } from './world-system.ts';

function validOptionalSystem(world: Record<string, unknown>) {
  if (world.system === undefined) return true;
  if (!Array.isArray(world.characters) || !Array.isArray(world.tasks)) return false;
  if (!world.characters.every(r => isRecord(r) && typeof r.id === 'string')
    || !world.tasks.every(t => isRecord(t) && typeof t.id === 'string' && isStringArray(t.assignedRoleIds))) return false;
  return validWorldSystem(world.system, world.characters.map(r => r.id), world.tasks.map(t => t.id));
}

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
    && typeof task.difficulty === 'string'
    && (task.assignedRoleIds === undefined || isStringArray(task.assignedRoleIds)))
    && value.scheduledEvents.every((event) => isRecord(event)
      && typeof event.title === 'string'
      && typeof event.trigger === 'string'
      && typeof event.effect === 'string');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isEndingCondition(value: unknown) {
  return isRecord(value) && typeof value.id === 'string'
    && isStringArray(value.requiredTaskIds) && isStringArray(value.requiredFacts)
    && (value.outcome === undefined || value.outcome === 'success' || value.outcome === 'failure')
    && (value.requiredFailedTaskIds === undefined || isStringArray(value.requiredFailedTaskIds))
    && (value.applicableRoleIds === undefined || (isStringArray(value.applicableRoleIds) && value.applicableRoleIds.length > 0))
    && (value.forbiddenFacts === undefined || isStringArray(value.forbiddenFacts));
}

export function isPersonalAgentResponse(value: unknown): value is PersonalAgentResponse {
  if (!isRecord(value) || typeof value.reply !== 'string' || !value.reply.trim() || !Array.isArray(value.memoryCandidates) || !Array.isArray(value.recommendations)) return false;
  if (value.action !== undefined && (!isRecord(value.action)
    || !(value.action.type === 'none' || value.action.type === 'resume-creation'
      || (value.action.type === 'create-world' && typeof value.action.seed === 'string' && value.action.seed.trim().length > 0 && value.action.seed.length <= 2000)
      || (value.action.type === 'open-world' && typeof value.action.worldId === 'string' && value.action.worldId.length > 0)))) return false;
  return value.memoryCandidates.every((memory) => isRecord(memory)
    && typeof memory.id === 'string'
    && typeof memory.value === 'string'
    && memory.value.trim().length > 0 && memory.value.length <= 300
    && ['genre', 'tone', 'character', 'interaction', 'surprise', 'profile', 'interest', 'goal', 'communication'].includes(String(memory.category))
    && (memory.source === 'explicit' || memory.source === 'behavior')
    && typeof memory.confidence === 'number'
    && memory.confidence >= 0 && memory.confidence <= 1
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
    && (value.proposal.entryPolicy === undefined || validEntryPolicy(value.proposal.entryPolicy))
    && (value.proposal.surpriseLevel === undefined || [1, 2, 3, 4].includes(value.proposal.surpriseLevel as number))
    && typeof value.proposal.title === 'string'
    && typeof value.proposal.premise === 'string'
    && (value.proposal.characters === undefined || (Array.isArray(value.proposal.characters)
      && value.proposal.characters.length <= 5
      && value.proposal.characters.every((role) => isRecord(role) && (role.goal === undefined || typeof role.goal === 'string') && ['name', 'identity', 'persona', 'relationship', 'appearance'].every((key) => typeof role[key] === 'string'))))
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
  return validOptionalSystem(world) && typeof world.id === 'string'
    && typeof world.title === 'string'
    && typeof world.premise === 'string'
    && typeof world.timeSetting === 'string'
    && Array.isArray(world.locations)
    && Array.isArray(world.characters)
    && world.characters.length >= 1
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
    && world.endingConditions.every(isEndingCondition)
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
    && value.dialogue.every((item) => isRecord(item)
      && typeof item.characterId === 'string'
      && typeof item.text === 'string'
      && isStringArray(item.visibleToRoleIds))
    && Array.isArray(value.nextChoices)
    && value.nextChoices.every((choice) => isRecord(choice)
      && typeof choice.id === 'string'
      && typeof choice.label === 'string'
      && typeof choice.intent === 'string')
    && isStringArray(value.statePatch.committedFacts)
    && ['completeTaskIds', 'failTaskIds', 'addClues', 'addKnownSecrets', 'addInventory', 'removeInventory'].every((key) => value.statePatch && isRecord(value.statePatch) && (value.statePatch[key] === undefined || isStringArray(value.statePatch[key])))
    && typeof value.image.required === 'boolean'
    && ['opening', 'location_changed', 'character_changed', 'major_event', 'reuse'].includes(value.image.reason as string)
    && typeof value.image.sceneId === 'string'
    && isRecord(value.goalProgress)
    && isStringArray(value.goalProgress.activeTaskIds)
    && isStringArray(value.goalProgress.completedTaskIds)
    && typeof value.goalProgress.summary === 'string'
    && typeof value.ending.reached === 'boolean'
    && typeof value.ending.canContinue === 'boolean';
}

export function isWorldTurnRequest(value: unknown): value is WorldTurnRequest {
  if (!isRecord(value)
    || value.contractVersion !== AI_CONTRACT_VERSION
    || typeof value.selectedRoleId !== 'string'
    || typeof value.userAction !== 'string'
    || !isRecord(value.world)
    || !Array.isArray(value.world.characters)
    || !Array.isArray(value.world.tasks)
    || !Array.isArray(value.world.endingConditions)
    || !isRecord(value.state)
    || !isStringArray(value.state.completedTaskIds)
    || !isStringArray(value.state.failedTaskIds)
    || !isStringArray(value.state.clues)
    || !isStringArray(value.state.knownSecrets)
    || !Array.isArray(value.state.eventLedger)
    || !isRecord(value.currentScene)
    || !Array.isArray(value.currentScene.choices)) return false;

  if (!value.world.characters.some((character) => isRecord(character) && character.id === value.selectedRoleId)) return false;
  if (value.presentation !== undefined && (!isRecord(value.presentation) || value.presentation.medium !== 'native-video' || (value.presentation.seconds !== 5 && value.presentation.seconds !== 15))) return false;
  if (!validOptionalSystem(value.world)) return false;
  if (!validPersonaAdmission(value.world as WorldTurnRequest['world'], value.selectedRoleId)) return false;
  if (value.interaction !== undefined) {
    if (!isRecord(value.interaction) || value.interaction.mode !== 'character-chat'
      || typeof value.interaction.targetCharacterId !== 'string'
      || value.interaction.targetCharacterId === value.selectedRoleId) return false;
    const targetId = value.interaction.targetCharacterId;
    if (!value.world.characters.some((character) => isRecord(character) && character.id === targetId)) return false;
  }
  return value.world.characters.every((character) => isRecord(character) && typeof character.id === 'string')
    && value.world.tasks.every((task) => isRecord(task)
      && typeof task.id === 'string'
      && (task.kind === 'main' || task.kind === 'side')
      && isStringArray(task.prerequisiteTaskIds))
    && value.world.endingConditions.every(isEndingCondition)
    && (value.state.committedFacts === undefined || isStringArray(value.state.committedFacts))
    && (value.state.reachedEndingIds === undefined || isStringArray(value.state.reachedEndingIds))
    && value.currentScene.choices.every((choice) => isRecord(choice)
      && typeof choice.id === 'string'
      && typeof choice.label === 'string'
      && typeof choice.intent === 'string');
}
