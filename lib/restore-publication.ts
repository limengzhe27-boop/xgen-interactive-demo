import type { CreatorBrief, CreatorChatMessage, StoryOutlineBeat } from './ai-contracts';
import type { StudioWorld } from './studio-worlds';

// Restore only the published fiction, never invent the author's original discussion.
export function publicationDraft(entry: StudioWorld & { sourceId?: string }) {
  const world = structuredClone(entry.world);
  const roles = world.characters.map(role => ({ editorId: role.id, name: role.name, identity: role.identity,
    personality: role.persona, appearance: role.imagePrompt, relationship: role.publicBackground, goal: role.goal, cardHook: role.cardHook }));
  const outline: StoryOutlineBeat[] = Array.from({ length: Math.max(3, Math.min(world.locations.length, 6)) }, (_, index) => {
    const location = world.locations[index] ?? world.locations.find(place => place.id === world.openingScene.locationId) ?? world.locations[0];
    return { id: `restored-outline-${index}`, title: location.name, location: location.name,
      objective: index === 0 ? world.openingScene.narrative : location.description, turningPoint: '' };
  });
  const brief: CreatorBrief = {
    discoveryGenre: world.discoveryGenre,
    coreGoal: (world.goals.find(goal => goal.scope === 'world') ?? world.goals[0])?.title ?? world.coreEvent,
    successCondition: world.endingConditions.find(ending => (ending.outcome ?? 'success') === 'success')?.description ?? '',
    failureCondition: world.endingConditions.find(ending => ending.outcome === 'failure')?.description ?? '',
    complexityLevel: 2,
    tasks: world.tasks.map(task => ({ ...task })),
    difficulties: world.difficultyConstraints.map(item => item.description),
    scheduledEvents: world.scheduledEvents.map(item => ({ title: item.title, trigger: item.trigger, effect: item.effect })),
  };
  return { id: entry.sourceId || entry.id, savedAt: Date.now(), data: {
    worldTitle: world.title, worldSeed: world.premise, surprise: world.surpriseLevel,
    generated: true, publishedWorld: true, generatedWorld: world, draftRoles: roles,
    generatedStoryOutline: outline, creatorDetailBaseline: { roles, outline }, creatorBrief: brief,
    creatorMessages: [{ role: 'agent', content: '已从公开版本恢复角色、规则与任务。原来的私人创作讨论不在公开版本里，未恢复；这里的修改不会自动更新线上作品。' }] as CreatorChatMessage[],
    entryPolicy: world.entryPolicy, creatorAssets: { cover: entry.cover, portraits: { ...entry.portraits } },
  } };
}
