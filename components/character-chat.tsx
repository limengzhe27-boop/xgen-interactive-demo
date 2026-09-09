'use client';
/* oxlint-disable next/no-img-element -- generated portrait and scene assets */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, RefreshCw, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageTextarea } from '@/components/message-textarea';
import { LocalSpeech } from '@/components/local-speech';
import { SpeechSequence } from '@/components/speech-sequence';
import { speechSegments } from '@/lib/speech-sequence';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { createRemoteAIAdapter } from '@/lib/remote-ai-adapter';
import { generateSceneImage } from '@/lib/remote-image-service';
import { shouldGenerateImage } from '@/lib/image-policy';
import { cacheSceneImage, getCachedSceneImage, makeContentImageKey } from '@/lib/image-cache';
import { commitTurn, createInitialWorldState, selectRoleGoal, turnMemoryText } from '@/lib/world-state';
import { chatRequest, directConversationEntry } from '@/lib/studio-session';
import type { ChatSession } from '@/lib/studio-session';
import type { StudioWorld } from '@/lib/studio-worlds';
import type { PlayerPersona } from '@/lib/player-persona';

export function CharacterEntry({ entry, targetId, onStart }: { identityControl?: import('react').ReactNode; entry: StudioWorld; targetId: string; persona?: PlayerPersona | null; onClose: () => void; onStart: (session: ChatSession) => void }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const meeting = directConversationEntry(entry, targetId);
    const playerId = meeting.world.openingScene.presentCharacterIds[0];
    const location = meeting.world.locations.find(place => place.id === meeting.world.openingScene.locationId)!;
    const state = createInitialWorldState('draft', playerId, '', location.name, {
      timeSetting: meeting.world.timeSetting, coreEvent: meeting.world.coreEvent,
      roleKnowledge: [], characterIds: meeting.world.characters.map(role => role.id),
      openingLocationId: location.id, characterLocations: Object.fromEntries(meeting.world.characters.map(role => [role.id, role.startLocationId])),
    });
    onStart({ id: crypto.randomUUID(), entry: meeting, playerRoleId: playerId, targetCharacterId: targetId,
      state, narrative: meeting.world.openingScene.narrative, turns: [], savedAt: Date.now() });
  }, [entry, targetId, onStart]);
  return <output>正在打开对话…</output>;
}

export function CharacterChat({ initial, accountScope, onSave, onBack }: { initial: ChatSession; accountScope: string; onSave: (session: ChatSession) => void; onBack: () => void }) {
  const remoteAIAdapter = useMemo(() => createRemoteAIAdapter(accountScope), [accountScope]);
  const [session, setSession] = useState(initial);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState(initial.entry.cover);
  const [imageState, setImageState] = useState('');
  const controller = useRef<AbortController | null>(null);
  const imageController = useRef<AbortController | null>(null);
  const lastImageAttemptTurn = useRef(initial.state.turn);
  const sessionRef = useRef(session);
  const saveRef = useRef(onSave);
  useEffect(() => { saveRef.current = onSave; }, [onSave]);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLElement>(null);
  const followLatest = useRef(true);
  const [unread, setUnread] = useState(false);
  const player = session.entry.world.characters.find((role) => role.id === session.playerRoleId)!;
  const target = session.entry.world.characters.find((role) => role.id === session.targetCharacterId)!;

  useEffect(() => {
    let live = true;
    if (initial.imageCacheKey) void getCachedSceneImage(initial.imageCacheKey, accountScope).then((url) => { if (live && url) setImage(url); }).catch(() => {});
    return () => { live = false; controller.current?.abort(); imageController.current?.abort(); };
  }, [initial.id, initial.imageCacheKey, accountScope]);
  useEffect(() => {
    if (followLatest.current) endRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    else setUnread(true);
  }, [session.turns.length]);

  async function makeImage(prompt: string, current: ChatSession) {
    imageController.current?.abort();
    const aborter = new AbortController(); imageController.current = aborter;
    setImageState('正在生成场景图，你可以继续阅读');
    const normalizedPrompt = prompt.slice(0, 3900);
    const key = makeContentImageKey('scene', current.entry.world, current.playerRoleId, current.targetCharacterId, normalizedPrompt);
    try {
      const existing = await getCachedSceneImage(key, accountScope).catch(() => null);
      if (aborter.signal.aborted) return;
      if (existing) {
        setImage(existing); setImageState('复用已保存的场景图 · 未重新生图');
        const next = { ...sessionRef.current, imageCacheKey: key };
        sessionRef.current = next; setSession(next); saveRef.current(next);
        return;
      }
      lastImageAttemptTurn.current = current.state.turn;
      const result = await generateSceneImage({ requestId: current.state.turn, sceneId: `chat-${current.state.turn}`, prompt: normalizedPrompt, seed: 690510, purpose: 'scene' }, aborter.signal, accountScope);
      if (aborter.signal.aborted) return;
      const cached = await cacheSceneImage(key, result.assetUrl, accountScope).catch(() => false);
      if (aborter.signal.aborted) return;
      setImage(result.assetUrl); setImageState(cached ? '场景图已生成 · 本地已保存' : '场景图已生成 · 本地图片保存失败');
      const next = { ...sessionRef.current, imageCacheKey: cached ? key : undefined };
      sessionRef.current = next; setSession(next); saveRef.current(next);
    } catch { if (!aborter.signal.aborted) setImageState('场景图生成失败，保留上一张图片，可重试'); }
  }

  async function send(action = input) {
    if (!action.trim() || busy || controller.current) return;
    setBusy(true); setError('');
    const aborter = new AbortController(); controller.current = aborter;
    try {
      const response = await remoteAIAdapter.advanceWorld(chatRequest(sessionRef.current, action.trim()), aborter.signal);
      if (aborter.signal.aborted) return;
      if (!response.actionDecision.allowed) { setError(response.actionDecision.reason || '这次行动没有发生，请换一种表达。'); return; }
      const patch = response.statePatch;
      const world = session.entry.world;
      const state = commitTurn(sessionRef.current.state, { ...patch, action: action.trim(), result: turnMemoryText(response, world, session.playerRoleId), clue: '',
        nextLocation: world.locations.find((place) => place.id === patch.locationId)?.name || sessionRef.current.state.location,
        relationshipDelta: patch.relationshipDeltas?.[target.id] ?? 0, reachedEndingId: response.ending.reached ? response.ending.endingId : undefined });
      const next = { ...sessionRef.current, state, narrative: response.narrative, turns: [...sessionRef.current.turns, { action: action.trim(), response }], savedAt: Date.now() };
      sessionRef.current = next; setSession(next); onSave(next); setInput('');
      if (response.image.prompt && shouldGenerateImage(response.image, state.turn, lastImageAttemptTurn.current, true)) void makeImage(response.image.prompt, next);
    } catch { if (!aborter.signal.aborted) setError('真实模型暂时没有返回有效回应。你的输入和进度已保留，可以重试。'); }
    finally { if (!aborter.signal.aborted) { setBusy(false); controller.current = null; } }
  }

  return <div className="flow-page meeting-chat conversation-shell"><Sheet>
    <header className="conversation-header"><button className="flow-control" onClick={onBack} type="button" aria-label="返回"><ArrowLeft /></button><SheetTrigger className="conversation-heading" aria-label={`查看${target.name}的会面资料`}><img src={session.entry.portraits[target.id] || session.entry.cover} alt="" /><span><strong>{target.name}</strong><small>{session.state.location}</small></span></SheetTrigger><SheetTrigger className="flow-control">会面资料</SheetTrigger></header>
    <SheetContent className="flow-drawer" showCloseButton={false}><div className="flow-drawer-heading"><SheetTitle>会面资料</SheetTitle><SheetClose className="flow-control" aria-label="关闭会面资料"><X /></SheetClose></div><SheetDescription>{session.entry.title} · 这份会面不改变已有探索。</SheetDescription><p>你是 {player.name} · {player.identity}</p><p>目标：{selectRoleGoal(session.entry.world, player.id)?.title || player.goal}</p>{session.entry.world.entryAdmission && <p>额外能力：{session.entry.world.entryAdmission.grantedAbilities.join('；') || '仅剧情身份原有能力'}</p>}<img className="meeting-scene" src={image} alt="当前会面参考插图" /><p>{session.state.location}</p><small>{imageState || session.entry.artNote || '普通对话复用画面，关键变化时更新。'}</small><button className="flow-control" type="button" onClick={() => void makeImage(`${session.entry.world.title}。${session.narrative}。${target.imagePrompt}。电影感场景，无文字，无水印。`, session)} disabled={busy || imageState.startsWith('正在')}><RefreshCw />{imageState.includes('失败') ? '重试场景图' : '生成场景图（可选）'}</button><p>手动生成会调用生图服务并产生费用，打开资料不会生成图片。</p></SheetContent>
    <div className="conversation-layout"><div className="conversation-main">
    <section ref={messagesRef} className="conversation-messages" aria-label={`与${target.name}的对话记录`} tabIndex={0} onScroll={() => { const area = messagesRef.current; if (area) { followLatest.current = area.scrollHeight - area.scrollTop - area.clientHeight < 80; if (followLatest.current) setUnread(false); } }}>
      <div className="conversation-opening"><small>会面开始</small><p>{session.entry.world.openingScene.narrative}</p><LocalSpeech accountScope={accountScope} text={session.entry.world.openingScene.narrative} /></div>
      {session.turns.map((turn, index) => <article className="studio-chat-turn" key={index}>
        <div className="studio-chat-user"><small>{player.name === '你' ? '你' : `${player.name} · 你`}</small><p>{turn.action}</p></div>
        <div className="conversation-response">
        <div className="conversation-narrative"><p>{turn.response.narrative}</p></div>
        {turn.response.dialogue.filter((line) => line.visibleToRoleIds.includes(player.id) && line.characterId !== player.id).map((line, i) => <div className="conversation-line" key={i}><img src={session.entry.portraits[line.characterId] || session.entry.cover} alt="" /><div><strong>{session.entry.world.characters.find((role) => role.id === line.characterId)?.name || '角色'}</strong><p>{line.text}</p></div></div>)}
        <SpeechSequence accountScope={accountScope} segments={speechSegments(turn.response.narrative, turn.response.dialogue.filter(line => line.visibleToRoleIds.includes(player.id) && line.characterId !== player.id))} />
        </div>
        {turn.response.ending.reached && <p className="studio-chat-ending">已抵达阶段结局。可以返回结束，也可以继续聊，已有事实不会重置。</p>}
      </article>)}
      {busy && <p className="conversation-wait" role="status"><LoaderCircle className="spin" />{target.name}正在回应…</p>}
      <div ref={endRef} />
    </section>
      <form className="conversation-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        {unread && <button type="button" className="flow-control" onClick={() => { followLatest.current = true; setUnread(false); endRef.current?.scrollIntoView({ block: 'nearest' }); }}>查看新回复 ↓</button>}
        {!!session.turns.at(-1)?.response.nextChoices.length && <details className="conversation-ideas"><summary>接下来怎么回应？</summary><div className="studio-chat-suggestions">{session.turns.at(-1)?.response.nextChoices.map((choice) => <button className="studio-filter" key={choice.id} type="button" disabled={busy} onClick={() => { setInput(choice.label); document.getElementById('chat-input')?.focus(); }}>{choice.label}</button>)}</div></details>}
        <label className="sr-only" htmlFor="chat-input">说一句话，或描述你的动作</label>
        <div className="conversation-input"><MessageTextarea id="chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder={`对${target.name}说一句话，或描述你的动作…`} disabled={busy} maxLength={3000} /><Button className="studio-button" type="submit" aria-label={busy ? '正在回应' : '发送'} disabled={busy || !input.trim()}>{busy ? <LoaderCircle className="spin" /> : <Send />}</Button></div>
        {error && <p role="alert">{error}</p>}
        <small className="conversation-input-hint">Enter 发送 · Shift + Enter 换行</small>
      </form>
    </div><aside className="conversation-profile" aria-label="人物资料"><img src={session.entry.portraits[target.id] || session.entry.cover} alt={target.name} /><h2>{target.name}</h2><details><summary>人物背景</summary><p>{target.identity}</p><p>{target.persona}</p></details><details><summary>所在世界</summary><p>{session.entry.title}</p><p>{session.state.location}</p></details><SheetTrigger className="flow-control">查看会面与场景资料</SheetTrigger></aside></div></Sheet>
  </div>;
}
