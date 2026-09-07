import type { WorldDefinition } from './ai-contracts';

export type WorldSystem = {
  name: string;
  premise: string;
  entries: { id: string; title: string; description: string; roleIds: string[]; requiredTaskIds: string[]; action: string }[];
};

export function visibleSystem(world: WorldDefinition, roleId: string, completed: string[]) {
  if (!world.system || !world.characters.some(r => r.id === roleId)) return null;
  const entries = world.system.entries.filter(e => e.roleIds.includes(roleId));
  if (!entries.length) return null;
  const ownedTasks = new Set(world.tasks.filter(t => t.assignedRoleIds.includes(roleId) || !t.assignedRoleIds.length).map(t => t.id));
  return { name: world.system.name, premise: world.system.premise, entries: entries.map(e => {
    const unlocked = e.requiredTaskIds.every(id => ownedTasks.has(id) && completed.includes(id));
    return { id: e.id, title: e.title, unlocked,
      description: unlocked ? e.description : '完成关联任务后显示系统内容。',
      action: unlocked ? e.action : '',
      requirements: e.requiredTaskIds.map(id => world.tasks.find(t => t.id === id)?.title ?? '未知任务'),
    };
  }) };
}

export function validWorldSystem(value: unknown, roles: string[], tasks: string[]): value is WorldSystem {
  if (!value || typeof value !== 'object') return false;
  const s = value as WorldSystem;
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
  return text(s.name, 120) && text(s.premise, 2000) && Array.isArray(s.entries) && s.entries.length <= 40
    && new Set(s.entries.map(e => e?.id)).size === s.entries.length
    && s.entries.every(e => e && text(e.id, 120) && text(e.title, 200) && text(e.description, 3000)
      && typeof e.action === 'string' && e.action.length <= 1000
      && Array.isArray(e.roleIds) && e.roleIds.length > 0 && e.roleIds.every(id => roles.includes(id))
      && Array.isArray(e.requiredTaskIds) && e.requiredTaskIds.every(id => tasks.includes(id)));
}
