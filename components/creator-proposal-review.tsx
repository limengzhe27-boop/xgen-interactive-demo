'use client';

import type { CreatorChange } from '@/lib/creator-changes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const labels: Record<string, string> = { roles: '角色', tasks: '任务', name: '姓名', cardHook: '卡片介绍', identity: '身份', personality: '性格', persona: '性格', relationship: '关系', appearance: '外观', goal: '目标', title: '名称', description: '内容', kind: '类型', assignedRoleIds: '任务归属', prerequisiteTaskIds: '前置任务', successCondition: '完成条件', difficulty: '困难', trigger: '触发条件', effect: '影响' };
function SuggestionEditor({value, onChange, field = '', references = {}, busy}: {value: unknown; onChange: (value: unknown) => void; field?: string; references?: Record<string,string>; busy: boolean}) {
  if (Array.isArray(value)) return <div className="draft-fields">{value.map((item,index)=><div className="draft-field full-field" key={index}><small>{labels[field] || '条目'} {index+1}</small><SuggestionEditor value={item} field={field} references={references} busy={busy} onChange={next=>onChange(value.map((old,i)=>i===index?next:old))}/></div>)}</div>;
  if (value && typeof value === 'object') return <div className="draft-fields">{Object.entries(value).filter(([key])=>!['id','editorId'].includes(key)).map(([key,item])=><div className="draft-field full-field" key={key}><label>{labels[key] || ({allowPersona:'允许自带身份',allowedRoleIds:'开放角色',abilityMode:'能力模式',abilities:'能力清单'} as Record<string,string>)[key] || key}</label><SuggestionEditor value={item} field={key} references={references} busy={busy} onChange={next=>onChange({...value,[key]:next})}/></div>)}</div>;
  const options = field === 'kind' ? {main:'主线',side:'支线'} : field === 'abilityMode' ? {'role-only':'不额外授予超常能力',fixed:'固定能力','agent-select':'Agent 从清单挑选','agent-judge':'由世界 Agent 判断'} : ['assignedRoleIds','allowedRoleIds','prerequisiteTaskIds'].includes(field) ? Object.fromEntries(Object.entries(references).filter(([id])=>field==='prerequisiteTaskIds'?!id.startsWith('draft-role-'):id.startsWith('draft-role-'))) : null;
  if(options) return <select aria-label={labels[field]||field} disabled={busy} value={String(value)} onChange={e=>onChange(e.target.value)}>{Object.entries(options).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>;
  if(typeof value === 'boolean') return <input type="checkbox" aria-label="允许自带身份" disabled={busy} checked={value} onChange={e=>onChange(e.target.checked)}/>;
  if(typeof value === 'number') return <input type="number" aria-label={field||'程度'} min={1} max={4} disabled={busy} value={value} onChange={e=>onChange(Math.min(4,Math.max(1,Number(e.target.value)||1)))}/>;
  if(typeof value === 'string') return <Textarea aria-label={`编辑${labels[field]||'建议内容'}`} disabled={busy} value={value} className="creator-inline-suggestion" rows={Math.min(10,Math.max(2,Math.ceil(value.length/52)))} maxLength={6000} onChange={e=>onChange(e.target.value)}/>;
  return <p>删除此项</p>;
}

export function CreatorProposalReview({ changes, undo, notice, busy, onApply, onApplyAll, onEdit, onDismiss, problemFor = () => '' }: {
  changes: CreatorChange[]; undo: CreatorChange[]; notice: string; busy: boolean;
  onApply: (change: CreatorChange, undo?: boolean) => void; onDismiss: (change?: CreatorChange) => void;
  onApplyAll: (changes: CreatorChange[]) => string;
  onEdit: (change: CreatorChange, value: unknown) => void;
  problemFor?: (change: CreatorChange, undo?: boolean) => string;
}) {
  return <section className="creator-review" aria-label="创作建议审核">
    {notice && <output>{notice}</output>}
    {changes.length > 0 && <><div className="creator-change-actions"><Button disabled={busy} onClick={()=>onApplyAll(changes)}>全部采纳 · {changes.length} 项</Button><Button variant="outline" disabled={busy} onClick={()=>onDismiss()}>暂不采纳</Button></div>{changes.map((change) => {
      const problem = problemFor(change);
      return <details key={change.key} className="creator-change-card"><summary>{change.label}{problem && <small>待处理</small>}</summary>
        {change.key === 'castAndTasks' && <p>此项涉及角色名单或任务结构，需连同关联任务一起确认。</p>}
        <SuggestionEditor value={change.after} field={change.target?.kind==='role'?change.target.field:change.key} references={change.referenceLabels} busy={busy} onChange={value=>onEdit(change,value)}/>
        {problem && <p className="creator-change-problem">{problem}</p>}
        <div className="creator-change-actions"><Button disabled={busy || !!problem} onClick={() => onApply(change)}>采纳</Button></div>
      </details>;
    })}</>}
    {undo.length > 0 && <details><summary>本次编辑的采纳记录 · {undo.length}</summary><p>可撤销最近 12 项；刷新或切换草稿后记录清空。已手改的内容和新增任务依赖不会被撤销覆盖。</p>{[...undo].reverse().map((change, index) => {
      const problem = problemFor(change, true);
      return <div className="creator-undo-item" key={index}><div className="creator-undo-row"><span>{change.label}</span><Button variant="outline" disabled={busy || !!problem} onClick={() => onApply(change, true)}>撤销</Button></div>{problem && <p className="creator-change-problem">{problem}</p>}</div>;
    })}</details>}
  </section>;
}
