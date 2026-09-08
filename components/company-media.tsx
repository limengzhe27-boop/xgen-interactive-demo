'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Film, Volume2, LoaderCircle, Pause } from 'lucide-react';
import { SPEECH_MAX_CHARS, SPEECH_VOICES, type MediaKind } from '@/lib/media-policy';
type Result = { id:string; status:string; assetUrl?:string };
type MediaProps = { kind:MediaKind; text:string; accountScope:string; speaker?:string };
export function CompanyMedia(props:MediaProps) {
  return <MediaVoice key={JSON.stringify(props)} {...props}/>;
}
function MediaVoice({speaker='narrator',...props}:MediaProps) {
  const hash=Array.from(speaker).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
  const voice=SPEECH_VOICES[hash%SPEECH_VOICES.length].id;
  return <MediaRequest key={voice} {...props} voice={voice}/>;
}
function MediaRequest({kind,text,accountScope,voice}:MediaProps & {voice:string}) {
  const [result,setResult] = useState<Result|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [key,setKey] = useState('');
  const [consent,setConsent] = useState(false);
  const [playing,setPlaying] = useState(false);
  const locked = useRef(false);
  const generation = useRef(0);
  const media = useRef<HTMLMediaElement|null>(null);
  const requests = useRef(new Set<AbortController>());
  const valid = text.trim().length > 0 && text.length <= (kind === 'speech' ? SPEECH_MAX_CHARS : 2000);
  useEffect(() => {
    const version = ++generation.current;
    const pending=requests.current;
    void crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([kind,text,voice]))).then(hash => {
      if (version !== generation.current) return;
      const cacheKey = `xgen-media-v1:${accountScope}:${Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('')}`;
      setKey(cacheKey);
      try { const saved = JSON.parse(localStorage.getItem(cacheKey)||'null'); if (/^[a-f0-9]{64}$/.test(saved?.id)) setResult({id:saved.id,status:'saved'}); } catch { /* optional local index */ }
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- This is a request epoch, not a DOM ref; invalidate late results on unmount.
    return () => { ++generation.current; media.current?.pause(); for(const controller of pending)controller.abort();pending.clear(); };
  },[kind,text,voice,accountScope]);
  useEffect(() => { const stop=()=>media.current?.pause(); window.addEventListener('xgen-speech-stop',stop); return()=>window.removeEventListener('xgen-speech-stop',stop); },[]);
  async function run() {
    if (locked.current || !key || !valid || (kind === 'video' && !result && !consent)) return;
    locked.current = true;
    const version=generation.current; const controller=new AbortController(); requests.current.add(controller);
    setBusy(true); setError('');
    try {
      const headers = { 'Content-Type':'application/json','x-xgen-account':accountScope };
      let response:Response;
      if (result) response=await fetch(`/api/media?id=${result.id}`,{headers,signal:controller.signal,cache:'no-store'});
      else {
        const status=await fetch('/api/media',{headers,signal:controller.signal,cache:'no-store'});
        if (!status.ok || !(await status.json() as {configured?:boolean}).configured) throw new Error('公司音视频服务暂不可用，未提交生成。');
        response=await fetch('/api/media',{method:'POST',headers,body:JSON.stringify({kind,text,voice,confirmed:true}),signal:controller.signal});
      }
      const value=await response.json() as Result & {error?:string};
      if (!response.ok) throw new Error(value.error==='daily_limit'?'今日体验额度已用完，请明天再试。':'服务暂未返回结果。重试只查询或复用原任务，不自动重新计费。');
      if (!/^[a-f0-9]{64}$/.test(value.id) || !['ready','queued','reserved','failed'].includes(value.status) || (value.status==='ready' && value.assetUrl!==`/api/media/asset/${value.id}`)) throw new Error('返回格式异常，请稍后查看。');
      if (version !== generation.current) return;
      setResult(value);
      try { localStorage.setItem(key,JSON.stringify({id:value.id})); } catch { /* server still deduplicates */ }
      if (kind === 'speech' && value.status === 'ready' && value.assetUrl) await playSpeech(value.assetUrl);
    } catch(e) { if (version===generation.current && !controller.signal.aborted) setError(e instanceof Error?e.message:'请求失败'); }
    finally { locked.current=false; requests.current.delete(controller);if(version===generation.current)setBusy(false); }
  }
  async function playSpeech(url:string) {
    const audio=media.current;
    if (!audio) return;
    window.dispatchEvent(new Event('xgen-speech-stop'));
    if (audio.getAttribute('src') !== url) audio.src=url;
    try { await audio.play(); }
    catch { setError('浏览器未能开始播放，请再点一次朗读。'); }
  }
  function listen() {
    setError('');
    if (playing) { media.current?.pause(); return; }
    if (result?.status === 'ready' && result.assetUrl) void playSpeech(result.assetUrl);
    else void run();
  }
  const statusText=result?.status==='queued'?'短片已排队。稍后点击查看进度，离开页面不会重复生成。':result?.status==='reserved'?'任务已提交，但结果尚未确认；不会自动重扣费用。':result?.status==='failed'?'网关生成失败。该任务不会自动重试或切换昂贵模型。':'';
  const transcript='data:text/vtt;charset=utf-8,'+encodeURIComponent(`WEBVTT\n\n00:00:00.000 --> 00:10:00.000\n${text.replace(/[<>]/g,'').replace(/\n{2,}/g,'\n')}\n`);
  const attachMedia=useCallback((node:HTMLMediaElement|null)=>{if(media.current&&media.current!==node)media.current.pause();media.current=node;},[]);
  if (kind === 'speech') return <div className="company-media">
    <button type="button" className="flow-control" onClick={listen} disabled={busy || !key || !valid || result?.status==='failed'} title="点击后由公司语音服务朗读，生成结果私人缓存复用" aria-label={playing?'暂停朗读':'听这段内容'}>
      {busy?<LoaderCircle className="is-spinning"/>:playing?<Pause/>:<Volume2/>}
      {busy?'正在准备语音…':playing?'暂停朗读':result?.status==='reserved'||result?.status==='queued'?'查看语音进度':'听这段内容'}
    </button>
    <audio ref={attachMedia} preload="none" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>{setPlaying(false);setError('语音加载失败，请再点一次朗读。');}}><track kind="captions" src={transcript} label="朗读原文" srcLang="zh"/></audio>
    {!valid&&<p role="status">这段内容超过 {SPEECH_MAX_CHARS} 字，暂不支持整段朗读。</p>}
    {statusText&&<p role="status">{statusText}</p>}{error&&<p role="alert">{error}</p>}
  </div>;
  return <details className="company-media flow-disclosure"><summary><Film/>把这一幕生成短片</summary>
    <p>生成 5 秒 AI 短片，仅使用本幕文字，不改动剧情进度。人物外观可能与场景图不同。首次生成消耗公司额度，已保存的结果直接复用。</p>
    {!valid && <output>这段内容超过单次 2000 字上限，暂不生成，以控制费用。</output>}
    {!result && <label className="company-media-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>将这段剧情交给公司网关及模型供应商生成，并保存在我的私人云空间。</span></label>}
    {result?.status==='ready' ? <video ref={attachMedia} controls playsInline preload="none" src={result.assetUrl} aria-label="AI 生成的剧情短片"><track kind="captions" src={transcript} label="本幕文字" srcLang="zh"/></video>:<button type="button" className="flow-control" onClick={()=>void run()} disabled={busy||!key||!valid||(!result&&!consent)||result?.status==='failed'}>{busy?<LoaderCircle className="is-spinning"/>:null}{busy?'正在处理…':result?'查看进度 / 已有结果':'确认生成 5 秒短片'}</button>}
    {statusText&&<output>{statusText}</output>}{error&&<p role="alert">{error}</p>}
  </details>;
}
