'use client';

import type { CreatorChange } from '@/lib/creator-changes';
import { Button } from '@/components/ui/button';

const labels: Record<string, string> = { roles: '角色', tasks: '任务', name: '姓名', identity: '身份', personality: '性格', persona: '性格', relationship: '关系', appearance: '外观', goal: '目标', title: '名称', description: '内容', kind: '类型', assignedRoleIds: '任务归属', prerequisiteTaskIds: '前置任务', successCondition: '完成条件', difficulty: '困难', trigger: '触发条件', effect: '影响' };
function describe(value: unknown, references: Record<string, string> = {}, field = ''): string {
  if (Array.isArray(value)) return value.length ? value.map((item) => describe(item, references)).join('、\n') : field === 'assignedRoleIds' ? '所有角色' : field === 'prerequisiteTaskIds' ? '无前置任务' : '未设置';
  if (value && typeof value === 'object') return Object.entries(value).filter(([key]) => key !== 'id' && key !== 'editorId').map(([key, item]) => `${labels[key] || key}：${describe(item, references, key)}`).join('\n');
  return value === 'main' ? '主线' : value === 'side' ? '支线' : typeof value === 'string' ? references[value] || value || '未设置' : typeof value === 'number' ? String(value) : '未设置';
}

function preview(change: CreatorChange, after: boolean) {
  const value = after ? change.after : change.before;
  if (change.key === 'entryPolicy' && value && typeof value === 'object') {
    const policy = value as import('@/lib/player-persona').EntryPolicy;
    return `自带身份：${policy.allowPersona ? '允许' : '不允许'}\n开放角色：${policy.allowedRoleIds.map(id => change.referenceLabels?.[id] || '未知角色').join('、') || '未开放'}\n能力：${policy.abilityMode === 'agent-select' ? `Agent 从清单中挑选：${policy.abilities.filter(Boolean).join('；') || '清单为空，暂不能自带身份入场'}` : policy.abilityMode === 'fixed' ? policy.abilities.filter(Boolean).join('；') || '无额外能力' : '仅剧情身份原有能力'}`;
  }
  if (value === undefined) return after ? '删除此任务（不会自动删除其他任务）' : '尚未添加';
  if (change.target?.kind === 'task' && change.before && change.after) {
    const before = change.before as Record<string, unknown>; const next = change.after as Record<string, unknown>;
    return describe(Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => JSON.stringify(before[key]) !== JSON.stringify(next[key]))), change.referenceLabels);
  }
  return describe(value, change.referenceLabels);
}

export function CreatorProposalReview({ changes, undo, notice, busy, onApply, onDismiss, problemFor = () => '' }: {
  changes: CreatorChange[]; undo: CreatorChange[]; notice: string; busy: boolean;
  onApply: (change: CreatorChange, undo?: boolean) => void; onDismiss: (change?: CreatorChange) => void;
  problemFor?: (change: CreatorChange, undo?: boolean) => string;
}) {
  return <section className="creator-review" aria-label="创作建议审核">
    {notice && <output>{notice}</output>}
    {changes.length > 0 && <><h3>待采纳 · {changes.length} 项建议</h3><p>只采纳你想要的修改。角色字段、单项任务可以分别决定；任务依赖需要按顺序处理。</p>{changes.map((change) => {
      const problem = problemFor(change);
      return <details key={change.key} className="creator-change-card"><summary>{change.label}{problem && <small>待处理</small>}</summary>
        {change.key === 'castAndTasks' && <p>此项涉及角色名单或任务结构，需连同关联任务一起确认。</p>}
        <div className="creator-compare"><div><small>原设定</small><p>{preview(change, false)}</p></div><div><small>Agent 建议</small><p>{preview(change, true)}</p></div></div>
        {problem && <p className="creator-change-problem">{problem}</p>}
        <div className="creator-change-actions"><Button disabled={busy || !!problem} onClick={() => onApply(change)}>采纳{change.label}</Button><Button variant="outline" disabled={busy} onClick={() => onDismiss(change)}>忽略此项</Button></div>
      </details>;
    })}<Button variant="outline" disabled={busy} onClick={() => onDismiss()}>忽略剩余建议</Button></>}
    {undo.length > 0 && <details><summary>本次编辑的采纳记录 · {undo.length}</summary><p>可撤销最近 12 项；刷新或切换草稿后记录清空。已手改的内容和新增任务依赖不会被撤销覆盖。</p>{[...undo].reverse().map((change, index) => {
      const problem = problemFor(change, true);
      return <div className="creator-undo-item" key={index}><div className="creator-undo-row"><span>{change.label}</span><Button variant="outline" disabled={busy || !!problem} onClick={() => onApply(change, true)}>撤销</Button></div>{problem && <p className="creator-change-problem">{problem}</p>}</div>;
    })}</details>}
  </section>;
}
