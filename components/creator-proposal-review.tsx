'use client';

import type { CreatorChange } from '@/lib/creator-changes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const labels: Record<string, string> = { roles: '角色', tasks: '任务', name: '姓名', cardHook: '卡片介绍', identity: '身份', personality: '性格', persona: '性格', relationship: '关系', appearance: '外观', goal: '目标', title: '名称', description: '内容', kind: '类型', assignedRoleIds: '任务归属', prerequisiteTaskIds: '前置任务', successCondition: '完成条件', difficulty: '困难', trigger: '触发条件', effect: '影响' };
function describe(value: unknown, references: Record<string, string> = {}, field = ''): string {
  if (Array.isArray(value)) return value.length ? value.map((item) => describe(item, references)).join('、\n') : field === 'assignedRoleIds' ? '所有角色' : field === 'prerequisiteTaskIds' ? '无前置任务' : '未设置';
  if (value && typeof value === 'object') return Object.entries(value).filter(([key]) => key !== 'id' && key !== 'editorId').map(([key, item]) => `${labels[key] || key}：${describe(item, references, key)}`).join('\n');
  return value === 'main' ? '主线' : value === 'side' ? '支线' : typeof value === 'string' ? references[value] || value || '未设置' : typeof value === 'number' ? String(value) : '未设置';
}

function preview(change: CreatorChange, after: boolean) {
  const value = after ? change.after : change.before;
  if (change.key === 'entryPolicy' && value && typeof value === 'object') {
    const policy = value as import('@/lib/player-persona').EntryPolicy;
    return `自带身份：${policy.allowPersona ? '允许作为新人物加入，不替换原角色' : '不允许'}\n探索目标：${policy.visitorGoal || '结识人物，了解事件并选择介入方向'}\n能力：${policy.abilityMode === 'agent-judge' ? '由世界 Agent 根据世界规则判断，无需清单；玩家确认后生效' : policy.abilityMode === 'agent-select' ? `Agent 从清单中挑选：${policy.abilities.filter(Boolean).join('；') || '清单为空，暂不能自带身份入场'}` : policy.abilityMode === 'fixed' ? policy.abilities.filter(Boolean).join('；') || '无额外能力' : '不额外授予超常能力'}`;
  }
  if (value === undefined) return after ? '删除此任务（不会自动删除其他任务）' : '尚未添加';
  if (change.target?.kind === 'task' && change.before && change.after) {
    const before = change.before as Record<string, unknown>; const next = change.after as Record<string, unknown>;
    return describe(Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => JSON.stringify(before[key]) !== JSON.stringify(next[key]))), change.referenceLabels);
  }
  return describe(value, change.referenceLabels);
}

function SuggestionEditor({value, onChange, field = '', references = {}, busy}: {value: unknown; onChange: (value: unknown) => void; field?: string; references?: Record<string,string>; busy: boolean}) {
  if (Array.isArray(value)) return <div className="draft-fields">{value.map((item,index)=><div className="draft-field full-field" key={index}><small>{labels[field] || '条目'} {index+1}</small><SuggestionEditor value={item} field={field} references={references} busy={busy} onChange={next=>onChange(value.map((old,i)=>i===index?next:old))}/></div>)}</div>;
  if (value && typeof value === 'object') return <div className="draft-fields">{Object.entries(value).filter(([key])=>!['id','editorId'].includes(key)).map(([key,item])=><div className="draft-field full-field" key={key}><label>{labels[key] || ({allowPersona:'允许自带身份',allowedRoleIds:'开放角色',abilityMode:'能力模式',abilities:'能力清单'} as Record<string,string>)[key] || key}</label><SuggestionEditor value={item} field={key} references={references} busy={busy} onChange={next=>onChange({...value,[key]:next})}/></div>)}</div>;
  const options = field === 'kind' ? {main:'主线',side:'支线'} : field === 'abilityMode' ? {'role-only':'不额外授予超常能力',fixed:'固定能力','agent-select':'Agent 从清单挑选','agent-judge':'由世界 Agent 判断'} : ['assignedRoleIds','allowedRoleIds','prerequisiteTaskIds'].includes(field) ? Object.fromEntries(Object.entries(references).filter(([id])=>field==='prerequisiteTaskIds'?!id.startsWith('draft-role-'):id.startsWith('draft-role-'))) : null;
  if(options) return <select aria-label={labels[field]||field} disabled={busy} value={String(value)} onChange={e=>onChange(e.target.value)}>{Object.entries(options).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>;
  if(typeof value === 'boolean') return <input type="checkbox" aria-label="允许自带身份" disabled={busy} checked={value} onChange={e=>onChange(e.target.checked)}/>;
  if(typeof value === 'number') return <input type="number" aria-label={field||'程度'} min={1} max={4} disabled={busy} value={value} onChange={e=>onChange(Math.min(4,Math.max(1,Number(e.target.value)||1)))}/>;
  if(typeof value === 'string') return <Textarea aria-label={`编辑${labels[field]||'建议内容'}`} disabled={busy} value={value} rows={3} maxLength={6000} onChange={e=>onChange(e.target.value)}/>;
  return <p>删除建议可选择忽略；已有设定可在“编辑设定”中修改。</p>;
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
    {changes.length > 0 && <><div className="creator-change-actions"><Button disabled={busy} onClick={()=>onApplyAll(changes)}>全部采纳 · {changes.length} 项</Button><Button variant="outline" disabled={busy} onClick={()=>onDismiss()}>暂不采纳</Button></div><p>也可以直接发送“全部采纳”。展开任意建议即可修改，再采纳；整批采纳会一起处理关联任务，不会公开发布。</p>{changes.map((change) => {
      const problem = problemFor(change);
      return <details key={change.key} className="creator-change-card"><summary>{change.label}{problem && <small>待处理</small>}</summary>
        {change.key === 'castAndTasks' && <p>此项涉及角色名单或任务结构，需连同关联任务一起确认。</p>}
        <div className="creator-compare"><div><small>原设定</small><p>{preview(change, false)}</p></div><div><small>Agent 建议</small><p>{preview(change, true)}</p></div></div>
        <details><summary>手动修改这项建议</summary><SuggestionEditor value={change.after} field={change.target?.kind==='role'?change.target.field:change.key} references={change.referenceLabels} busy={busy} onChange={value=>onEdit(change,value)}/><small>修改尚未写入草稿，点“采纳”或发送“全部采纳”后生效。</small></details>
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
