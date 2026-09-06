'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CompanionContext } from '@/lib/companion-context';

export function CompanionHandoff({ seed, conversation, memoryCount, onClose, onConfirm }: {
  seed: string; conversation: CompanionContext['conversation']; memoryCount: number;
  onClose: () => void; onConfirm: (seed: string, context: CompanionContext) => void;
}) {
  const [idea, setIdea] = useState(seed.slice(0, 2000));
  const [useMemories, setUseMemories] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const turns = conversation.slice(-8);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="companion-handoff">
    <DialogTitle>还是我，陪你把想法做成世界</DialogTitle>
    <DialogDescription>原来的聊天会保留。确认后调用 DeepSeek 开始创作讨论，使用下方方向与勾选的上下文；不会直接填入世界设定。</DialogDescription>
    <label htmlFor="companion-idea">这次想创作什么？</label>
    <textarea id="companion-idea" value={idea} onChange={event => setIdea(event.target.value)} maxLength={2000} placeholder="一句话也可以，进入后我们接着讨论。" />
    <label className="companion-check"><input type="checkbox" checked={useMemories} onChange={event => setUseMemories(event.target.checked)} /><span>让创作中的我参考你的已确认记忆（{memoryCount} 条）<small>用于理解你与沟通方式；不是把个人资料变成角色。以后新增或删除的已确认记忆也会同步生效，可随时关闭。</small></span></label>
    {turns.length > 0 && <details><summary>选择要接着讨论的消息（已选 {selected.length} 条）</summary><div className="companion-selection">{turns.map((turn, index) => <label className="companion-check" key={index}><input type="checkbox" checked={selected.includes(index)} onChange={event => setSelected(current => event.target.checked ? [...current, index] : current.filter(i => i !== index))} /><span><small>{turn.role === 'user' ? '你' : '你的 Agent'}</small>{turn.content}</span></label>)}</div></details>}
    <p className="personal-memory-note">只选择这次创作需要的内容。模型建议仍需你审阅、采纳；发布前也请检查是否包含真实个人信息。</p>
    <Button className="studio-button studio-solid" onClick={() => onConfirm(idea.trim(), { useConfirmedMemories: useMemories, conversation: turns.filter((_, index) => selected.includes(index)) })}>确认，接着创作</Button>
  </DialogContent></Dialog>;
}

export function CompanionContextPanel({ context, memoryCount, busy, onChange, onPersonal }: {
  context: CompanionContext; memoryCount: number; busy: boolean; onChange: (context: CompanionContext) => void; onPersonal: () => void;
}) {
  return <details className="companion-context"><summary>同一个 Agent · {context.useConfirmedMemories ? `${memoryCount} 条已确认记忆` : '本次仅参考创作讨论'} · {context.conversation.length} 条带入消息</summary>
    <label className="companion-check"><input type="checkbox" checked={context.useConfirmedMemories} disabled={busy} onChange={event => onChange({ ...context, useConfirmedMemories: event.target.checked })} /><span>创作时也参考我的已确认记忆<small>开启后，下次讨论会将这些记忆发给 DeepSeek；不自动写进剧本。关闭不撤回已经发送的请求。</small></span></label>
    {context.conversation.length > 0 && <><div className="companion-selection">{context.conversation.map((turn, index) => <p key={index}><small>{turn.role === 'user' ? '你' : '你的 Agent'}</small>{turn.content}</p>)}</div><button className="studio-text-button" type="button" disabled={busy} onClick={() => onChange({ ...context, conversation: [] })}>移除带入的聊天上下文</button></>}
    <button type="button" className="studio-text-button" disabled={busy} onClick={onPersonal}>回到日常聊天，保留当前创作</button>
  </details>;
}
