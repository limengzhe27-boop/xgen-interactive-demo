'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Play, Pause, RotateCcw } from 'lucide-react';
import { prologueDuration, prologueShotAt, type WorldPrologue } from '@/lib/world-prologue';

export function WorldProloguePlayer({ title, prologue, onBack, onContinue, continuation }: {
  title: string; prologue: WorldPrologue; onBack: () => void; onContinue: () => void; continuation?: import('react').ReactNode;
}) {
  const [playing, setPlaying] = useState(Boolean(prologue.video));
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<HTMLVideoElement>(null);
  const hasVideo = Boolean(prologue.video);
  const [choosing,setChoosing]=useState(!hasVideo);
  const duration = prologueDuration(prologue);
  const index = prologueShotAt(prologue, elapsed);
  const shot = prologue.shots[index];
  const message = prologue.message && elapsed >= prologue.message.at && elapsed < prologue.message.until ? prologue.message : undefined;
  useEffect(() => {
    if (!ref.current || !hasVideo) return;
    if (playing) void ref.current.play().catch(() => setPlaying(false));
    else ref.current.pause();
  }, [playing, hasVideo]);
  useEffect(() => {
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  function advance() {
    ref.current?.pause(); setPlaying(false); setEnded(true); setElapsed(duration);
    setChoosing(true);
  }
  function toggle() {
    if (ended) { setElapsed(0); setEnded(false); if (ref.current) ref.current.currentTime = 0; }
    setPlaying(ended || !playing);
  }
  return <section className="flow-page prologue-page cinema-page" data-choosing={choosing && Boolean(continuation)} data-has-video={hasVideo}>
    <header className="flow-toolbar"><button className="flow-control" onClick={onBack}><ArrowLeft />返回</button><h1>{title}</h1><p>{hasVideo ? `${duration} 秒序章 · 无声字幕版` : '故事前情'}</p></header>
    <div className="prologue-stage"><div className="prologue-film"><div className="prologue-screen">
      {hasVideo ? <video ref={ref} src={prologue.video} poster={prologue.shots[0].poster} muted autoPlay playsInline preload="metadata"
        aria-label={`${title}，序章第 ${index + 1} 段`} onEnded={advance} onError={() => { setError(true); setPlaying(false); }}
        onTimeUpdate={() => { const t = ref.current?.currentTime || 0; setElapsed(Math.min(t,duration)); if(t >= duration) advance(); }} />
        : <img src={shot.poster} alt={`${title}，世界封面`} />}
      {hasVideo && !error && message && <aside className="prologue-message" aria-label="剧情中的手机消息"><strong>{message.sender}</strong><p>{message.text}</p></aside>}
      {hasVideo && !playing && !ended && !error && <button className="prologue-play" onClick={toggle} aria-label="播放序章"><Play /></button>}
    </div>
    {hasVideo && <div className="prologue-controls"><button className="flow-control" onClick={toggle} disabled={error}>{ended ? <RotateCcw /> : playing ? <Pause /> : <Play />}{ended ? '重看' : playing ? '暂停' : '播放'}</button><progress max={duration} value={elapsed} aria-label="序章播放进度" /><span>{Math.floor(elapsed)} / {duration} 秒</span></div>}
    {error && <p role="status">视频暂时无法播放，可以阅读前情后继续选角。</p>}
    <div className="prologue-caption" aria-live="polite">{hasVideo && !error ? shot.caption : prologue.shots.map(s => <p key={s.caption}>{s.caption}</p>)}</div>
    {(!choosing || !continuation) && <footer className="prologue-next"><p>{prologue.handoff}</p><button className="primary-action" onClick={()=>{if(continuation){ref.current?.pause();setPlaying(false);setChoosing(true);}else onContinue();}}>选择角色继续 <ArrowRight /></button></footer>}
    </div>{choosing && continuation && <section className="prologue-entry-panel" aria-label="选择入场身份">{continuation}<details className="prologue-mobile-transcript"><summary>查看前情与当前处境</summary>{prologue.shots.map(s => <p key={s.caption}>{s.caption}</p>)}<p>{prologue.handoff}</p></details></section>}</div>
  </section>;
}
