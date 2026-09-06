'use client';

import type { CreatorChange } from '@/lib/creator-changes';
import { Button } from '@/components/ui/button';

const labels: Record<string, string> = { roles: '角色', tasks: '任务', name: '姓名', identity: '身份', personality: '性格', persona: '性格', relationship: '关系', appearance: '外观', goal: '目标', title: '名称', description: '内容', kind: '类型', assignedRoleIds: '任务归属', prerequisiteTaskIds: '前置任务', successCondition: '完成条件', difficulty: '困难', trigger: '触发条件', effect: '影响' };
function describe(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.map(describe).join('\n\n') : '未设置';
  if (value && typeof value === 'object') return Object.entries(value).filter(([key]) => key !== 'id').map(([key, item]) => `${labels[key] || key}：${describe(item)}`).join('\n');
  return value === 'main' ? '主线' : value === 'side' ? '支线' : typeof value === 'string' ? value || '未设置' : typeof value === 'number' ? String(value) : '未设置';
}
export function CreatorProposalReview({ changes, undo, notice, busy, onApply, onDismiss }: {
  changes: CreatorChange[]; undo: CreatorChange[]; notice: string; busy: boolean;
  onApply: (change: CreatorChange, undo?: boolean) => void; onDismiss: () => void;
}) {
  return <section className="creator-review" aria-label="创作建议审核">
    {notice && <output>{notice}</output>}
    {changes.length > 0 && <><h3>待采纳 · {changes.length} 项建议</h3><p>展开对照，再决定采纳哪一项。角色与关联任务作为一组，避免关系断开。</p>{changes.map((change) => <details key={change.key}><summary>{change.label}</summary><div className="creator-compare"><div><small>原设定</small><p>{describe(change.before)}</p></div><div><small>Agent 建议</small><p>{describe(change.after)}</p></div></div><Button disabled={busy} onClick={() => onApply(change)}>采纳{change.label}</Button></details>)}<Button variant="outline" disabled={busy} onClick={onDismiss}>忽略剩余建议</Button></>}
    {undo.length > 0 && <details><summary>本次编辑的采纳记录 · {undo.length}</summary><p>可撤销最近 12 项；刷新或切换草稿后记录清空。已手改的内容不会被撤销覆盖。</p>{[...undo].reverse().map((change, index) => <div className="creator-undo-row" key={index}><span>{change.label}</span><Button variant="outline" disabled={busy} onClick={() => onApply(change, true)}>撤销</Button></div>)}</details>}
  </section>;
}
