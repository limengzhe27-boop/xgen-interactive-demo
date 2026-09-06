// Compare-and-swap applies and undoes only the chosen section. A later manual
// edit wins over an old model response or an old undo record.
import type { CreatorTaskDraft } from '@/lib/ai-contracts';

export type CreatorRoleDraft = { editorId?: string; name: string; identity: string; personality: string; relationship: string; appearance: string; goal?: string };
export type CreatorCast = { roles: CreatorRoleDraft[]; tasks: CreatorTaskDraft[] };
export type CreatorChange = {
  key: string; label: string; before: unknown; after: unknown;
  target?: { kind: 'role'; id: string; field: keyof CreatorRoleDraft } | { kind: 'task'; id: string; beforeIndex: number; afterIndex: number };
  roleOrder?: string[];
  referenceLabels?: Record<string, string>;
};

// Private editor identity is not a world role ID, and is never sent to models.
// Keep it when renaming; old saves get an identity when opened, not every render.
export function ensureCreatorRoleIds(roles: CreatorRoleDraft[]): CreatorRoleDraft[] {
  const used = new Set<string>();
  return roles.map((role) => {
    const editorId = role.editorId && !used.has(role.editorId) ? role.editorId : crypto.randomUUID();
    used.add(editorId); return { ...role, editorId };
  });
}

export function identifyProposedRoles(before: CreatorRoleDraft[], proposed: CreatorRoleDraft[]): CreatorRoleDraft[] {
  const used = new Set<string>();
  return ensureCreatorRoleIds(proposed.map((role, index) => {
    const sameName = role.name.trim() ? before.find((old) => old.name === role.name && old.editorId && !used.has(old.editorId)) : undefined;
    const positional = before[index];
    const renamed = positional?.editorId && !used.has(positional.editorId)
      && !proposed.some((other, otherIndex) => otherIndex !== index && other.name && other.name === positional.name) ? positional : undefined;
    const editorId = (sameName ?? renamed)?.editorId;
    if (editorId) used.add(editorId);
    return { ...role, editorId };
  }));
}

const roleFields = { name: '姓名', identity: '身份', personality: '性格', relationship: '关系', appearance: '外观', goal: '目标' } as const;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const castFrom = (value: unknown) => value as CreatorCast | undefined;

export function creatorChanges(before: Record<string, unknown>, after: Record<string, unknown>, labels: Record<string, string>): CreatorChange[] {
  const changes: CreatorChange[] = Object.entries(after).filter(([key, value]) => key !== 'castAndTasks' && key in labels && !equal(before[key], value))
    .map(([key, value]) => ({ key, label: labels[key], before: before[key], after: value }));
  const oldCast = castFrom(before.castAndTasks); const nextCast = castFrom(after.castAndTasks);
  if (!oldCast || !nextCast || equal(oldCast, nextCast)) return changes;
  const roleOrder = oldCast.roles.map((role) => role.editorId || '');
  const referenceLabels = Object.fromEntries([
    ...nextCast.roles.map((role, index) => [`draft-role-${index}`, role.name || `角色 ${index + 1}`]),
    ...oldCast.tasks.map((task) => [task.id, task.title]), ...nextCast.tasks.map((task) => [task.id, task.title]),
  ]);
  if (roleOrder.some((id) => !id) || !equal(roleOrder, nextCast.roles.map((role) => role.editorId))
    || new Set(nextCast.tasks.map((task) => task.id)).size !== nextCast.tasks.length) {
    return [...changes, { key: 'castAndTasks', label: '角色名单与关联任务调整', before: oldCast, after: nextCast, referenceLabels }];
  }
  nextCast.roles.forEach((role, index) => {
    const old = oldCast.roles[index];
    for (const field of Object.keys(roleFields) as (keyof typeof roleFields)[]) {
      if (equal(old[field] || '', role[field] || '')) continue;
      changes.push({ key: `role:${role.editorId}:${field}`, label: `${old.name || role.name || `角色 ${index + 1}`} · ${roleFields[field]}`,
        before: old[field] || '', after: role[field] || '', target: { kind: 'role', id: role.editorId!, field } });
    }
  });
  // Preserve IDs rather than matching titles: a renamed task is still the same task.
  const ids = [...new Set([...nextCast.tasks.map((task) => task.id), ...oldCast.tasks.map((task) => task.id)])];
  for (const id of ids) {
    const old = oldCast.tasks.find((task) => task.id === id); const next = nextCast.tasks.find((task) => task.id === id);
    if (equal(old, next)) continue;
    changes.push({ key: `task:${id}`, label: `${!old ? '新增任务' : !next ? '删除任务' : '任务'} · ${(next ?? old)!.title}`,
      before: old, after: next, target: { kind: 'task', id, beforeIndex: oldCast.tasks.findIndex((task) => task.id === id), afterIndex: nextCast.tasks.findIndex((task) => task.id === id) }, roleOrder, referenceLabels });
  }
  return changes;
}
export function applyCreatorChange(current: Record<string, unknown>, change: CreatorChange, undo = false): Record<string, unknown> | null {
  const expected = undo ? change.after : change.before;
  const replacement = undo ? change.before : change.after;
  if (change.target) {
    const cast = castFrom(current.castAndTasks);
    if (!cast) return null;
    if (change.target.kind === 'role') {
      const target = change.target;
      const index = cast.roles.findIndex((role) => role.editorId === target.id);
      if (index < 0 || !equal(cast.roles[index][target.field] || '', expected)) return null;
      return { ...current, castAndTasks: { ...cast, roles: cast.roles.map((role, i) => i === index ? { ...role, [target.field]: replacement } : role) } };
    }
    if (!equal(change.roleOrder, cast.roles.map((role) => role.editorId))) return null;
    const index = cast.tasks.findIndex((task) => task.id === change.target!.id);
    if (!equal(cast.tasks[index], expected)) return null;
    const tasks = [...cast.tasks];
    if (replacement === undefined) tasks.splice(index, 1);
    else if (index < 0) tasks.splice(Math.max(0, undo ? change.target.beforeIndex : change.target.afterIndex), 0, replacement as CreatorTaskDraft);
    else tasks[index] = replacement as CreatorTaskDraft;
    return { ...current, castAndTasks: { ...cast, tasks } };
  }
  if (!equal(current[change.key], expected)) return null;
  return { ...current, [change.key]: replacement };
}
