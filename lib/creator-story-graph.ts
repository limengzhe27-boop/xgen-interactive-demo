/** Authoring data, not a record of events that have happened in a player's save. */
export type CreatorStoryGraph = {
  startNodeId: string;
  nodes: { id: string; title: string; location: string; scene: string; worldFacts: string[]; nextNodeIds: string[] }[];
  entries: { roleId: string; nodeId: string; defaultPath: string[]; knownFacts: string[]; beliefs: string[]; scene: string }[];
};

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 3000): v is string => typeof v === 'string' && v.length <= max;
const id = (v: unknown): v is string => text(v, 100) && /^[a-zA-Z0-9_-]+$/.test(v);
const list = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 24 && v.every(x => text(x, 1500));

export function isCreatorStoryGraph(v: unknown): v is CreatorStoryGraph {
  return record(v) && id(v.startNodeId) && Array.isArray(v.nodes) && v.nodes.length > 0 && v.nodes.length <= 16
    && v.nodes.every(n => record(n) && id(n.id) && text(n.title, 100) && text(n.location, 200) && text(n.scene)
      && list(n.worldFacts) && list(n.nextNodeIds) && n.nextNodeIds.every(id))
    && Array.isArray(v.entries) && v.entries.length <= 20 && v.entries.every(e => record(e) && id(e.roleId) && id(e.nodeId)
      && list(e.defaultPath) && e.defaultPath.every(id) && list(e.knownFacts) && list(e.beliefs) && text(e.scene));
}

/** Iterative/bounded validation happens before rendering, adoption and publication. */
export function creatorStoryIssues(value: unknown, roleIds?: string[]): string[] {
  if (value === undefined) return [];
  if (!isCreatorStoryGraph(value)) return ['画布格式不完整，需包含节点、连线和角色入场信息（最多 16 个节点）。'];
  const graph = value, nodes = new Map(graph.nodes.map(n => [n.id, n]));
  if (nodes.size !== graph.nodes.length) return ['故事节点 ID 重复。'];
  if (!nodes.has(graph.startNodeId)) return ['共同开场节点不存在。'];
  for (const n of graph.nodes) {
    if (!n.title.trim()) return ['请为每个节点填写简短标题。'];
    if (new Set(n.nextNodeIds).size !== n.nextNodeIds.length || n.nextNodeIds.some(next => !nodes.has(next))) return [`「${n.title}」的连线重复或指向不存在的节点。`];
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) return false;
    if (visited.has(nodeId)) return true;
    visiting.add(nodeId);
    if (!nodes.get(nodeId)!.nextNodeIds.every(visit)) return false;
    visiting.delete(nodeId); visited.add(nodeId); return true;
  }
  if (!visit(graph.startNodeId) || [...nodes.keys()].some(key => !visit(key))) return ['故事连线形成循环，请用新的后续节点表达再次发生的事件。'];
  const reachable = new Set([graph.startNodeId]);
  for (let i = 0; i < graph.nodes.length; i++) for (const key of reachable) for (const next of nodes.get(key)!.nextNodeIds) reachable.add(next);
  if (reachable.size !== nodes.size) return ['有节点未连接到共同开场。'];
  const roles = new Set<string>();
  for (const entry of graph.entries) {
    if (roles.has(entry.roleId) || (roleIds && !roleIds.includes(entry.roleId))) return ['入场信息重复或引用了不存在的角色。'];
    roles.add(entry.roleId);
    if (!nodes.has(entry.nodeId)) return ['角色入场节点不存在。'];
    const path = entry.defaultPath;
    if (path[0] !== graph.startNodeId || path.at(-1) !== entry.nodeId || new Set(path).size !== path.length
      || path.some((key, i) => !nodes.has(key) || (i > 0 && !nodes.get(path[i - 1])?.nextNodeIds.includes(key)))) {
      return ['角色默认前史必须沿一条有效路径，从共同开场到入场节点；不能合并互斥分支。'];
    }
  }
  return [];
}

export function remapCreatorStoryRoles(graph: CreatorStoryGraph | undefined, before: { editorId?: string }[], after: { editorId?: string }[]) {
  if (!graph) return undefined;
  return { ...graph, entries: graph.entries.flatMap(entry => {
    const old = before[Number(entry.roleId.replace('draft-role-', ''))];
    const index = after.findIndex(role => old?.editorId && role.editorId === old.editorId);
    return index < 0 ? [] : [{ ...entry, roleId: `draft-role-${index}` }];
  }) };
}

/** One valid path only; the creator may choose a different route explicitly. */
export function creatorEntryPaths(graph: CreatorStoryGraph, target: string): string[][] {
  const result: string[][] = [], queue = [[graph.startNodeId]];
  for (let count = 0; queue.length && count < 512 && result.length < 24; count++) {
    const path = queue.shift()!;
    if (path.at(-1) === target) { result.push(path); continue; }
    for (const next of graph.nodes.find(n => n.id === path.at(-1))?.nextNodeIds ?? []) if (!path.includes(next)) queue.push([...path, next]);
  }
  return result;
}

export const CREATOR_STORY_GRAPH_GUIDANCE = `
创作画布（co-create-world 新增允许字段 proposal.brief.storyGraph）：有了人物和故事雏形，就同时提供可编辑画布；只问候或信息完全不足时可省略。无须用户另填表。沿用 currentDraft.brief.storyGraph 和 pendingSuggestions 中稳定的节点 ID；仅修改用户要求的部分。不要把所有内容都复制成互不相干的角色时间线。首版 3—6 个节点即可，最多16个；可分支、汇合，不可循环。不是固定通关成功/失败路线。
JSON格式：{"startNodeId":"opening","nodes":[{"id":"opening","title":"共同开场","location":"地点","scene":"当前场景与未决动作","worldFacts":["此刻已成立的客观事实"],"nextNodeIds":["later"]},{"id":"later","title":"后续事件","location":"地点","scene":"该事件发生时的场景","worldFacts":["该入口默认前史下成立的事实"],"nextNodeIds":[]}],"entries":[{"roleId":"draft-role-0","nodeId":"opening","defaultPath":["opening"],"knownFacts":["该角色此刻已知的事实"],"beliefs":["尚未证实的怀疑"],"scene":"第一人称可感知的场景、处境与未决问题"},{"roleId":"draft-role-1","nodeId":"later","defaultPath":["opening","later"],"knownFacts":[],"beliefs":[],"scene":"后登场角色看到的当时现场"}]}。
roleId严格对应此次proposal.characters的数组位置draft-role-0起；未返回characters则沿用输入角色ID。每个角色应有一份entries。晚登场者绑定对应事件节点，不强制同时入场。defaultPath是新存档直接选择该角色的默认前史，含起点和入场节点、沿真实连线；互斥分支只选一条，禁止混合。世界事实一份共享；knownFacts只含该角色有理由知道的，beliefs不可当客观事实。未知的他人秘密不能写进入场scene。共同开场之后的nodes只是作者预期可能性，不代表玩家存档已发生。已有存档换角色不使用defaultPath跳时间。尚不能确定的内容留空并在reply简短说明，不假装作者已确认；所有画布都是待采纳建议。人物信息保持原有characters结构，不在画布中复制人物设定。仅生成画布不得触发生图或视频。`;
