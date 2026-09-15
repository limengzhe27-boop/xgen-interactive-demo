'use client';
/* oxlint-disable next/no-img-element -- local catalogue artwork */
import type { SyntheticEvent } from 'react';
import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, MessageCircleMore, MoreHorizontal, PenLine, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@/lib/user-profile';
import type { PlayerPersona } from '@/lib/player-persona';
import { MessageTextarea } from '@/components/message-textarea';
import { LocalSpeech } from '@/components/local-speech';
import { recommendationIntro, recommendationTurnIndex } from '@/lib/personal-recommendations';
import type { WorldCard } from '@/components/studio-home';
import type { PersonalAgentResponse, PersonalAgentRequest } from '@/lib/ai-contracts';

export function PersonalAgent({ accountScope, profile, persona, onProfile, message, conversation, busy, error, recommendations, worlds, memories, pending = [], onMessage, onSubmit, onRemoveMemory, onConfirmMemory, onDismissMemory, onOpenWorld, onCreate, creationSuggestion, onDismissCreation, activeCreation, onResumeCreation, onBack }: {
  accountScope: string;
  creationSuggestion?: string | null; onDismissCreation: () => void; activeCreation?: string; onResumeCreation: () => void; onBack: () => void;
  profile: UserProfile; persona: PlayerPersona | null; onProfile: () => void;
  message: string; conversation: NonNullable<PersonalAgentRequest['conversation']>; busy: boolean; error: string;
  recommendations: PersonalAgentResponse['recommendations']; worlds: WorldCard[]; memories: string[]; pending?: string[];
  onMessage: (value: string) => void; onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onRemoveMemory: (memory: string) => void; onOpenWorld: (id: string) => void; onCreate: (seed?: string) => void;
  onConfirmMemory?: (memory: string) => void; onDismissMemory?: (memory: string) => void;
}) {
  const log = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  useEffect(() => { if (log.current && nearBottom.current) log.current.scrollTop = log.current.scrollHeight; }, [conversation.length, busy, pending.length, creationSuggestion]);
  const recommendationIndex = recommendationTurnIndex(conversation);
  const matches = <div className="companion-matches" aria-label="推荐结果">{recommendations.map((recommendation, index) => {
    const world = worlds.find((entry) => entry.id === recommendation.worldId);
    if (!world) return <p className="personal-empty" key={recommendation.worldId}>推荐 {index + 1} · 世界暂不可用，请重新推荐。其他推荐的编号不变。</p>;
    return <article className="companion-match" key={world.id}><img src={world.cover} alt="" loading="lazy" /><div><small>推荐 {index + 1} · {world.genre}</small><h3>{world.title}</h3><p>{recommendation.reason}</p><button type="button" className="flow-control" disabled={busy} onClick={() => onOpenWorld(world.id)}>选身份，进入世界<ArrowRight /></button></div></article>;
  })}</div>;
  const about = <>
    <div className="companion-profile-heading"><h2>关于我</h2><button type="button" className="flow-control" onClick={onProfile} aria-label="编辑个人资料"><PenLine /></button></div>
    <section aria-label="真实资料" className="companion-profile-fields">{([['introduction', '介绍'], ['preferences', '偏好'], ['communication', '交流']] as const).map(([key, label]) => <p className="companion-profile-field" key={key}><span>{label}：</span><span title={profile?.[key]}>{profile?.[key] || '尚未填写'}</span></p>)}</section>
    <section aria-label="已确认记忆"><h3>Agent 已记住</h3>{memories.length ? <ul className="companion-memory-items">{memories.map(memory => <li key={memory}><p>{memory}</p><button type="button" className="flow-control" disabled={busy} aria-label={'删除记忆：' + memory} onClick={() => { if (window.confirm('删除这条已确认的记忆？')) onRemoveMemory(memory); }}><X /></button></li>)}</ul> : <p className="personal-empty">还没有已确认的记忆，记住之前会先问你。</p>}</section>
    <section aria-label="虚拟形象"><h3>故事里的我 · 虚拟形象</h3>{persona ? <><div className="companion-persona-heading">{persona.portraitUrl && <img src={persona.portraitUrl} alt="" />}<strong>{persona.name}</strong></div><div className="companion-profile-fields">{([['identity', '身份'], ['appearance', '外貌'], ['personality', '性格'], ['abilities', '能力']] as const).map(([key, label]) => <p className="companion-profile-field" key={key}><span>{label}：</span><span title={persona[key]}>{persona[key] || '尚未设定'}</span></p>)}</div></> : <p className="personal-empty">尚未设定。与真实资料分开保存。</p>}<button type="button" className="flow-control" onClick={onProfile}>查看与编辑完整资料<ArrowRight /></button></section>
    <details className="personal-privacy"><summary>记忆与隐私</summary><p>资料与最近 40 条对话默认保存在本机，私人云存档需手动保存。每次回复会将已确认记忆、最近 8 条私聊、当前作品摘要和最近 4 条创作讨论发送给公司网关及其模型供应商，请勿输入机密资料。进入创作前仍需确认带入的内容，不直接公开私人上下文。虚拟形象不作为真实身份记忆。</p><button type="button" className="flow-control" onClick={onProfile}>管理资料与记忆<ArrowRight /></button></details>
  </>;
  return <div className="flow-page conversation-shell companion-chat">
    <header className="conversation-header"><button className="flow-control" type="button" onClick={onBack} aria-label="返回首页"><ArrowLeft /></button><div className="conversation-heading"><Sparkles /><span><strong>个人 Agent</strong><small>聊聊生活，也一起构思故事</small></span></div></header>
    <div className="conversation-layout">
    <section className="conversation-main" aria-label="与个人 Agent 对话">
      <div className="conversation-messages" ref={log} onScroll={(event) => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
        <section className="conversation-inline-profile companion-profile" aria-label="我的资料">{about}</section>
        <div role="log" aria-live="polite" aria-busy={busy}>
        {!conversation.length && <div className="companion-welcome"><Sparkles /><h1>不必先有一个问题。</h1><p>聊聊今天，理一理想法。<br />也可以一起，创造另一种人生。</p><div className="personal-starters">{[
          { label: '先陪我聊一会儿', prompt: '今天有点累，先陪我聊聊，别急着给建议。', icon: MessageCircleMore },
          { label: '一起构思一个世界', prompt: '想和你构思一个争家产的世界，还没想好人物。', icon: PenLine },
        ].map(({ label, prompt, icon: Icon }) => <button type="button" key={label} disabled={busy} onClick={() => { onMessage(prompt); document.getElementById('personal-message')?.focus(); }}><Icon />{label}</button>)}</div></div>}
        {conversation.map((turn, index) => <article className="companion-chat-turn" data-role={turn.role} aria-label={turn.role === 'user' ? '我的消息' : '个人 Agent 的消息'} key={index}>{turn.role === 'assistant' && <strong className="companion-speaker"><Sparkles />个人 Agent</strong>}<div className={turn.role === 'user' ? 'studio-chat-user' : 'companion-answer'}><p>{index === recommendationIndex && recommendations.length ? recommendationIntro(turn.content) : turn.content}</p></div>
          {index === recommendationIndex && recommendations.length > 0 && matches}
          <div className="companion-turn-tools">{turn.role === 'assistant' && <LocalSpeech accountScope={accountScope} text={turn.content} speaker="personal-agent" />}
          <details className="personal-message-actions"><summary aria-label={'第 ' + (index + 1) + ' 条消息的操作'}><MoreHorizontal /><span className="sr-only">消息操作</span></summary><button type="button" className="personal-to-creation" disabled={busy} onClick={() => onCreate(turn.content)}>用这条消息开始创作<ArrowRight /></button></details></div>
        </article>)}
        {busy && <output className="personal-empty">正在读你的话，想一想怎么回应…</output>}
        {creationSuggestion && <section className="companion-action" aria-label="创作操作"><strong>一起把想法做成世界</strong><p>{creationSuggestion}</p><div><Button type="button" className="studio-button studio-solid" disabled={busy} onClick={() => onCreate(creationSuggestion)}>确认方向，继续创作<ArrowRight /></Button><button type="button" className="studio-text-button" disabled={busy} onClick={onDismissCreation}>先继续聊</button></div></section>}
        {pending.length > 0 && <section className="personal-pending" aria-label="待确认的记忆"><h2>这些，要记住吗？</h2>{pending.map((memory) => <article key={memory}><p>{memory}</p><div><button className="flow-control" type="button" disabled={busy} onClick={() => onConfirmMemory?.(memory)} aria-label={'记住：' + memory}><Check />记住</button><button className="flow-control" type="button" disabled={busy} onClick={() => onDismissMemory?.(memory)}>这次不记</button></div></article>)}</section>}
        {recommendationIndex < 0 && recommendations.length > 0 && <section aria-label="上次推荐的世界"><h3>上次推荐</h3>{matches}</section>}
        </div>
      </div>
      <div className="conversation-composer">
      {activeCreation && <button type="button" className="companion-resume" disabled={busy} onClick={onResumeCreation}><PenLine /><span>继续创作 · {activeCreation}</span><ArrowRight /></button>}
      <form onSubmit={(event) => { nearBottom.current = true; onSubmit(event); }}><div className="conversation-input"><label className="sr-only" htmlFor="personal-message">说说你正在想的事</label><MessageTextarea id="personal-message" rows={1} value={message} onChange={(event) => onMessage(event.target.value)} disabled={busy} maxLength={2000} placeholder="聊聊今天，或描述一个想法…" /><button type="submit" aria-label={busy ? '正在回应' : '发送'} disabled={busy || !message.trim()}>{busy ? <LoaderCircle className="spin" /> : <Send />}</button></div>
        {error && <p className="personal-error" role="alert">{error}</p>}
        <small className="conversation-input-hint">Enter 发送 · Shift + Enter 换行</small>
      </form>
      </div>
    </section>
    <aside className="conversation-profile companion-profile" aria-label="我的资料">{about}</aside>
    </div>
  </div>;
}
