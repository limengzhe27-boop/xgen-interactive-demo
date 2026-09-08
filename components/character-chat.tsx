'use client';
/* oxlint-disable next/no-img-element -- generated portrait and scene assets */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, RefreshCw, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageTextarea } from '@/components/message-textarea';
import { LocalSpeech } from '@/components/local-speech';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { createRemoteAIAdapter } from '@/lib/remote-ai-adapter';
import { generateSceneImage } from '@/lib/remote-image-service';
import { shouldGenerateImage } from '@/lib/image-policy';
import { cacheSceneImage, getCachedSceneImage, makeContentImageKey } from '@/lib/image-cache';
import { commitTurn, createInitialWorldState, selectRoleGoal } from '@/lib/world-state';
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
  const player = session.entry.world.characters.find((role) => role.id === session.playerRoleId)!;
  const target = session.entry.world.characters.find((role) => role.id === session.targetCharacterId)!;

  useEffect(() => {
    let live = true;
    if (initial.imageCacheKey) void getCachedSceneImage(initial.imageCacheKey, accountScope).then((url) => { if (live && url) setImage(url); }).catch(() => {});
    return () => { live = false; controller.current?.abort(); imageController.current?.abort(); };
  }, [initial.id, initial.imageCacheKey, accountScope]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' }); }, [session.turns.length]);

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
      const state = commitTurn(sessionRef.current.state, { ...patch, action: action.trim(), result: response.narrative, clue: '',
        nextLocation: world.locations.find((place) => place.id === patch.locationId)?.name || sessionRef.current.state.location,
        relationshipDelta: patch.relationshipDeltas?.[target.id] ?? 0, reachedEndingId: response.ending.reached ? response.ending.endingId : undefined });
      const next = { ...sessionRef.current, state, narrative: response.narrative, turns: [...sessionRef.current.turns, { action: action.trim(), response }], savedAt: Date.now() };
      sessionRef.current = next; setSession(next); onSave(next); setInput('');
      if (response.image.prompt && shouldGenerateImage(response.image, state.turn, lastImageAttemptTurn.current, true)) void makeImage(response.image.prompt, next);
    } catch { if (!aborter.signal.aborted) setError('真实模型暂时没有返回有效回应。你的输入和进度已保留，可以重试。'); }
    finally { if (!aborter.signal.aborted) { setBusy(false); controller.current = null; } }
  }

  return <div className="flow-page meeting-chat"><Sheet>
    <header className="flow-toolbar"><button className="flow-control" onClick={onBack} type="button"><ArrowLeft />返回</button><span>独立会面</span><SheetTrigger className="flow-control">会面资料</SheetTrigger></header>
    <SheetContent className="flow-drawer" showCloseButton={false}><div className="flow-drawer-heading"><SheetTitle>会面资料</SheetTitle><SheetClose className="flow-control" aria-label="关闭会面资料"><X /></SheetClose></div><SheetDescription>{session.entry.title} · 这份会面不改变已有探索。</SheetDescription><p>你是 {player.name} · {player.identity}</p><p>目标：{selectRoleGoal(session.entry.world, player.id)?.title || player.goal}</p>{session.entry.world.entryAdmission && <p>额外能力：{session.entry.world.entryAdmission.grantedAbilities.join('；') || '仅剧情身份原有能力'}</p>}<img className="meeting-scene" src={image} alt="当前会面参考插图" /><p>{session.state.location}</p><small>{imageState || session.entry.artNote || '普通对话复用画面，关键变化时更新。'}</small><button className="flow-control" type="button" onClick={() => void makeImage(`${session.entry.world.title}。${session.narrative}。${target.imagePrompt}。电影感场景，无文字，无水印。`, session)} disabled={busy || imageState.startsWith('正在')}><RefreshCw />{imageState.includes('失败') ? '重试场景图' : '生成场景图（可选）'}</button><p>手动生成会调用生图服务并产生费用，打开资料不会生成图片。</p></SheetContent>
    <div className="flow-reading">
    <header className="studio-chat-heading"><img src={session.entry.portraits[target.id] || session.entry.cover} alt={target.name} /><div><small>{session.entry.title}</small><h1>与 {target.name} 的对话</h1><p>{player.id.startsWith('chat-visitor') ? target.identity : `你是 ${player.name} · ${player.identity}`}</p></div></header>
    <section className="studio-chat-reading" aria-label="对话记录">
      <p className="studio-chat-prologue">{session.entry.world.openingScene.narrative}</p>
      <LocalSpeech accountScope={accountScope} text={session.entry.world.openingScene.narrative} />
      {session.turns.map((turn, index) => <article className="studio-chat-turn" key={index}>
        <div className="studio-chat-user"><small>{player.name} · 你</small><p>{turn.action}</p></div>
        <div className="studio-chat-narrative"><small>世界回应 · 第 {index + 1} 轮</small><p>{turn.response.narrative}</p></div>
        <LocalSpeech accountScope={accountScope} text={turn.response.dialogue.filter(line => line.characterId === target.id && line.visibleToRoleIds.includes(player.id)).map(line => line.text).join('\n')} speaker={`${session.entry.id}:${target.id}`} />
        {turn.response.dialogue.filter((line) => line.visibleToRoleIds.includes(player.id) && line.characterId !== player.id).map((line, i) => <div className="studio-chat-line" key={i}><strong>{session.entry.world.characters.find((role) => role.id === line.characterId)?.name}</strong><p>{line.text}</p></div>)}
        {turn.response.ending.reached && <p className="studio-chat-ending">已抵达阶段结局。可以返回结束，也可以继续聊，已有事实不会重置。</p>}
      </article>)}
      <div ref={endRef} />
      <form className="studio-chat-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <label htmlFor="chat-input">{player.id.startsWith('chat-visitor') ? '直接和 TA 聊聊' : `以 ${player.name} 的身份说话或行动`} · Enter 发送，Shift + Enter 换行</label>
        <MessageTextarea id="chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder={`你想对${target.name}说什么？`} disabled={busy} maxLength={3000} />
        {error && <p role="alert">{error}</p>}
        <Button className="studio-button" type="submit" disabled={busy || !input.trim()}>{busy ? <><LoaderCircle className="spin" />正在回应</> : <><Send />发送</>}</Button>
      </form>
      {!!session.turns.at(-1)?.response.nextChoices.length && <details className="flow-disclosure"><summary>给我一点对话灵感</summary><div className="studio-chat-suggestions">{session.turns.at(-1)?.response.nextChoices.map((choice) => <button className="studio-filter" key={choice.id} type="button" disabled={busy} onClick={() => { setInput(choice.label); document.getElementById('chat-input')?.focus(); }}>{choice.label}</button>)}</div></details>}
    </section></div></Sheet>
  </div>;
}
