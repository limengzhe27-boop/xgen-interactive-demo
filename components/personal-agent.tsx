'use client';
/* oxlint-disable next/no-img-element -- local catalogue artwork */
import type { ReactNode, SyntheticEvent } from 'react';
import { useEffect, useRef } from 'react';
import { ArrowRight, Check, ListTodo, LoaderCircle, MessageCircleMore, MoreHorizontal, PenLine, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageTextarea } from '@/components/message-textarea';
import type { WorldCard } from '@/components/studio-home';
import type { PersonalAgentResponse, PersonalAgentRequest } from '@/lib/ai-contracts';

export function PersonalAgent({ identityPanel, message, conversation, busy, error, recommendations, worlds, memories, pending = [], onMessage, onSubmit, onRemoveMemory, onConfirmMemory, onDismissMemory, onOpenWorld, onCreate, creationSuggestion, onDismissCreation, activeCreation, onResumeCreation }: {
  creationSuggestion?: string | null; onDismissCreation: () => void; activeCreation?: string; onResumeCreation: () => void;
  identityPanel?: ReactNode;
  message: string; conversation: NonNullable<PersonalAgentRequest['conversation']>; busy: boolean; error: string;
  recommendations: PersonalAgentResponse['recommendations']; worlds: WorldCard[]; memories: string[]; pending?: string[];
  onMessage: (value: string) => void; onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onRemoveMemory: (memory: string) => void; onOpenWorld: (id: string) => void; onCreate: (seed?: string) => void;
  onConfirmMemory?: (memory: string) => void; onDismissMemory?: (memory: string) => void;
}) {
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [conversation.length, busy]);
  return <div className="personal-workspace">
    <header className="personal-heading"><Sparkles /><div><span className="studio-wordmark">个人 AGENT · 你的 AI 伙伴</span><h1>今天，想聊点什么？</h1></div></header>
    <div className="personal-layout"><section className="personal-conversation" aria-label="与个人 Agent 对话">
      {!conversation.length && <div className="personal-intro"><h2>不必先有一个问题。</h2><p>说说今天的心情，理一理想法，或者一起做一场白日梦。</p><div className="personal-starters">{[
        { label: '先陪我聊一会儿', prompt: '今天有点累，先陪我聊聊，别急着给建议。', icon: MessageCircleMore },
        { label: '帮我理清思路', prompt: '我有几件事想做，帮我一起理清先后顺序。', icon: ListTodo },
        { label: '一起构思一个世界', prompt: '想和你构思一个争家产的世界，还没想好人物。', icon: PenLine },
        { label: '想体验一次逆袭', prompt: '给我推荐一个能当众打脸的逆袭故事。', icon: Sparkles },
      ].map(({ label, prompt, icon: Icon }) => <button type="button" key={label} disabled={busy} onClick={() => onMessage(prompt)}><Icon />{label}</button>)}</div></div>}
      <div className="personal-log" ref={log} role="log" aria-live="polite" aria-busy={busy}>{conversation.map((turn, index) => <article className="personal-turn" data-role={turn.role} key={index}><small>{turn.role === 'user' ? '你' : '个人 Agent'}</small><p>{turn.content}</p><details className="personal-message-actions"><summary aria-label={'第 ' + (index + 1) + ' 条消息的操作'}><MoreHorizontal />消息操作</summary><button type="button" className="personal-to-creation" disabled={busy} onClick={() => onCreate(turn.content)}>用这条消息开始创作<ArrowRight /></button></details></article>)}{busy && <output className="personal-empty">正在读你的话，想一想怎么回应…</output>}</div>
      <form className="personal-composer" onSubmit={onSubmit}><label className="sr-only" htmlFor="personal-message">说说你正在想的事</label><MessageTextarea id="personal-message" value={message} onChange={(event) => onMessage(event.target.value)} disabled={busy} maxLength={2000} placeholder="今天的心情、想做的事、一个还没成形的念头……" />
        {creationSuggestion && <section className="companion-action" aria-label="创作操作"><strong>一起把想法做成世界</strong><p>{creationSuggestion}</p><div><Button type="button" className="studio-button studio-solid" disabled={busy} onClick={() => onCreate(creationSuggestion)}>确认创作方向与上下文<ArrowRight /></Button><button type="button" className="studio-text-button" disabled={busy} onClick={onDismissCreation}>先继续聊</button></div></section>}
        {error && <p className="personal-error" role="alert">{error}</p>}
        <div className="personal-composer-footer"><small>Enter 发送 · Shift + Enter 换行</small><Button type="submit" className="studio-button studio-solid" disabled={busy || !message.trim()}>{busy ? <LoaderCircle className="spin" /> : <Send />}{busy ? '正在回应' : '发送'}</Button></div>
      </form>
    </section><aside className="personal-sidebar">
      <section className="personal-memories"><h2>慢慢认识你</h2><p className="personal-empty">只记住你愿意让我记住的事。</p>
        {pending.length > 0 && <div className="personal-pending" aria-label="待确认的记忆"><h3>这些，要记住吗？</h3>{pending.map((memory) => <article key={memory}><p>{memory}</p><div><button className="studio-button" type="button" disabled={busy} onClick={() => onConfirmMemory?.(memory)} aria-label={`记住：${memory}`}><Check />记住</button><button className="studio-text-button" type="button" disabled={busy} onClick={() => onDismissMemory?.(memory)}>这次不记</button></div></article>)}</div>}
        <div className="personal-memory-list">{memories.map((memory) => <button type="button" className="studio-button" key={memory} disabled={busy} onClick={() => onRemoveMemory(memory)} aria-label={`删除记忆：${memory}`}>{memory}<X /></button>)}</div>
        {!memories.length && <p className="personal-empty">还没有确认的记忆。</p>}
      </section>
      {identityPanel}
      <section><h2>我也陪你创作</h2><p className="personal-empty">不是换一个助手，是一起换到创作工作台。</p>{activeCreation && <div className="companion-action"><strong>{activeCreation}</strong><button type="button" className="studio-button" disabled={busy} onClick={onResumeCreation}>继续当前创作<ArrowRight /></button></div>}<button className="studio-button" type="button" disabled={busy} onClick={() => onCreate()}><PenLine />一起创作<ArrowRight /></button></section>
      {recommendations.length > 0 && <section aria-label="推荐结果"><h2>{error ? '上次匹配的世界' : '最近推荐'}</h2><p className="personal-empty">可以说“第一个”或“第二个”，也可以点击卡片。刷新后仍保留这个顺序。</p>{recommendations.map((recommendation, index) => { const world = worlds.find((entry) => entry.id === recommendation.worldId); if (!world) return <p className="personal-empty" key={recommendation.worldId}>推荐 {index + 1} · 世界暂不可用，请重新推荐。其他推荐的编号不变。</p>; return <article className="personal-match" key={world.id}><img src={world.cover} alt="" /><div className="personal-match-copy"><span className="studio-featured-label">推荐 {index + 1} · {world.genre}</span><h3>{world.title}</h3><p>{recommendation.reason}</p><Button className="studio-button studio-solid" disabled={busy} onClick={() => onOpenWorld(world.id)}>选个身份，进去试试<ArrowRight /></Button></div></article>; })}</section>}
      <details className="personal-privacy"><summary>关于记忆与隐私</summary><p className="personal-memory-note">点击已保存的记忆可删除。记忆和最近 40 条对话默认只存在此浏览器，不跨设备同步；登录后可在账号栏手动保存、恢复私人云存档。每次回复会将已确认记忆、最近 8 条私聊及当前作品摘要和最近 4 条创作讨论发给 DeepSeek，让我接得上你的进度。请勿输入机密资料。</p><p className="personal-memory-note">进入创作前可选择带入的消息，以及是否参考已确认记忆。私有上下文只用于辅助讨论，不直接写入公开作品；模型建议仍需审阅。选择世界后先确认身份，不自动开始游戏。</p></details>
    </aside></div>
  </div>;
}
