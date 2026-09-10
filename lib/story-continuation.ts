import type { WorldDefinition, WorldGenerationResponse } from './ai-contracts';
import { publicationWorld } from './publication.ts';

export type ContinuationDraft = { base: WorldDefinition; proposal?: WorldGenerationResponse; draftFingerprint?: string };

// Continuation is append-only. A model response cannot silently rewrite an old
// character, opening, location, or task while claiming to add a sequel.
export function appendStory(baseInput: WorldDefinition, proposedInput: WorldDefinition): WorldDefinition {
  const base = publicationWorld(baseInput), proposed = publicationWorld(proposedInput);
  const additions = <T extends { id: string }>(old: T[], next: T[]) => next.filter(item => !old.some(previous => previous.id === item.id));
  const characters = additions(base.characters, proposed.characters);
  const locations = additions(base.locations, proposed.locations);
  const tasks = additions(base.tasks, proposed.tasks);
  if (!tasks.length) throw new Error('没有新的剧情任务，请说明接下来发生什么；原故事未改动。');
  const newMain = tasks.filter(task => task.kind === 'main').map(task => task.id);
  // New locations must be reachable; only add graph edges, never remove old paths.
  const mergedLocations = base.locations.map(place => ({ ...place, connectedLocationIds: [...new Set([
    ...place.connectedLocationIds,
    ...(proposed.locations.find(item => item.id === place.id)?.connectedLocationIds ?? []).filter(id => locations.some(item => item.id === id)),
  ])] }));
  const relationships = proposed.relationships.filter(relation => !base.relationships.some(old => old.fromCharacterId === relation.fromCharacterId && old.toCharacterId === relation.toCharacterId));
  const next = { ...base,
    characters: [...base.characters, ...characters], locations: [...mergedLocations, ...locations],
    tasks: [...base.tasks, ...tasks], relationships: [...base.relationships, ...relationships],
    goals: [...base.goals, ...additions(base.goals, proposed.goals)],
    rules: [...base.rules, ...additions(base.rules, proposed.rules)],
    scheduledEvents: [...base.scheduledEvents, ...additions(base.scheduledEvents, proposed.scheduledEvents)],
    difficultyConstraints: [...base.difficultyConstraints, ...additions(base.difficultyConstraints, proposed.difficultyConstraints)],
    // Existing success is not allowed to stop a newly extended story too early.
    // Failure paths remain intact. Old runs still hold their own world snapshot.
    endingConditions: [...base.endingConditions.map(ending => (ending.outcome ?? 'success') === 'success'
      ? { ...ending, requiredTaskIds: [...new Set([...ending.requiredTaskIds, ...newMain])] } : ending),
      ...additions(base.endingConditions, proposed.endingConditions)],
  };
  return publicationWorld(next);
}

export function continuationSummary(base: WorldDefinition, next: WorldDefinition): string[] {
  const fresh = <T extends { id: string }>(old: T[], items: T[]) => items.filter(item => !old.some(previous => previous.id === item.id));
  return [
    ...fresh(base.tasks, next.tasks).map(task => `剧情：${task.title}`),
    ...fresh(base.characters, next.characters).map(role => `人物：${role.name}`),
    ...fresh(base.locations, next.locations).map(place => `地点：${place.name}`),
  ];
}

export const CONTINUATION_GUIDANCE = `
【持续创作】input.continuation 存在时，本次不是重写世界，而是按 storySeed 追加后续。
continuation.base 是原作品，continuation.previousProposal 是作者仍在讨论、尚未采纳的完整提案（如有）。根据本次意见修改该提案，不把待采纳内容当作已发生事实。
返回原 generate-world JSON 契约，world 含原内容与新增内容。原人物、任务、地点和规则保持 ID、顺序与设定不变；原开场不重写。新增内容用新 ID，新增任务通过 prerequisiteTaskIds 接到原主线后，人物关系和场景必须引用实际存在的 ID。不要擅自为故事生成用户没有要求的远期续集。
新增地点给出可达连接；新增角色有自己的知识、目标和位置，不共享所有秘密。generationNotes 用简短自然语言说明新增内容。没有明确后续时用 unresolvedQuestions 提问，不凭空宣称已经完成或发布。`;
