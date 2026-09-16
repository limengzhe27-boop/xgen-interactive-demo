import { storyDirections } from './story-directions.ts';
import type { CreatorBrief, CreatorChatMessage, StoryOutlineBeat } from './ai-contracts';
import type { StudioWorld } from './studio-worlds';
import { publicationWorld } from './publication.ts';
import { mapCreatorStoryRoleIds, bindCreatorActors } from './creator-story-graph.ts';

// A historical revision becomes an independent draft, never an implicit rollback
// or a replacement for the author's current work. Do not retain sourceId.
export function historicalPublicationDraft(entry: StudioWorld, edition: number, id = crypto.randomUUID()) {
  const copy = structuredClone(entry);
  const draft = publicationDraft({ ...copy, sourceId: undefined, id, edition: undefined, world: { ...copy.world, id } });
  return { ...draft, data: { ...draft.data, publishedWorld: false, releasedEntry: undefined, releaseHistory: [],
    creatorMessages: [{ role: 'agent', content: `已将发布版 ${edition} 恢复为新草稿。可以继续修改或追加剧情；原草稿、公开版本和玩家存档都没有改变。` }] as CreatorChatMessage[] } };
}

// Restore only the published fiction, never invent the author's original discussion.
export function publicationDraft(entry: StudioWorld & { sourceId?: string }) {
  const world = publicationWorld(structuredClone(entry.world));
  const releasedEntry = structuredClone(Object.fromEntries([
    'id', 'title', 'originalTitle', 'genre', 'premise', 'cover', 'artNote', 'featured',
    'fixedRoleId', 'openingImage', 'portraits', 'portraitCacheKeys', 'roleOpenings',
    'roleEntryScenes', 'roleChoices', 'edition',
  ].filter(key => Object.hasOwn(entry, key)).map(key => [key, entry[key as keyof StudioWorld]]))) as StudioWorld;
  releasedEntry.world = structuredClone(world);
  const roles = world.characters.map(role => ({ editorId: role.id, name: role.name, identity: role.identity,
    personality: role.persona, appearance: role.imagePrompt, relationship: role.publicBackground, goal: role.goal, cardHook: role.cardHook }));
  const outline: StoryOutlineBeat[] = Array.from({ length: Math.max(3, Math.min(world.locations.length, 6)) }, (_, index) => {
    const location = world.locations[index] ?? world.locations.find(place => place.id === world.openingScene.locationId) ?? world.locations[0];
    return { id: `restored-outline-${index}`, title: location.name, location: location.name,
      objective: index === 0 ? world.openingScene.narrative : location.description, turningPoint: '' };
  });
  const brief: CreatorBrief = {
    ...(world.storyGraph ? { storyGraph: mapCreatorStoryRoleIds(bindCreatorActors(world.storyGraph, world.characters), id => { const i = world.characters.findIndex(role => role.id === id); return i >= 0 ? `draft-role-${i}` : undefined; }) } : {}),
    discoveryGenre: world.discoveryGenre,
    coreGoal: (world.goals.find(goal => goal.scope === 'world') ?? world.goals[0])?.title ?? world.coreEvent,
    successCondition: storyDirections(world.endingConditions).primary?.description ?? '',
    failureCondition: storyDirections(world.endingConditions).alternative?.description ?? '',
    complexityLevel: 2,
    tasks: world.tasks.map(task => ({ ...task, assignedRoleIds: task.assignedRoleIds.map(id => `draft-role-${world.characters.findIndex(role => role.id === id)}`) })),
    difficulties: world.difficultyConstraints.map(item => item.description),
    scheduledEvents: world.scheduledEvents.map(item => ({ title: item.title, trigger: item.trigger, effect: item.effect })),
  };
  return { id: entry.sourceId || entry.id, savedAt: Date.now(), data: {
    worldTitle: world.title, worldSeed: world.premise, surprise: world.surpriseLevel,
    generated: true, publishedWorld: true, releasedEntry, generatedWorld: world, draftRoles: roles,
    generatedStoryOutline: outline, creatorDetailBaseline: { roles, outline }, creatorBrief: brief,
    creatorMessages: [{ role: 'agent', content: '已从公开版本恢复角色、规则与任务。原来的私人创作讨论不在公开版本里，未恢复；这里的修改不会自动更新线上作品。' }] as CreatorChatMessage[],
    entryPolicy: world.entryPolicy, creatorAssets: { cover: entry.cover, portraits: { ...entry.portraits } },
  } };
}
