'use client';
/* oxlint-disable next/no-img-element -- generated portrait and scene assets */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageTextarea } from '@/components/message-textarea';
import { LocalSpeech } from '@/components/local-speech';
import { SpeechSequence } from '@/components/speech-sequence';
import { speechSegments } from '@/lib/speech-sequence';
import { createRemoteAIAdapter } from '@/lib/remote-ai-adapter';
import { generateSceneImage } from '@/lib/remote-image-service';
import { shouldGenerateImage } from '@/lib/image-policy';
import { cacheSceneImage, getCachedSceneImage, makeContentImageKey } from '@/lib/image-cache';
import { commitTurn, createInitialWorldState, turnMemoryText } from '@/lib/world-state';
import { chatRequest, directConversationEntry } from '@/lib/studio-session';
import type { ChatSession } from '@/lib/studio-session';
import type { StudioWorld } from '@/lib/studio-worlds';
import type { PlayerPersona } from '@/lib/player-persona';
import { characterGreeting } from '@/lib/character-greeting';
import { useRecordPlay } from '@/components/play-counts';

export function CharacterEntry({ entry, targetId, onStart }: { identityControl?: import('react').ReactNode; entry: StudioWorld; targetId: string; persona?: PlayerPersona | null; onClose: () => void; onStart: (session: ChatSession) => void }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const meeting = directConversationEntry(entry, targetId);
    const greeting = characterGreeting(entry, targetId);
    meeting.world.openingScene.narrative = `${greeting.scene}\n\n${greeting.text}`;
    const playerId = meeting.world.openingScene.presentCharacterIds[0];
    const location = meeting.world.locations.find(place => place.id === meeting.world.openingScene.locationId)!;
    const state = createInitialWorldState('draft', playerId, '', location.name, {
      timeSetting: meeting.world.timeSetting, coreEvent: meeting.world.coreEvent,
      roleKnowledge: [], characterIds: meeting.world.characters.map(role => role.id),
      openingLocationId: location.id, characterLocations: Object.fromEntries(meeting.world.characters.map(role => [role.id, role.startLocationId])),
    });
    onStart({ id: crypto.randomUUID(), entry: meeting, playerRoleId: playerId, targetCharacterId: targetId,
      state, narrative: meeting.world.openingScene.narrative, greeting, turns: [], savedAt: Date.now() });
  }, [entry, targetId, onStart]);
  return <output>正在打开对话…</output>;
}

export function CharacterChat({ initial, accountScope, onSave, onBack }: { initial: ChatSession; accountScope: string; onSave: (session: ChatSession) => void; onBack: () => void }) {
  const remoteAIAdapter = useMemo(() => createRemoteAIAdapter(accountScope), [accountScope]);
  const [session, setSession] = useState(() => {
    // Upgrade an unopened legacy encounter; never rewrite a conversation already played.
    if (initial.turns.length) return initial;
    const greeting = characterGreeting(initial.entry, initial.targetCharacterId);
    const narrative = `${greeting.scene}\n\n${greeting.text}`;
    return { ...initial, greeting, narrative, entry: { ...initial.entry, world: { ...initial.entry.world,
      openingScene: { ...initial.entry.world.openingScene, narrative } } } };
  });
  useRecordPlay(session.turns.length ? `character:${session.entry.id}:${session.targetCharacterId}` : null, accountScope);
  const [input, setInput] = useState(initial.draftInput ?? '');
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
  const identity = target.identity.replace(/^\s*\d+\s*岁\s*[·・，,／/]?\s*/, '');
  const background = (target.publicBackground || '').replace(target.identity, '').replace(target.persona, '').replace(/^[。；\s]+|[。；\s]+$/g, '');
  const place = session.entry.world.locations.find(item => item.id === target.startLocationId);
  const profile = <><h2>{target.name}</h2><p className="conversation-identity">{identity}</p>
    {background && <section><h3>他是谁</h3><p>{background}</p></section>}
    <section><h3>初见时的场景 · {place?.name}</h3><p>{place?.description || '你们在这里开始交谈。'}</p></section>
    <section><h3>性格与相处</h3><p>{target.persona}</p></section>
    </>;
  function editInput(value: string) {
    setInput(value);
    const next = { ...sessionRef.current, draftInput: value };
    sessionRef.current = next;
    saveRef.current(next);
  }

  useEffect(() => {
    let live = true;
    if (initial.imageCacheKey) void getCachedSceneImage(initial.imageCacheKey, accountScope).then((url) => { if (live && url) setImage(url); }).catch(() => {});
    return () => { live = false; controller.current?.abort(); imageController.current?.abort(); };
  }, [initial.id, initial.imageCacheKey, accountScope]);
  useEffect(() => {
    if (!session.turns.length) return;
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
      const next = { ...sessionRef.current, state, draftInput: '', narrative: response.narrative, turns: [...sessionRef.current.turns, { action: action.trim(), response }], savedAt: Date.now() };
      sessionRef.current = next; setSession(next); onSave(next); setInput('');
      if (response.image.prompt && shouldGenerateImage(response.image, state.turn, lastImageAttemptTurn.current, true)) void makeImage(response.image.prompt, next);
    } catch (cause) { if (!aborter.signal.aborted) setError(cause instanceof Error ? cause.message : '网络连接失败，你的输入和进度已保留，可以重试。'); }
    finally { if (!aborter.signal.aborted) { setBusy(false); controller.current = null; } }
  }

  const sceneTools = <section className="conversation-scene-tools">{image !== session.entry.cover && <img src={image} alt="生成的场景插图" />}<button className="flow-control" type="button" onClick={() => void makeImage(`${session.entry.world.title}。${session.narrative}。${target.imagePrompt}。电影感场景，无文字，无水印。`, session)} disabled={busy || imageState.startsWith('正在')}><RefreshCw />{imageState.includes('失败') ? '重试场景图' : '生成场景图'}</button>{imageState && <small role="status">{imageState}</small>}</section>;
  return <div className="flow-page meeting-chat conversation-shell">
    <header className="conversation-header"><button className="flow-control" onClick={onBack} type="button" aria-label="返回"><ArrowLeft /></button><div className="conversation-heading"><img src={session.entry.portraits[target.id] || session.entry.cover} alt="" /><span><strong>{target.name}</strong><small>{session.state.location}</small></span></div></header>
    <div className="conversation-layout"><div className="conversation-main">
    <section ref={messagesRef} className="conversation-messages" aria-label={`与${target.name}的对话记录`} tabIndex={0} onScroll={() => { const area = messagesRef.current; if (area) { followLatest.current = area.scrollHeight - area.scrollTop - area.clientHeight < 80; if (followLatest.current) setUnread(false); } }}>
      <details className="conversation-inline-profile"><summary>人物与场景</summary>{profile}{sceneTools}</details>
      <div className="conversation-opening">{session.greeting ? <><section className="conversation-encounter" aria-label="初见场景"><span>{place?.name}</span>{session.greeting.scene.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section><div className="conversation-line"><img src={session.entry.portraits[target.id] || session.entry.cover} alt="" /><div><strong>{target.name}</strong><p>{session.greeting.text}</p></div></div><LocalSpeech accountScope={accountScope} text={session.greeting.text} /></> : <><small>会面开始</small><p>{session.entry.world.openingScene.narrative}</p><LocalSpeech accountScope={accountScope} text={session.entry.world.openingScene.narrative} /></>}</div>
      {session.turns.map((turn, index) => <article className="studio-chat-turn" key={index}>
        <div className="studio-chat-user" aria-label="你发送的消息"><p>{turn.action}</p></div>
        <div className="conversation-response">
        {turn.response.narrative.trim() && <div className="conversation-narrative">{turn.response.narrative.split(/\n\s*\n/).filter(part => part.trim()).map((part, paragraph) => <p key={paragraph}>{part}</p>)}</div>}
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
        {!!session.turns.at(-1)?.response.nextChoices.length && <details className="conversation-ideas"><summary>接下来怎么回应？</summary><div className="studio-chat-suggestions">{session.turns.at(-1)?.response.nextChoices.map((choice) => <button className="studio-filter" key={choice.id} type="button" disabled={busy} onClick={() => { editInput(choice.label); document.getElementById('chat-input')?.focus(); }}>{choice.label}</button>)}</div></details>}
        <label className="sr-only" htmlFor="chat-input">说一句话，或描述你的动作</label>
        <div className="conversation-input"><MessageTextarea id="chat-input" value={input} onChange={(event) => editInput(event.target.value)} placeholder={`对${target.name}说一句话，或描述你的动作…`} disabled={busy} maxLength={3000} /><Button className="studio-button" type="submit" aria-label={busy ? '正在回应' : '发送'} disabled={busy || !input.trim()}>{busy ? <LoaderCircle className="spin" /> : <Send />}</Button></div>
        {error && <p role="alert">{error}</p>}
        <small className="conversation-input-hint">Enter 发送 · Shift + Enter 换行</small>
      </form>
    </div><aside className="conversation-profile" aria-label="人物资料"><img src={session.entry.portraits[target.id] || session.entry.cover} alt={target.name} />{profile}{sceneTools}</aside></div>
  </div>;
}
