/** Authoring data, not a record of events that have happened in a player's save. */
export type CreatorStoryGraph = {
  startNodeId: string;
  nodes: { id: string; title: string; location: string; scene: string; worldFacts: string[]; nextNodeIds: string[]; eventIntent?: 'possible' | 'key_event'; trigger?: string; possibilities?: { actor: string; roleId?: string | null; action: string; consequence: string; condition?: string }[] }[];
  entries: { roleId: string; nodeId: string; defaultPath: string[]; knownFacts: string[]; beliefs: string[]; scene: string }[];
};

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 3000): v is string => typeof v === 'string' && v.length <= max;
const id = (v: unknown): v is string => text(v, 100) && /^[a-zA-Z0-9_-]+$/.test(v);
const list = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 24 && v.every(x => text(x, 1500));

export function isCreatorStoryGraph(v: unknown): v is CreatorStoryGraph {
  return record(v) && id(v.startNodeId) && Array.isArray(v.nodes) && v.nodes.length > 0 && v.nodes.length <= 16
    && v.nodes.every(n => record(n) && id(n.id) && text(n.title, 100) && text(n.location, 200) && text(n.scene)
      && list(n.worldFacts) && list(n.nextNodeIds) && n.nextNodeIds.every(id)
      && (n.trigger === undefined || text(n.trigger))
      && (n.eventIntent === undefined || n.eventIntent === 'possible' || n.eventIntent === 'key_event')
      && (n.possibilities === undefined || (Array.isArray(n.possibilities) && n.possibilities.length <= 6
        && n.possibilities.every(p => record(p) && text(p.actor) && (p.roleId === undefined || p.roleId === null || id(p.roleId)) && text(p.action) && text(p.consequence) && (p.condition === undefined || text(p.condition))))))
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
    if (roleIds && n.possibilities?.some(p => p.roleId && !roleIds.includes(p.roleId))) return ['可能行动引用了不存在的角色。'];
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

/** Undefined = legacy descriptive actor; null = explicitly unbound. Never substring-match. */
export function possibilityRoleId(p: NonNullable<CreatorStoryGraph['nodes'][number]['possibilities']>[number], roles: { id: string; name: string }[]) {
  if (p.roleId !== undefined) return roles.some(r => r.id === p.roleId) ? p.roleId : null;
  const matches = roles.filter(r => r.name.trim() && r.name.trim() === p.actor.trim());
  return matches.length === 1 ? matches[0].id : null;
}

export function bindCreatorActors(graph: CreatorStoryGraph, roles: { id: string; name: string }[]): CreatorStoryGraph {
  return { ...graph, nodes: graph.nodes.map(n => n.possibilities ? { ...n, possibilities: n.possibilities.map(p => p.roleId !== undefined ? p : { ...p, roleId: possibilityRoleId(p, roles) }) } : n) };
}

/** Shared by publication, restoration and cast reorder; IDs must travel together. */
export function mapCreatorStoryRoleIds(graph: CreatorStoryGraph, map: (id: string) => string | undefined): CreatorStoryGraph {
  return { ...graph, entries: graph.entries.flatMap(e => { const roleId = map(e.roleId); return roleId ? [{ ...e, roleId }] : []; }),
    nodes: graph.nodes.map(n => n.possibilities ? { ...n, possibilities: n.possibilities.map(p => p.roleId ? { ...p, roleId: map(p.roleId) ?? null } : p) } : n) };
}

export function remapCreatorStoryRoles(graph: CreatorStoryGraph | undefined, before: { editorId?: string; name?: string }[], after: { editorId?: string; name?: string }[]) {
  if (!graph) return undefined;
  const bound = bindCreatorActors(graph, before.map((r, i) => ({ id: `draft-role-${i}`, name: r.name ?? '' })));
  return mapCreatorStoryRoleIds(bound, roleId => {
    const old = before[Number(roleId.replace('draft-role-', ''))];
    const index = after.findIndex(role => old?.editorId && role.editorId === old.editorId);
    return index < 0 ? undefined : `draft-role-${index}`;
  });
}

/** Exact DAG reachability, not a bounded list of sampled paths and not runtime state. */
export function creatorEntryContext(graph: CreatorStoryGraph, roleId: string, nodeId: string): string {
  const entry = graph.entries.find(e => e.roleId === roleId);
  if (!entry) return '尚未指定首次入场位置；不能据此判断此事件中的参与或知情。';
  const title = graph.nodes.find(n => n.id === entry.nodeId)?.title ?? '入场点';
  const reaches = (start: string, target: string, blocked?: string): boolean => {
    const queue = [start], seen = new Set<string>();
    while (queue.length) {
      const current = queue.pop()!;
      if (current === blocked || seen.has(current)) continue;
      if (current === target) return true;
      seen.add(current);
      queue.push(...(graph.nodes.find(n => n.id === current)?.nextNodeIds ?? []));
    }
    return false;
  };
  if (entry.nodeId === nodeId) return `首次体验从「${title}」开始。`;
  if (reaches(entry.nodeId, nodeId)) return reaches(graph.startNodeId, nodeId, entry.nodeId)
    ? `部分设计路径经过「${title}」，另一些不经过。汇合不合并各路经历；实际是否已登场须看体验记录，当前在场与知情仍未确定。`
    : `设计路径上「${title}」在此事件之前；更早入场不等于此刻在场、参与或知情，需由具体设定和体验记录判断。`;
  return `首次体验从「${title}」开始；当前查看的是其他节点，不会迁移入场或授予该角色这里的信息。`;
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

export const OPEN_STORY_DIRECTIONS = `
多个后续节点和possibilities是开放参考，不是必须随机挑选一个的封闭答案库。先根据玩家实际行动、角色动机与存档事实判断条件；可能暂时都不发生，也可产生符合世界边界的新走向。连线只表示可能衔接，不表示自动触发；互斥走向不能同时提交为事实，非互斥事件可以先后发生。只有一个走向也不等于必然发生。
事件eventIntent缺省为possible；key_event表示作者明确指定希望最终发生的关键事件，不是当前已发生事实，也不是强迫玩家执行某个动作。时机、方式、知情者和后果保持开放；不得绕过世界硬规则或伪造玩家决定来达成关键事件，条件不足先保持未发生。创作Agent不能自行把可能事件升级为key_event，需要作者在画布的事件性质中明确选择。
构思关键局面时优先提供2～3个有实质差异的可能方向，不为每个小动作硬凑分支，不一次写完整故事。局面不同用后续节点表达；同一局面的应对方式用possibilities表达，每项可用condition说明何时适用，保留actor/action/consequence。讨论未决可能性，不把这些可能行为和后果写成已发生的worldFacts。`;

/** Only the author's editor selection can promote an event to a key event. */
export function preserveEventIntent(graph: CreatorStoryGraph, base?: CreatorStoryGraph): CreatorStoryGraph {
  return { ...graph, nodes: graph.nodes.map(({ eventIntent: _modelIntent, ...node }) => {
    const intent = base?.nodes.find(old => old.id === node.id)?.eventIntent;
    return intent ? { ...node, eventIntent: intent } : node;
  }) };
}

export const CREATOR_STORY_GRAPH_GUIDANCE = OPEN_STORY_DIRECTIONS + `
可能行动可用roleId绑定其行动者，使用同一份角色名单的draft-role-N；actor保留可读描述。被提及、受影响或被攻击的人不是行动者。多人、路人或归属不明时roleId=null，不能凭名字子串认领。沿用已有绑定，角色改名不改变身份；返回人物名单时须同步所有角色引用。新增事件不代表所有早入场角色都在场或知情，汇合也不合并互斥前史。
每个事件节点可选提供 trigger（什么条件下可能发生）和 possibilities（最多6项，每项含 actor 人物称呼、action 可能行动、consequence 可能收益/代价/他人反应，均为字符串）。这些是作者的可能性设计，不是已发生事实、不要求作者填完，也不代表玩家只能选这些行动。actor只是描述，不是角色ID或入场绑定。获得授权构思时主动补充有意义的局面变化，不反复要求用户编写完整剧本；不要把可能后果写入worldFacts。未聊到的部分省略即可。
创作画布（co-create-world 新增允许字段 proposal.brief.storyGraph）：有了人物和具体场景，就同时提供可编辑画布；只有抽象想法时先共同构思，不强迫补全。无须用户另填表。沿用 currentDraft.brief.storyGraph 和 pendingSuggestions 中稳定的节点 ID；仅修改用户要求的部分。不要把所有内容都复制成互不相干的角色时间线。开始可以只有1个开场节点，随讨论扩展，最多16个；可分支、汇合，不可循环。支持多分支树状与网状走向：同一个节点可包含多个 nextNodeIds（如 nextNodeIds: ["branch_a", "branch_b"] 分叉为多条互斥或并行走向），不同分支亦可汇合至同一节点（汇合不可成环）。不是固定通关成功/失败路线。
JSON格式：{"startNodeId":"opening","nodes":[{"id":"opening","title":"共同开场","location":"地点","scene":"当前场景与未决动作","worldFacts":["此刻已成立的客观事实"],"nextNodeIds":["branch_a","branch_b"]},{"id":"branch_a","title":"分支A：正面突破","location":"地点","scene":"采取正面行动的场景","worldFacts":["分支A成立的事实"],"nextNodeIds":[]},{"id":"branch_b","title":"分支B：暗中潜伏","location":"地点","scene":"采取潜伏行动的场景","worldFacts":["分支B成立的事实"],"nextNodeIds":[]}],"entries":[{"roleId":"draft-role-0","nodeId":"opening","defaultPath":["opening"],"knownFacts":["该角色此刻已知的事实"],"beliefs":["尚未证实的怀疑"],"scene":"第一人称可感知的场景、处境与未决问题"},{"roleId":"draft-role-1","nodeId":"branch_a","defaultPath":["opening","branch_a"],"knownFacts":[],"beliefs":[],"scene":"后登场角色看到的当时现场"}]}。
roleId严格对应此次proposal.characters的数组位置draft-role-0起；未返回characters则沿用输入角色ID。每个角色应有一份entries。晚登场者绑定对应事件节点，不强制同时入场。defaultPath是新存档直接选择该角色的默认前史，含起点和入场节点、沿真实连线；互斥分支只选一条，禁止混合。世界事实一份共享；knownFacts只含该角色有理由知道的，beliefs不可当客观事实。未知的他人秘密不能写进入场scene。共同开场之后的nodes只是作者预期可能性，不代表玩家存档已发生。已有存档换角色不使用defaultPath跳时间。尚不能确定的内容留空并在reply简短说明，不假装作者已确认；所有画布都是待采纳建议。人物信息保持原有characters结构，不在画布中复制人物设定。仅生成画布不得触发生图或视频。`;
