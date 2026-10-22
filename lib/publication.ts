import type { WorldDefinition } from './ai-contracts';
import { validEntryPolicy } from './player-persona.ts';
import { validWorldSystem } from './world-system.ts';
import { validDiscoveryGenre } from './discovery-category.ts';
import { validCardHook } from './character-card.ts';
import { validCharacterEntries } from './character-entry.ts';
import { creatorStoryIssues } from './creator-story-graph.ts';
import { validCharacterPresentation } from './character-presentation.ts';

type Shape = 'string' | 'nullable-string' | 'number' | 'boolean' | { [key: string]: Shape } | [Shape];
const texts: Shape = ['string'];
const schema: Shape = {
  'storyGraph?': { startNodeId: 'string', nodes: [{ id: 'string', title: 'string', location: 'string', scene: 'string', worldFacts: texts, nextNodeIds: texts, 'eventIntent?': 'string', 'trigger?': 'string', 'closingCondition?': 'string', 'possibilities?': [{ actor: 'string', 'roleId?': 'nullable-string', action: 'string', consequence: 'string', 'condition?': 'string' }] }], entries: [{ roleId: 'string', nodeId: 'string', defaultPath: texts, knownFacts: texts, beliefs: texts, scene: 'string' }] },
  'storyHook?': 'string',
  'publicSynopsis?': 'string',
  'discoveryGenre?': 'string',
  id: 'string', title: 'string', premise: 'string', 'worldBackground?': 'string', timeSetting: 'string', coreEvent: 'string', surpriseLevel: 'number',
  'system?': { name: 'string', premise: 'string', entries: [{ id: 'string', title: 'string', description: 'string', roleIds: texts, requiredTaskIds: texts, action: 'string' }] },
  'entryPolicy?': { allowPersona: 'boolean', allowedRoleIds: texts, abilityMode: 'string', abilities: texts, 'visitorGoal?': 'string' },
  locations: [{ id: 'string', name: 'string', description: 'string', connectedLocationIds: texts }],
  characters: [{ 'publicIntroduction?': 'string', 'characterProfile?': { lifeContext: 'string', traits: 'string', drives: 'string', behavior: 'string', relationships: 'string' }, 'chatOpening?': { scene: 'string', text: 'string', 'suggestions?': texts }, 'playable?': 'boolean', 'isDefault?': 'boolean', 'entry?': { storyAnchor: 'string', completedTaskIds: texts, worldFacts: texts, knownFacts: texts, scene: 'string' }, id: 'string', name: 'string', identity: 'string', persona: 'string', 'cardHook?': 'string', publicBackground: 'string', privateKnowledge: texts, secrets: texts, goal: 'string', startLocationId: 'string', imagePrompt: 'string' }],
  relationships: [{ fromCharacterId: 'string', toCharacterId: 'string', publicLabel: 'string', 'privateContext?': 'string', initialTrust: 'number' }],
  rules: [{ id: 'string', description: 'string', kind: 'string', immutable: 'boolean' }],
  goals: [{ id: 'string', title: 'string', description: 'string', scope: 'string', 'roleId?': 'string', requiredTaskIds: texts }],
  tasks: [{ id: 'string', title: 'string', description: 'string', kind: 'string', assignedRoleIds: texts, prerequisiteTaskIds: texts, successCondition: 'string', difficulty: 'string' }],
  difficultyConstraints: [{ id: 'string', description: 'string', 'blocksTaskId?': 'string', bypassCondition: 'string', consequence: 'string' }],
  scheduledEvents: [{ id: 'string', title: 'string', trigger: 'string', earliestTurn: 'number', effect: 'string' }],
  endingConditions: [{ id: 'string', 'applicableRoleIds?': texts, 'outcome?': 'string', 'requiredFailedTaskIds?': texts, description: 'string', requiredTaskIds: texts, requiredFacts: texts, 'forbiddenFacts?': texts }],
  openingScene: { locationId: 'string', narrative: 'string', presentCharacterIds: texts, choices: [{ id: 'string', label: 'string', intent: 'string' }] },
};

function select(value: unknown, shape: Shape): unknown {
  if (shape === 'nullable-string') return value === null ? null : select(value, 'string');
  if (typeof shape === 'string') {
    if (typeof value !== shape || (typeof value === 'string' && value.length > 10000) || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('invalid_world');
    return value;
  }
  if (Array.isArray(shape)) {
    if (!Array.isArray(value) || value.length > 60) throw new Error('invalid_world');
    return value.map(item => select(item, shape[0]));
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_world');
  return Object.fromEntries(Object.entries(shape).flatMap(([rawKey, field]) => {
    const key = rawKey.replace(/\?$/, '');
    const item = (value as Record<string, unknown>)[key];
    return rawKey.endsWith('?') && item === undefined ? [] : [[key, select(item, field)]];
  }));
}

export function publicationWorld(value: unknown): WorldDefinition {
  if (value && typeof value === 'object' && 'entryAdmission' in value) throw new Error('private_session_cannot_be_published');
  // Whitelist every nested field: saved chats, Agent memory and unknown metadata cannot hitchhike.
  const world = select(value, schema) as WorldDefinition;
  if (!validCharacterEntries(world)) throw new Error('invalid_character_entry');
  if (world.characters.some(role => !validCharacterPresentation(role))) throw new Error('invalid_character_presentation');
  if (world.characters.some(role => !validCardHook(role.cardHook))) throw new Error('invalid_card_hook');
  if (world.discoveryGenre !== undefined && !validDiscoveryGenre(world.discoveryGenre)) throw new Error('invalid_discovery_genre');
  const ids = (items: { id: string }[]) => {
    const result = new Set(items.map(item => item.id));
    if (result.size !== items.length || [...result].some(id => !id.trim() || id.length > 120)) throw new Error('invalid_ids');
    return result;
  };
  const roles = ids(world.characters), places = ids(world.locations), tasks = ids(world.tasks);
  if (creatorStoryIssues(world.storyGraph, [...roles]).length) throw new Error('invalid_creator_story_graph');
  if (world.system && !validWorldSystem(world.system, [...roles], [...tasks])) throw new Error('invalid_world_system');
  if (world.entryPolicy && (!validEntryPolicy(world.entryPolicy) || world.entryPolicy.allowedRoleIds.some(id => !roles.has(id)))) throw new Error('invalid_entry_policy');
  ids(world.goals); ids(world.rules); ids(world.scheduledEvents); ids(world.endingConditions);
  const all = (values: string[], set: Set<string>) => values.every(id => set.has(id));
  if (!world.title.trim() || world.title.length > 120 || !world.premise.trim() || world.characters.length < 1 || world.characters.length > 8
    || !world.goals.length || ![1, 2, 3, 4].includes(world.surpriseLevel)
    || !places.has(world.openingScene.locationId) || !all(world.openingScene.presentCharacterIds, roles)
    || world.characters.some(role => !places.has(role.startLocationId) || !role.name.trim())
    || world.locations.some(place => !all(place.connectedLocationIds, places))
    || world.relationships.some(r => !roles.has(r.fromCharacterId) || !roles.has(r.toCharacterId))
    || world.rules.some(r => !['physical', 'social', 'knowledge', 'story'].includes(r.kind))
    || world.tasks.some(t => !['main', 'side'].includes(t.kind) || !all(t.assignedRoleIds, roles) || !all(t.prerequisiteTaskIds, tasks))
    || world.goals.some(g => !['world', 'role'].includes(g.scope) || (g.scope === 'role' && !roles.has(g.roleId ?? '')) || !all(g.requiredTaskIds, tasks))
    || world.endingConditions.some(e => (e.outcome && !['success', 'failure'].includes(e.outcome)) || !all(e.requiredTaskIds, tasks) || !all(e.requiredFailedTaskIds ?? [], tasks) || !all(e.applicableRoleIds ?? [], roles))
    || world.difficultyConstraints.some(d => d.blocksTaskId && !tasks.has(d.blocksTaskId))
    || world.scheduledEvents.some(e => !Number.isSafeInteger(e.earliestTurn) || e.earliestTurn < 0)) throw new Error('invalid_world_references');
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error('cyclic_tasks');
    if (visited.has(id)) return;
    visiting.add(id); world.tasks.find(t => t.id === id)!.prerequisiteTaskIds.forEach(visit); visiting.delete(id); visited.add(id);
  };
  tasks.forEach(visit);
  if (JSON.stringify(world).length > 120000) throw new Error('world_too_large');
  return world;
}
