'use client';
/* oxlint-disable next/no-img-element -- local catalogue artwork */
import type { ReactNode, SyntheticEvent } from 'react';
import { useEffect, useRef } from 'react';
import { ArrowRight, Check, LoaderCircle, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageTextarea } from '@/components/message-textarea';
import type { WorldCard } from '@/components/studio-home';
import type { PersonalAgentResponse, PersonalAgentRequest } from '@/lib/ai-contracts';

export function PersonalAgent({ identityPanel, message, conversation, busy, error, recommendations, worlds, memories, pending = [], onMessage, onSubmit, onRemoveMemory, onConfirmMemory, onDismissMemory, onOpenWorld, onCreate }: {
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
    <header className="personal-heading"><Sparkles /><div><span className="studio-wordmark">个人 AGENT · 你的 AI 伙伴</span><h1>今天，想聊点什么？</h1><p>聊近况，理清想法，或者一起创造一个世界。慢慢认识你，从每一次对话开始。</p></div></header>
    {identityPanel}
    <div className="personal-layout"><section className="personal-conversation" aria-label="与个人 Agent 对话">
      {!conversation.length && <div className="personal-intro"><h2>不必先有一个问题。</h2><p>可以说说今天发生的事，也可以让我帮你把一团乱的想法理出头绪。想找故事、捏角色时，我们再一起聊。</p><div className="personal-starters">{['今天有点累，先陪我聊聊，别急着给建议。', '我有几件事想做，帮我一起理清先后顺序。', '想和你构思一个争家产的世界，还没想好人物。', '给我推荐一个能当众打脸的逆袭故事。'].map((prompt) => <button type="button" className="studio-button" key={prompt} disabled={busy} onClick={() => onMessage(prompt)}>{prompt}<ArrowRight /></button>)}</div></div>}
      <div className="personal-log" ref={log} role="log" aria-live="polite" aria-busy={busy}>{conversation.map((turn, index) => <article className="personal-turn" data-role={turn.role} key={index}><small>{turn.role === 'user' ? '你' : '个人 Agent'}</small><p>{turn.content}</p><button type="button" className="personal-to-creation" disabled={busy} onClick={() => onCreate(turn.content)}>用这条消息开始创作<ArrowRight /></button></article>)}{busy && <output className="personal-empty">正在读你的话，想一想怎么回应…</output>}</div>
      <form className="personal-composer" onSubmit={onSubmit}><label htmlFor="personal-message">说说你正在想的事 · Enter 发送，Shift + Enter 换行</label><MessageTextarea id="personal-message" value={message} onChange={(event) => onMessage(event.target.value)} disabled={busy} maxLength={2000} placeholder="今天的心情、想做的事、一个还没成形的念头……" />
        {error && <p className="personal-error" role="alert">{error}</p>}
        <div className="personal-composer-footer"><small>聊天由 DeepSeek 回应；明确选择世界时直接打开身份入口，不自动开始游戏。</small><Button type="submit" className="studio-button studio-solid" disabled={busy || !message.trim()}>{busy ? <LoaderCircle className="spin" /> : <Send />}{busy ? '正在回应' : '发送'}</Button></div>
      </form>
    </section><aside className="personal-sidebar">
      <section className="personal-memories"><h2>慢慢认识你</h2><p className="personal-empty">你的兴趣、正在努力的目标、希望我怎样回应你。你确认的内容，会用于以后的聊天。</p>
        {pending.length > 0 && <div className="personal-pending" aria-label="待确认的记忆"><h3>这些，要记住吗？</h3>{pending.map((memory) => <article key={memory}><p>{memory}</p><div><button className="studio-button" type="button" disabled={busy} onClick={() => onConfirmMemory?.(memory)} aria-label={`记住：${memory}`}><Check />记住</button><button className="studio-text-button" type="button" disabled={busy} onClick={() => onDismissMemory?.(memory)}>这次不记</button></div></article>)}</div>}
        <div className="personal-memory-list">{memories.map((memory) => <button type="button" className="studio-button" key={memory} disabled={busy} onClick={() => onRemoveMemory(memory)} aria-label={`删除记忆：${memory}`}>{memory}<X /></button>)}</div>
        {!memories.length && <p className="personal-empty">还没有确认的记忆，不替你预设人设。</p>}<p className="personal-memory-note">点击已保存的内容可删除。记忆和最近 40 条对话只保存在此浏览器，不跨设备同步；每次回复会将已确认记忆和最近 8 条对话发给 DeepSeek。请勿输入机密资料。</p>
      </section>
      <section><h2>一起把想法变成世界</h2><p className="personal-empty">不用先写完整剧本。先聊人物、关系和冲突，再决定要采纳哪些设定。</p><button className="studio-button" type="button" disabled={busy} onClick={() => onCreate()}>去和创作 Agent 讨论<ArrowRight /></button><p className="personal-memory-note">也可以从对话中选择一条消息作为起点；不会自动带入个人记忆或整段私聊。</p></section>
      {recommendations.length > 0 && <section aria-label="推荐结果"><h2>{error ? '上次匹配的世界' : '最近推荐'}</h2><p className="personal-empty">可以说“第一个”或“第二个”，也可以点击卡片。刷新后仍保留这个顺序。</p>{recommendations.map((recommendation, index) => { const world = worlds.find((entry) => entry.id === recommendation.worldId); if (!world) return <p className="personal-empty" key={recommendation.worldId}>推荐 {index + 1} · 世界暂不可用，请重新推荐。其他推荐的编号不变。</p>; return <article className="personal-match" key={world.id}><img src={world.cover} alt="" /><div className="personal-match-copy"><span className="studio-featured-label">推荐 {index + 1} · {world.genre}</span><h3>{world.title}</h3><p>{recommendation.reason}</p><Button className="studio-button studio-solid" disabled={busy} onClick={() => onOpenWorld(world.id)}>选个身份，进去试试<ArrowRight /></Button></div></article>; })}</section>}
    </aside></div>
  </div>;
}
