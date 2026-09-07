'use client';
/* oxlint-disable next/no-img-element -- local catalogue artwork */
import type { ReactNode, SyntheticEvent } from 'react';
import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, MessageCircleMore, MoreHorizontal, PenLine, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { MessageTextarea } from '@/components/message-textarea';
import { recommendationIntro, recommendationTurnIndex } from '@/lib/personal-recommendations';
import type { WorldCard } from '@/components/studio-home';
import type { PersonalAgentResponse, PersonalAgentRequest } from '@/lib/ai-contracts';

export function PersonalAgent({ identityPanel, message, conversation, busy, error, recommendations, worlds, memories, pending = [], onMessage, onSubmit, onRemoveMemory, onConfirmMemory, onDismissMemory, onOpenWorld, onCreate, creationSuggestion, onDismissCreation, activeCreation, onResumeCreation, onBack }: {
  creationSuggestion?: string | null; onDismissCreation: () => void; activeCreation?: string; onResumeCreation: () => void; onBack: () => void;
  identityPanel?: ReactNode;
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
  return <div className="flow-page companion-page">
    <Sheet>
      <header className="flow-toolbar"><button className="flow-control" type="button" onClick={onBack}><ArrowLeft />首页</button><span>个人 Agent</span><SheetTrigger className="flow-control">关于我</SheetTrigger></header>
      <SheetContent className="flow-drawer companion-about" showCloseButton={false}>
        <div className="flow-drawer-heading"><SheetTitle>关于我</SheetTitle><SheetClose className="flow-control" aria-label="关闭关于我"><X /></SheetClose></div>
        <SheetDescription>你决定让我记住什么，也可以随时删除。</SheetDescription>
        <section className="personal-memories"><h2>已经认识的你</h2><div className="personal-memory-list">{memories.map((memory) => <button type="button" className="studio-button" key={memory} disabled={busy} onClick={() => onRemoveMemory(memory)} aria-label={'删除记忆：' + memory}>{memory}<X /></button>)}</div>{!memories.length && <p className="personal-empty">还没有确认的记忆。聊到值得记住的事时，我会先问你。</p>}</section>
        {recommendations.length > 0 && <details className="flow-disclosure"><summary>上次推荐的世界</summary>{matches}</details>}
        <details className="personal-privacy"><summary>记忆与隐私</summary><p>点击已保存的记忆可删除。记忆和最近 40 条对话默认只存在此浏览器；登录后可在账号栏手动保存、恢复私人云存档。每次回复会将已确认记忆、最近 8 条私聊及当前作品摘要和最近 4 条创作讨论发给 DeepSeek。请勿输入机密资料。</p><p>进入创作前可选择带入的消息，以及是否参考已确认记忆。私有上下文不直接写入公开作品；模型建议仍需你审阅。选择世界后先确认身份，不自动开始游戏。</p></details>
      </SheetContent>
    </Sheet>
    <div className="companion-identity">{identityPanel}</div>
    <section className="companion-conversation" aria-label="与个人 Agent 对话">
      <div className="companion-log" ref={log} role="log" aria-live="polite" aria-busy={busy} onScroll={(event) => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
        {!conversation.length && <div className="companion-welcome"><Sparkles /><h1>不必先有一个问题。</h1><p>聊聊今天，理一理想法。<br />也可以一起，创造另一种人生。</p><div className="personal-starters">{[
          { label: '先陪我聊一会儿', prompt: '今天有点累，先陪我聊聊，别急着给建议。', icon: MessageCircleMore },
          { label: '一起构思一个世界', prompt: '想和你构思一个争家产的世界，还没想好人物。', icon: PenLine },
        ].map(({ label, prompt, icon: Icon }) => <button type="button" key={label} disabled={busy} onClick={() => { onMessage(prompt); document.getElementById('personal-message')?.focus(); }}><Icon />{label}</button>)}</div></div>}
        {conversation.map((turn, index) => <article className="personal-turn" data-role={turn.role} key={index}><small>{turn.role === 'user' ? '你' : '个人 Agent'}</small><p>{index === recommendationIndex && recommendations.length ? recommendationIntro(turn.content) : turn.content}</p>
          {index === recommendationIndex && recommendations.length > 0 && matches}
          <details className="personal-message-actions"><summary aria-label={'第 ' + (index + 1) + ' 条消息的操作'}><MoreHorizontal /><span className="sr-only">消息操作</span></summary><button type="button" className="personal-to-creation" disabled={busy} onClick={() => onCreate(turn.content)}>用这条消息开始创作<ArrowRight /></button></details>
        </article>)}
        {busy && <output className="personal-empty">正在读你的话，想一想怎么回应…</output>}
        {creationSuggestion && <section className="companion-action" aria-label="创作操作"><strong>一起把想法做成世界</strong><p>{creationSuggestion}</p><div><Button type="button" className="studio-button studio-solid" disabled={busy} onClick={() => onCreate(creationSuggestion)}>确认方向，继续创作<ArrowRight /></Button><button type="button" className="studio-text-button" disabled={busy} onClick={onDismissCreation}>先继续聊</button></div></section>}
        {pending.length > 0 && <section className="personal-pending" aria-label="待确认的记忆"><h2>这些，要记住吗？</h2>{pending.map((memory) => <article key={memory}><p>{memory}</p><div><button className="flow-control" type="button" disabled={busy} onClick={() => onConfirmMemory?.(memory)} aria-label={'记住：' + memory}><Check />记住</button><button className="flow-control" type="button" disabled={busy} onClick={() => onDismissMemory?.(memory)}>这次不记</button></div></article>)}</section>}
      </div>
      {activeCreation && <button type="button" className="companion-resume" disabled={busy} onClick={onResumeCreation}><PenLine /><span>继续创作 · {activeCreation}</span><ArrowRight /></button>}
      <form className="personal-composer" onSubmit={(event) => { nearBottom.current = true; onSubmit(event); }}><label className="sr-only" htmlFor="personal-message">说说你正在想的事</label><MessageTextarea id="personal-message" value={message} onChange={(event) => onMessage(event.target.value)} disabled={busy} maxLength={2000} placeholder="今天的心情、想做的事、一个还没成形的念头……" />
        {error && <p className="personal-error" role="alert">{error}</p>}
        <div className="personal-composer-footer"><small>Enter 发送 · Shift + Enter 换行</small><Button type="submit" className="studio-button studio-solid" disabled={busy || !message.trim()}>{busy ? <LoaderCircle className="spin" /> : <Send />}{busy ? '正在回应' : '发送'}</Button></div>
      </form>
    </section>
  </div>;
}
