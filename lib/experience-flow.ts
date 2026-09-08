import type { WorldTask } from './ai-contracts';

// Display only; never changes task completion, ownership or the world's rules.
export function taskDisplayStatus(task: WorldTask, completed: string[], failed: string[]) {
  if (failed.includes(task.id)) return '未达成';
  if (completed.includes(task.id)) return '已完成';
  if (task.prerequisiteTaskIds.some(id => failed.includes(id))) return '前置未达成';
  return task.prerequisiteTaskIds.every(id => completed.includes(id)) ? '可推进' : '待前置完成';
}

export function currentPlayableTask(tasks: WorldTask[], completed: string[], failed: string[]) {
  const available = tasks.filter(task => taskDisplayStatus(task, completed, failed) === '可推进');
  return available.find(task => task.kind === 'main') ?? available[0];
}
