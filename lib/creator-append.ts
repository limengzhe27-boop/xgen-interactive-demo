import { creatorStoryIssues, isCreatorStoryGraph, type CreatorStoryGraph } from './creator-story-graph.ts';

/** Deliberately narrow: discussion, negation and entry edits never authorize an append. */
export function creatorAppendRequested(message = '') {
  if (/(?:不要|不用|先不|暂不).{0,6}(?:添加|新增|追加|接上|续写)|讨论|能否|是否|吗|[？?]|如何|怎么添加|怎样添加/.test(message)) return false;
  return /(?:添加|新增|追加|接上|续写|接着写)/.test(message)
    && /节点|事件|画布|后续|下一场|下一个|分支/.test(message);
}

/** Append is not a world rewrite. Preserve hand edits, edges and first-entry knowledge. */
export function appendCreatorGraph(base: CreatorStoryGraph, proposed: unknown, message = '') {
  if (!isCreatorStoryGraph(proposed)) return { issue: '没有收到完整的新事件节点，画布未改动。' };
  const oldIds = new Set(base.nodes.map(n => n.id));
  const added = proposed.nodes.filter(n => !oldIds.has(n.id));
  if (!added.length) return { issue: '本轮没有新增事件节点，画布未改动；不会把已有节点重复计作新增。' };
  if (added.some(n => !n.scene.trim() || base.nodes.some(old => old.title.trim() === n.title.trim()))) {
    return { issue: '新节点缺少场景或与已有节点同名，尚未写入，请补全或明确区分事件。' };
  }
  const addedIds = new Set(added.map(n => n.id));
  const parentId = message.match(/节点ID[：:]\s*([a-zA-Z0-9_-]+)/)?.[1];
  if (parentId && (!oldIds.has(parentId) || !proposed.nodes.find(n => n.id === parentId)?.nextNodeIds.some(id => addedIds.has(id)))) {
    return { issue: '新节点没有接在指定位置，画布未改动。请重新追加。' };
  }
  const graph: CreatorStoryGraph = {
    startNodeId: base.startNodeId,
    nodes: [...base.nodes.map(n => ({ ...n, nextNodeIds: [...new Set([...n.nextNodeIds,
      ...(proposed.nodes.find(p => p.id === n.id)?.nextNodeIds ?? []).filter(id => addedIds.has(id))])] })), ...added],
    entries: base.entries,
  };
  const issue = creatorStoryIssues(graph)[0];
  return issue ? { issue: `新节点尚未写入：${issue}` } : { graph, added };
}
