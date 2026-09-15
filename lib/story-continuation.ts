import type { WorldDefinition, WorldGenerationResponse } from './ai-contracts';
import { publicationWorld } from './publication.ts';
import { isCreatorStoryGraph, creatorStoryIssues, type CreatorStoryGraph } from './creator-story-graph.ts';

export type ContinuationDraft = { base: WorldDefinition; proposal?: WorldGenerationResponse; draftFingerprint?: string };

export function ensureStoryGraph(world: WorldDefinition): CreatorStoryGraph {
  if (world.storyGraph && isCreatorStoryGraph(world.storyGraph) && !creatorStoryIssues(world.storyGraph, world.characters.map(c => c.id)).length) {
    return structuredClone(world.storyGraph);
  }
  const startNodeId = 'opening';
  const openingLocation = world.locations.find(l => l.id === world.openingScene?.locationId)?.name || world.locations[0]?.name || '开场地点';
  const openingNarrative = world.openingScene?.narrative || world.premise || '故事开场';
  const baseNode = {
    id: startNodeId,
    title: '共同开场',
    location: openingLocation.slice(0, 200),
    scene: openingNarrative.slice(0, 3000),
    worldFacts: (world.rules || []).slice(0, 5).map(r => r.description.slice(0, 1500)),
    nextNodeIds: [] as string[],
  };
  const entries = world.characters.map((role) => ({
    roleId: role.id,
    nodeId: startNodeId,
    defaultPath: [startNodeId],
    knownFacts: (role.privateKnowledge || []).slice(0, 5).map(k => k.slice(0, 1500)),
    beliefs: [] as string[],
    scene: (role.chatOpening?.scene || role.entry?.scene || role.publicBackground || openingNarrative).slice(0, 3000),
  }));
  return {
    startNodeId,
    nodes: [baseNode],
    entries,
  };
}

function findPath(startId: string, targetId: string, nodes: { id: string; nextNodeIds: string[] }[]): string[] {
  if (startId === targetId) return [startId];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const queue: string[][] = [[startId]];
  const visited = new Set<string>([startId]);
  while (queue.length) {
    const currentPath = queue.shift()!;
    const last = currentPath.at(-1)!;
    if (last === targetId) return currentPath;
    for (const next of nodeMap.get(last)?.nextNodeIds ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...currentPath, next]);
      }
    }
  }
  return [startId];
}

function mergeContinuationStoryGraph(
  base: WorldDefinition,
  proposed: WorldDefinition,
  newTasks: WorldDefinition['tasks'],
  newCharacters: WorldDefinition['characters']
): CreatorStoryGraph {
  const baseGraph = ensureStoryGraph(base);
  const allRoles = [...base.characters, ...newCharacters];
  const allRoleIds = allRoles.map(c => c.id);

  // 1. If proposed has a valid storyGraph that preserves all base nodes
  if (proposed.storyGraph && isCreatorStoryGraph(proposed.storyGraph)) {
    const baseNodeIds = new Set(baseGraph.nodes.map(n => n.id));
    const preservesBaseNodes = baseGraph.nodes.every(bn => proposed.storyGraph!.nodes.some(pn => pn.id === bn.id));
    if (preservesBaseNodes) {
      const candidateNodes = baseGraph.nodes.map(node => {
        const pNode = proposed.storyGraph!.nodes.find(n => n.id === node.id);
        const addedNext = (pNode?.nextNodeIds || []).filter(id => !baseNodeIds.has(id));
        return {
          ...node,
          nextNodeIds: [...new Set([...node.nextNodeIds, ...addedNext])],
        };
      });
      const extraNodes = proposed.storyGraph.nodes.filter(n => !baseNodeIds.has(n.id));
      candidateNodes.push(...extraNodes);

      const candidateEntries = baseGraph.entries.map(e => ({ ...e }));
      for (const char of newCharacters) {
        const pEntry = proposed.storyGraph.entries.find(e => e.roleId === char.id);
        if (pEntry && candidateNodes.some(n => n.id === pEntry.nodeId)) {
          candidateEntries.push({ ...pEntry });
        } else {
          candidateEntries.push({
            roleId: char.id,
            nodeId: baseGraph.startNodeId,
            defaultPath: [baseGraph.startNodeId],
            knownFacts: (char.privateKnowledge || []).slice(0, 5).map(k => k.slice(0, 1500)),
            beliefs: [] as string[],
            scene: (char.publicBackground || '').slice(0, 3000),
          });
        }
      }

      const candidateGraph: CreatorStoryGraph = {
        startNodeId: baseGraph.startNodeId,
        nodes: candidateNodes.slice(0, 16),
        entries: candidateEntries.slice(0, 20),
      };

      if (!creatorStoryIssues(candidateGraph, allRoleIds).length) {
        return candidateGraph;
      }
    }
  }

  // 2. Synthesize sequel node for newly added tasks if capacity allows (< 16 nodes)
  if (newTasks.length > 0 && baseGraph.nodes.length < 16) {
    const leafNodes = baseGraph.nodes.filter(n => n.nextNodeIds.length === 0);
    const primaryLeaf = leafNodes[0] ?? baseGraph.nodes[0];
    const pathToLeaf = findPath(baseGraph.startNodeId, primaryLeaf.id, baseGraph.nodes);
    const safeTaskId = newTasks[0].id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const sequelId = baseGraph.nodes.some(n => n.id === safeTaskId)
      ? `sequel_${safeTaskId}`
      : safeTaskId;

    const sequelLocation = proposed.locations.find(l => !base.locations.some(b => b.id === l.id))?.name || primaryLeaf.location || '后续地点';
    const sequelScene = newTasks.map(t => t.description).filter(Boolean).join('\n').slice(0, 3000) || newTasks[0].title;
    const sequelNode = {
      id: sequelId,
      title: (newTasks[0].title || '后续剧情').slice(0, 100),
      location: sequelLocation.slice(0, 200),
      scene: sequelScene,
      worldFacts: [] as string[],
      nextNodeIds: [] as string[],
    };

    const nextNodes = baseGraph.nodes.map(n => n.id === primaryLeaf.id ? { ...n, nextNodeIds: [...new Set([...n.nextNodeIds, sequelId])] } : { ...n });
    nextNodes.push(sequelNode);

    const nextEntries = baseGraph.entries.map(e => ({ ...e }));
    for (const char of newCharacters) {
      nextEntries.push({
        roleId: char.id,
        nodeId: sequelId,
        defaultPath: [...pathToLeaf, sequelId],
        knownFacts: (char.privateKnowledge || []).slice(0, 5).map(k => k.slice(0, 1500)),
        beliefs: [] as string[],
        scene: (char.chatOpening?.scene || char.entry?.scene || char.publicBackground || sequelScene).slice(0, 3000),
      });
    }

    const synthesizedGraph: CreatorStoryGraph = {
      startNodeId: baseGraph.startNodeId,
      nodes: nextNodes,
      entries: nextEntries,
    };

    if (!creatorStoryIssues(synthesizedGraph, allRoleIds).length) {
      return synthesizedGraph;
    }
  }

  // 3. Fallback: preserve baseGraph and add any new characters to opening
  const fallbackEntries = baseGraph.entries.map(e => ({ ...e }));
  for (const char of newCharacters) {
    if (!fallbackEntries.some(e => e.roleId === char.id)) {
      fallbackEntries.push({
        roleId: char.id,
        nodeId: baseGraph.startNodeId,
        defaultPath: [baseGraph.startNodeId],
        knownFacts: (char.privateKnowledge || []).slice(0, 5).map(k => k.slice(0, 1500)),
        beliefs: [] as string[],
        scene: (char.publicBackground || '').slice(0, 3000),
      });
    }
  }
  return {
    startNodeId: baseGraph.startNodeId,
    nodes: baseGraph.nodes,
    entries: fallbackEntries,
  };
}

// Continuation is append-only. A model response cannot silently rewrite an old
// character, opening, location, or task while claiming to add a sequel.
export function appendStory(baseInput: WorldDefinition, proposedInput: WorldDefinition): WorldDefinition {
  const base = publicationWorld(baseInput), proposed = publicationWorld(proposedInput);
  const additions = <T extends { id: string }>(old: T[], next: T[]) => next.filter(item => !old.some(previous => previous.id === item.id));
  const characters = additions(base.characters, proposed.characters);
  const locations = additions(base.locations, proposed.locations);
  const tasks = additions(base.tasks, proposed.tasks);
  if (!tasks.length&&!characters.length) throw new Error('没有新的剧情或人物，请说明接下来发生什么，或想加入谁；原故事未改动。');
  // New locations must be reachable; only add graph edges, never remove old paths.
  const mergedLocations = base.locations.map(place => ({ ...place, connectedLocationIds: [...new Set([
    ...place.connectedLocationIds,
    ...(proposed.locations.find(item => item.id === place.id)?.connectedLocationIds ?? []).filter(id => locations.some(item => item.id === id)),
  ])] }));
  const relationships = proposed.relationships.filter(relation => !base.relationships.some(old => old.fromCharacterId === relation.fromCharacterId && old.toCharacterId === relation.toCharacterId));
  const storyGraph = mergeContinuationStoryGraph(base, proposed, tasks, characters);
  const next = { ...base,
    characters: [...base.characters, ...characters], locations: [...mergedLocations, ...locations],
    tasks: [...base.tasks, ...tasks], relationships: [...base.relationships, ...relationships],
    goals: [...base.goals, ...additions(base.goals, proposed.goals)],
    rules: [...base.rules, ...additions(base.rules, proposed.rules)],
    scheduledEvents: [...base.scheduledEvents, ...additions(base.scheduledEvents, proposed.scheduledEvents)],
    difficultyConstraints: [...base.difficultyConstraints, ...additions(base.difficultyConstraints, proposed.difficultyConstraints)],
    // Earlier stages remain valid; new chapters do not redefine their prerequisites.
    endingConditions: [...base.endingConditions, ...additions(base.endingConditions, proposed.endingConditions)],
    storyGraph,
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
