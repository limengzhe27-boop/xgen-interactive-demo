import type { CreatorTaskDraft } from '@/lib/ai-contracts';

export function creatorTaskIssues(tasks: CreatorTaskDraft[], roleCount: number): string[] {
  const ids = new Set(tasks.map((task) => task.id));
  const roles = Array.from({ length: roleCount }, (_, index) => `draft-role-${index}`);
  const errors: string[] = [];
  const owners = (task: CreatorTaskDraft) => task.assignedRoleIds?.length ? task.assignedRoleIds : roles;
  if (ids.size !== tasks.length || tasks.some((task) => !task.id)) errors.push('任务编号重复或为空，请重新整理任务。');
  for (const task of tasks) {
    if (owners(task).some((id) => !roles.includes(id))) errors.push(`「${task.title}」引用了不存在的角色。`);
    for (const id of task.prerequisiteTaskIds) {
      const parent = tasks.find((item) => item.id === id);
      if (!parent || id === task.id) errors.push(`「${task.title}」的前置任务无效。`);
      // Prerequisites are world-level completed events, not ownership grants.
      // An NPC can complete its own task and unlock another character's task.
      // Keep both owners and dependency intact; never assign the NPC's job to the player.
    }
  }
  const visiting = new Set<string>(); const visited = new Set<string>();
  const cyclic = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const cycle = tasks.find((task) => task.id === id)?.prerequisiteTaskIds.some(cyclic) ?? false;
    visiting.delete(id); visited.add(id); return cycle;
  };
  if (tasks.some((task) => cyclic(task.id))) errors.push('任务之间存在循环前置，需取消其中一条依赖。');
  return [...new Set(errors)];
}
