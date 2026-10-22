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
import { cacheSceneImage, getCachedSceneImage, makeContentImageKey } from '@/lib/image-cache';
import { commitTurn, createInitialWorldState, turnMemoryText } from '@/lib/world-state';
import { chatRequest, directConversationEntry, restoreConversationOpening } from '@/lib/studio-session';
import type { ChatSession } from '@/lib/studio-session';
import type { StudioWorld } from '@/lib/studio-worlds';
import type { PlayerPersona } from '@/lib/player-persona';
import { characterGreeting } from '@/lib/character-greeting';
import { characterPublicIntroduction, initialConversationSuggestions } from '@/lib/character-presentation';
import { useRecordPlay } from '@/components/play-counts';

function characterPhotoPrompt(requested: string | undefined, target: { name: string; imagePrompt: string; persona: string; characterProfile?: { lifeContext: string; traits: string } }, worldBackground?: string): string {
  const profile = target.characterProfile;
  const profileHint = profile ? [profile.lifeContext, profile.traits].filter(Boolean).join('；').slice(0, 700) : '';
  return [
    '虚构角色主动发来的一张自拍/生活照片，单人，半身或近景，自然光，写实摄影，真实皮肤纹理，干净构图。',
    '画面中不要出现文字、水印、logo、边框、多人；不要生成用户、其他角色或真实公众人物。',
    `角色：${target.name}`,
    target.imagePrompt.trim() ? `固定外观：${target.imagePrompt}` : '',
    target.persona.trim() ? `性格与气质：${target.persona}` : '',
    profileHint ? `角色背景参考：${profileHint}` : '',
    worldBackground?.trim() ? `所处世界：${worldBackground.trim().slice(0, 500)}` : '',
    requested?.trim() ? `这次照片的内容：${requested.trim()}` : '',
    '只画这个角色本人，构图和动作自然，像角色主动拍下或发来的照片。',
  ].filter(Boolean).join('\n').slice(0, 4000);
}

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

export function CharacterChat({ initial, accountScope, onSave, onBack, preview = false }: { initial: ChatSession; accountScope: string; onSave: (session: ChatSession) => void; onBack: () => void; preview?: boolean }) {
  const remoteAIAdapter = useMemo(() => createRemoteAIAdapter(accountScope), [accountScope]);
  const [session, setSession] = useState(() => restoreConversationOpening(initial));
  useRecordPlay(!preview && session.turns.length ? `character:${session.entry.id}:${session.targetCharacterId}` : null, accountScope);
  const [input, setInput] = useState(initial.draftInput ?? '');
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState('');
  const [image, setImage] = useState(initial.entry.cover);
  const [imageState, setImageState] = useState('');
  const controller = useRef<AbortController | null>(null);
  const imageController = useRef<AbortController | null>(null);
  const turnImageController = useRef<AbortController | null>(null);
  const [turnImageStates, setTurnImageStates] = useState<Record<number, 'generating' | 'error'>>({});
  const [turnImageErrors, setTurnImageErrors] = useState<Record<number, string>>({});
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
  const background = characterPublicIntroduction(target);
  const place = session.entry.world.locations.find(item => item.id === target.startLocationId);
  const profile = <><h2>{target.name}</h2><p className="conversation-identity">{identity}</p>
    {background && <section><h3>他是谁</h3><p>{background}</p></section>}
    <section><h3>初见时的场景 · {place?.name}</h3><p>{place?.description || '你们在这里开始交谈。'}</p></section>
    <section><h3>这段对话</h3><p>你正在与{target.name}交谈，不是扮演{target.name}。你发送的是对话，不需要先声明要做什么；不会触发世界行动判定。</p></section>
    <section><h3>角色照片</h3><p>{target.name}偶尔会主动发来一张自己的照片；照片由 AI 生成，会消耗生图额度。</p></section>
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
    return () => { live = false; controller.current?.abort(); imageController.current?.abort(); turnImageController.current?.abort(); };
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
      const result = await generateSceneImage({ requestId: current.state.turn, sceneId: `chat-${current.state.turn}`, prompt: normalizedPrompt, seed: 690510, purpose: 'scene' }, aborter.signal, accountScope);
      if (aborter.signal.aborted) return;
      const cached = await cacheSceneImage(key, result.assetUrl, accountScope).catch(() => false);
      if (aborter.signal.aborted) return;
      setImage(result.assetUrl); setImageState(cached ? '场景图已生成 · 本地已保存' : '场景图已生成 · 本地图片保存失败');
      const next = { ...sessionRef.current, imageCacheKey: cached ? key : undefined };
      sessionRef.current = next; setSession(next); saveRef.current(next);
    } catch { if (!aborter.signal.aborted) setImageState('场景图生成失败，保留上一张图片，可重试'); }
  }

  async function makeTurnImage(requested: string, current: ChatSession, index: number) {
    const photoTarget = current.entry.world.characters.find(role => role.id === current.targetCharacterId);
    if (!photoTarget) return;
    const prompt = characterPhotoPrompt(requested, photoTarget, current.entry.world.worldBackground);
    turnImageController.current?.abort();
    const aborter = new AbortController(); turnImageController.current = aborter;
    setTurnImageStates(previous => ({ ...previous, [index]: 'generating' }));
    setTurnImageErrors(previous => { const next = { ...previous }; delete next[index]; return next; });
    const key = makeContentImageKey('portrait', current.entry.world, current.playerRoleId, current.targetCharacterId, prompt);
    try {
      let url = await getCachedSceneImage(key, accountScope).catch(() => null);
      if (aborter.signal.aborted) return;
      if (!url) {
        const result = await generateSceneImage({
          purpose: 'portrait', requestId: current.state.turn, sceneId: `chat-character-photo-${index}`,
          prompt, seed: Math.floor(Math.random() * 1_000_000_000),
        }, aborter.signal, accountScope);
        if (aborter.signal.aborted) return;
        url = result.assetUrl;
        await cacheSceneImage(key, url, accountScope).catch(() => false);
      }
      if (aborter.signal.aborted) return;
      setSession(currentSession => {
        const turns = currentSession.turns.map((turn, turnIndex) => turnIndex === index ? { ...turn, image: { url: url!, kind: 'character' as const, prompt } } : turn);
        const next = { ...currentSession, turns };
        sessionRef.current = next; saveRef.current(next); return next;
      });
      setTurnImageStates(previous => { const next = { ...previous }; delete next[index]; return next; });
      setTurnImageErrors(previous => { const next = { ...previous }; delete next[index]; return next; });
    } catch (cause) {
      if (!aborter.signal.aborted) {
        setTurnImageStates(previous => ({ ...previous, [index]: 'error' }));
        setTurnImageErrors(previous => ({ ...previous, [index]: cause instanceof Error && cause.message ? cause.message : '照片生成失败，文字回复已保留。' }));
      }
    } finally {
      if (turnImageController.current === aborter) turnImageController.current = null;
    }
  }

  async function send(action = input) {
    if (!action.trim() || busy || controller.current) return;
    setBusy(true); setError('');
    const aborter = new AbortController(); controller.current = aborter;
    try {
      setStreamText('');
      const response = await remoteAIAdapter.advanceWorld(chatRequest(sessionRef.current, action.trim()), aborter.signal, chunk => {
        if (chunk.text?.trim()) setStreamText(chunk.text);
      });
      if (aborter.signal.aborted) return;
      const patch = response.statePatch;
      const world = session.entry.world;
      const state = commitTurn(sessionRef.current.state, { ...patch, action: action.trim(), result: turnMemoryText(response, world, session.playerRoleId), clue: '',
        nextLocation: world.locations.find((place) => place.id === patch.locationId)?.name || sessionRef.current.state.location,
        relationshipDelta: patch.relationshipDeltas?.[target.id] ?? 0, reachedEndingId: response.ending.reached ? response.ending.endingId : undefined });
      const next = { ...sessionRef.current, state, draftInput: '', narrative: response.narrative, turns: [...sessionRef.current.turns, { action: action.trim(), response }], savedAt: Date.now() };
      setStreamText('');
      sessionRef.current = next; setSession(next); onSave(next); setInput('');
      // The model may ask to share a photo of the character; scene art stays manual.
      if (response.image.required && response.image.reason === 'character_photo') {
        const previous = sessionRef.current.turns.at(-2);
        if (previous?.image?.kind !== 'character') void makeTurnImage(response.image.prompt ?? '', next, next.turns.length - 1);
      }
    } catch (cause) { if (!aborter.signal.aborted) setError(cause instanceof Error ? cause.message : '网络连接失败，你的输入和进度已保留，可以重试。'); }
    finally { setStreamText(''); if (!aborter.signal.aborted) { setBusy(false); controller.current = null; } }
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
        {turn.image && <figure className="conversation-character-photo"><img src={turn.image.url} alt={`${target.name}发来的照片`} /><figcaption>{target.name}发来一张照片 · AI 生成</figcaption></figure>}
        {!turn.image && turnImageStates[index] === 'generating' && <output className="conversation-photo-status"><LoaderCircle className="is-spinning" />{target.name}正在准备一张照片…</output>}
        {!turn.image && turnImageStates[index] === 'error' && <div className="conversation-photo-status"><span>{turnImageErrors[index] || '照片生成失败，文字回复已保留。'}</span><button type="button" className="flow-control" onClick={() => void makeTurnImage(turn.response.image.prompt ?? '', sessionRef.current, index)}>重新生成照片</button></div>}
        <SpeechSequence accountScope={accountScope} segments={speechSegments(turn.response.narrative, turn.response.dialogue.filter(line => line.visibleToRoleIds.includes(player.id) && line.characterId !== player.id))} />
        </div>
        {turn.response.ending.reached && <p className="studio-chat-ending">已抵达阶段结局。可以返回结束，也可以继续聊，已有事实不会重置。</p>}
      </article>)}
      {busy && streamText.trim() && <article className="conversation-stream" aria-live="polite"><p>{streamText.trim()}</p><small>{target.name}正在继续…</small></article>}
      {busy && <p className="conversation-wait"><LoaderCircle className="spin" />{streamText.trim() ? `${target.name}正在继续…` : `${target.name}正在回应…`}</p>}
      <div ref={endRef} />
    </section>
      <form className="conversation-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        {unread && <button type="button" className="flow-control" onClick={() => { followLatest.current = true; setUnread(false); endRef.current?.scrollIntoView({ block: 'nearest' }); }}>查看新回复 ↓</button>}
        {!session.turns.length && initialConversationSuggestions(session.greeting).length > 0 && <section className="conversation-ideas" aria-label="初次回应建议"><small>不知道怎么接？可以借用一句，也可以自己写。点击后仍可修改。</small><div className="studio-chat-suggestions">{initialConversationSuggestions(session.greeting).map(label => <button className="studio-filter" key={label} type="button" disabled={busy} onClick={() => { editInput(label); document.getElementById('chat-input')?.focus(); }}>{label}</button>)}</div></section>}
        {!!session.turns.at(-1)?.response.nextChoices.length && <details className="conversation-ideas"><summary>接下来怎么回应？</summary><div className="studio-chat-suggestions">{session.turns.at(-1)?.response.nextChoices.map((choice) => <button className="studio-filter" key={choice.id} type="button" disabled={busy} onClick={() => { editInput(choice.label); document.getElementById('chat-input')?.focus(); }}>{choice.label}</button>)}</div></details>}
        <label className="sr-only" htmlFor="chat-input">对角色说一句话</label>
        <div className="conversation-input"><MessageTextarea id="chat-input" value={input} onChange={(event) => editInput(event.target.value)} placeholder={`对${target.name}说一句话…`} disabled={busy} maxLength={3000} /><Button className="studio-button" type="submit" aria-label={busy ? '正在回应' : '发送'} disabled={busy || !input.trim()}>{busy ? <LoaderCircle className="spin" /> : <Send />}</Button></div>
        {error && <p role="alert">{error}</p>}
        <small className="conversation-input-hint">Enter 发送 · Shift + Enter 换行</small>
      </form>
    </div><aside className="conversation-profile" aria-label="人物资料"><img src={session.entry.portraits[target.id] || session.entry.cover} alt={target.name} />{profile}{sceneTools}</aside></div>
  </div>;
}
