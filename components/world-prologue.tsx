'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Play, Pause, RotateCcw } from 'lucide-react';
import { prologueDuration, prologueShotAt, type WorldPrologue } from '@/lib/world-prologue';

export function WorldProloguePlayer({ title, prologue, onBack, onContinue }: {
  title: string; prologue: WorldPrologue; onBack: () => void; onContinue: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<HTMLVideoElement>(null);
  const hasVideo = Boolean(prologue.video);
  const duration = prologueDuration(prologue);
  const index = prologueShotAt(prologue, elapsed);
  const shot = prologue.shots[index];
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
  }
  function toggle() {
    if (ended) { setElapsed(0); setEnded(false); if (ref.current) ref.current.currentTime = 0; }
    setPlaying(ended || !playing);
  }
  return <section className="flow-page prologue-page">
    <header className="flow-toolbar"><button className="flow-control" onClick={onBack}><ArrowLeft />返回</button><p>序章 → 选择角色 → 开始探索</p></header>
    <p className="flow-kicker">{hasVideo ? `${duration} 秒序章 · 字幕版` : '故事前情'}</p>
    <h1>{title}</h1>
    <div className="prologue-screen">
      {hasVideo ? <video ref={ref} src={prologue.video} poster={prologue.shots[0].poster} muted playsInline preload="metadata"
        aria-label={`${title}，序章第 ${index + 1} 段`} onEnded={advance} onError={() => { setError(true); setPlaying(false); }}
        onTimeUpdate={() => { const t = ref.current?.currentTime || 0; setElapsed(Math.min(t,duration)); if(t >= duration) advance(); }} />
        : <img src={shot.poster} alt={`${title}，世界封面`} />}
      {hasVideo && !playing && !error && <button className="prologue-play" onClick={toggle} aria-label={ended ? '重看序章' : '播放序章'}>{ended ? <RotateCcw /> : <Play />}</button>}
    </div>
    {hasVideo && <div className="prologue-controls"><button className="flow-control" onClick={toggle} disabled={error}>{ended ? <RotateCcw /> : playing ? <Pause /> : <Play />}{ended ? '重看' : playing ? '暂停' : '播放'}</button><progress max={duration} value={elapsed} aria-label="序章播放进度" /><span>{Math.floor(elapsed)} / {duration} 秒</span></div>}
    {error && <p role="status">视频暂时无法播放，可以阅读前情后继续选角。</p>}
    <div className="prologue-caption" aria-live="polite">{hasVideo && !error ? shot.caption : prologue.shots.map(s => <p key={s.caption}>{s.caption}</p>)}</div>
    <footer className="prologue-next"><p>{prologue.handoff}</p><button className="primary-action" onClick={onContinue}>选择角色继续 <ArrowRight /></button></footer>
    {hasVideo && <details className="prologue-transcript"><summary>查看完整前情文字</summary>{prologue.shots.map(s => <p key={s.caption}>{s.caption}</p>)}</details>}
  </section>;
}
