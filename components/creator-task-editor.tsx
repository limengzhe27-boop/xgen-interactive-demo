'use client';

import type { CreatorTaskDraft } from '@/lib/ai-contracts';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function CreatorTaskEditor({ tasks, roles, onUpdate, onRemove }: {
  tasks: CreatorTaskDraft[]; roles: { name: string }[];
  onUpdate: (index: number, key: keyof CreatorTaskDraft, value: string | string[]) => void;
  onRemove: (index: number) => void;
}) {
  return <div className="creator-task-cards">{tasks.map((task, index) => {
    const owners = task.assignedRoleIds ?? [];
    const label = owners.length ? owners.map((id) => roles[Number(id.replace('draft-role-', ''))]?.name || '待确认角色').join('、') : '所有角色';
    return <details key={task.id} className="creator-task-card">
      <summary><span>{task.kind === 'main' ? '主线' : '支线'}</span><strong>{task.title || '未命名任务'}</strong><small>{label}</small></summary>
      <div className="creator-task-fields">
        <label htmlFor={`task-title-${index}`}>任务名称<Input id={`task-title-${index}`} aria-label={`任务 ${index + 1} 名称`} value={task.title} onChange={(event) => onUpdate(index, 'title', event.target.value)} /></label>
        <label>主线或支线<select aria-label={`任务 ${index + 1} 类型`} value={task.kind} onChange={(event) => onUpdate(index, 'kind', event.target.value)}><option value="main">主线 · 影响目标达成</option><option value="side">支线 · 可选探索</option></select></label>
        <fieldset><legend>谁可以体验这个任务？</legend><small>不勾选表示所有角色；勾选后只有所选角色可见。</small>{roles.map((role, roleIndex) => {
          const id = `draft-role-${roleIndex}`;
          return <label className="creator-check" key={id}><input type="checkbox" checked={owners.includes(id)} onChange={(event) => onUpdate(index, 'assignedRoleIds', event.target.checked ? [...owners, id] : owners.filter((owner) => owner !== id))} />{role.name || `角色 ${roleIndex + 1}`}</label>;
        })}</fieldset>
        <label htmlFor={`task-content-${index}`}>要做的事<Textarea id={`task-content-${index}`} aria-label={`任务 ${index + 1} 内容`} value={task.description} onChange={(event) => onUpdate(index, 'description', event.target.value)} /></label>
        <label htmlFor={`task-condition-${index}`}>怎样才算完成<Input id={`task-condition-${index}`} aria-label={`任务 ${index + 1} 完成条件`} value={task.successCondition} onChange={(event) => onUpdate(index, 'successCondition', event.target.value)} /></label>
        <label htmlFor={`task-difficulty-${index}`}>困难或代价<Textarea id={`task-difficulty-${index}`} aria-label={`任务 ${index + 1} 困难`} value={task.difficulty} onChange={(event) => onUpdate(index, 'difficulty', event.target.value)} /></label>
        <fieldset><legend>需要先完成的任务</legend><small>只允许选择排在前面的任务，避免循环依赖。</small>{tasks.slice(0, index).map((other) => <label className="creator-check" key={other.id}><input type="checkbox" checked={task.prerequisiteTaskIds.includes(other.id)} onChange={(event) => onUpdate(index, 'prerequisiteTaskIds', event.target.checked ? [...task.prerequisiteTaskIds, other.id] : task.prerequisiteTaskIds.filter((id) => id !== other.id))} />{other.title}</label>)}{task.prerequisiteTaskIds.filter((id) => !tasks.slice(0, index).some((other) => other.id === id)).map((id) => <label className="creator-check" key={id}><input type="checkbox" checked onChange={() => onUpdate(index, 'prerequisiteTaskIds', task.prerequisiteTaskIds.filter((item) => item !== id))} />{tasks.find((other) => other.id === id)?.title || '失效引用'}（已有前置，可取消）</label>)}</fieldset>
        <Button variant="outline" onClick={() => onRemove(index)} aria-label={`删除任务 ${index + 1}`}>删除任务</Button>
      </div>
    </details>;
  })}</div>;
}
