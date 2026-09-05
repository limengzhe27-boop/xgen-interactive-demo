'use client';
/* oxlint-disable next/no-img-element -- local catalogue artwork */
import type { SyntheticEvent } from 'react';
import { useEffect, useRef } from 'react';
import { ArrowRight, LoaderCircle, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { WorldCard } from '@/components/studio-home';
import type { PersonalAgentResponse, PersonalAgentRequest } from '@/lib/ai-contracts';

export function PersonalAgent({ message, conversation, busy, error, recommendations, worlds, memories, onMessage, onSubmit, onRemoveMemory, onOpenWorld, onCreate }: {
  message: string; conversation: NonNullable<PersonalAgentRequest['conversation']>; busy: boolean; error: string;
  recommendations: PersonalAgentResponse['recommendations']; worlds: WorldCard[]; memories: string[];
  onMessage: (value: string) => void; onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onRemoveMemory: (memory: string) => void; onOpenWorld: (id: string) => void; onCreate: () => void;
}) {
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [conversation.length, busy]);
  return <div className="personal-workspace">
    <header className="personal-heading"><Sparkles /><div><span className="studio-wordmark">个人 AGENT</span><h1>你的口味，我来接住。</h1><p>聊聊你想成为谁、想赢回什么，我帮你找一个值得入戏的世界。</p></div></header>
    <div className="personal-layout"><section className="personal-conversation" aria-label="与个人 Agent 对话">
      {!conversation.length && <div className="personal-intro"><h2>这一次，你想怎么爽？</h2><p>想让前任后悔，想让看不起你的人改口，还是想在一场争夺里拿回主动权？也可以直接告诉我你不想碰的情节。</p><div className="personal-starters">{['想玩追妻火葬场，但我要有说不的权利。', '给我一个当众打脸、拿回署名的职场逆袭本。', '想争家产、抢话语权，不想玩复杂解谜。'].map((prompt) => <button type="button" className="studio-button" key={prompt} disabled={busy} onClick={() => onMessage(prompt)}>{prompt}<ArrowRight /></button>)}</div></div>}
      <div className="personal-log" ref={log} role="log" aria-live="polite" aria-busy={busy}>{conversation.map((turn, index) => <article className="personal-turn" data-role={turn.role} key={index}><small>{turn.role === 'user' ? '你' : '个人 Agent'}</small><p>{turn.content}</p></article>)}{busy && <output className="personal-empty">正在根据这次表达和已有偏好挑选世界…</output>}</div>
      <form className="personal-composer" onSubmit={onSubmit}><label htmlFor="personal-message">想体验的关系、情节，或者明确不想要的内容</label><Textarea id="personal-message" value={message} onChange={(event) => onMessage(event.target.value)} disabled={busy} maxLength={2000} placeholder="比如：要狗血，但别替我原谅谁；我想自己决定结局。" />
        {error && <p className="personal-error" role="alert">{error}</p>}
        <div className="personal-composer-footer"><small>可继续追问，也可以换一种口味。</small><Button type="submit" className="studio-button studio-solid" disabled={busy || !message.trim()}>{busy ? <LoaderCircle className="spin" /> : <Send />}{busy ? '正在匹配' : '告诉 Agent'}</Button></div>
      </form>
    </section><aside className="personal-sidebar"><section aria-label="推荐结果"><h2>{error && recommendations.length ? '上次匹配的世界' : '这次为你挑选'}</h2>
      {!recommendations.length && <p className="personal-empty">先聊一句。这里会出现实际匹配到的世界，以及它为什么适合你。</p>}
      {recommendations.map((recommendation) => { const world = worlds.find((entry) => entry.id === recommendation.worldId); if (!world) return null; return <article className="personal-match" key={world.id}><img src={world.cover} alt="" /><div className="personal-match-copy"><span className="studio-featured-label">{world.genre}</span><h3>{world.title}</h3><p>{recommendation.reason}</p><Button className="studio-button studio-solid" onClick={() => onOpenWorld(world.id)}>选个身份，进去试试<ArrowRight /></Button></div></article>; })}
      <button className="studio-text-button" type="button" onClick={onCreate}>没找到？创作自己的本子<ArrowRight /></button>
    </section><section className="personal-memories"><h2>你告诉我的偏好</h2><div className="personal-memory-list">{memories.map((memory) => <button type="button" className="studio-button" key={memory} disabled={busy} onClick={() => onRemoveMemory(memory)} aria-label={`删除偏好：${memory}`}>{memory}<X /></button>)}</div>{!memories.length && <p className="personal-empty">还没有保存偏好，不会替你预设人设。</p>}<p className="personal-memory-note">点击可删除。偏好保存在此浏览器；上方对话仅在本次页面会话保留。</p></section></aside></div>
  </div>;
}
