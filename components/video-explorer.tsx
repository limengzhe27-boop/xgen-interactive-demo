'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Pause, Play, Send } from 'lucide-react';
import type { StudioWorld } from '@/lib/studio-worlds';
import type { WorldState } from '@/lib/world-state';
import type { WorldTurnResponse } from '@/lib/ai-contracts';
import type { FalVideoInput } from '@/lib/fal-video';
import { createRemoteAIAdapter } from '@/lib/remote-ai-adapter';
import { worldPrologue } from '@/lib/world-prologue';
import { commitVideoTurn, initialVideoRole, threeChoices, videoErrors, videoMotionPrompt, videoTurnRequest, type VideoChoice } from '@/lib/video-exploration';

type Pending={input:FalVideoInput;response:WorldTurnResponse;action:string;id?:string;assetUrl?:string};
type Session={version:1;id:string;roleId:string;state:WorldState|null;narrative:string;choices:VideoChoice[];clip:string;rounds:number;pending?:Pending;finished?:boolean;clips?:{url:string;action:string}[]};
type Phase='intro'|'roles'|'choices'|'planning'|'generating'|'ready'|'playing'|'error';
type MediaReply={id?:string;status:string;error?:string;assetUrl?:string};
export function VideoExplorer({entry,onBack,onText}:{entry:StudioWorld;onBack?:()=>void;onText?:()=>void}){
  const prologue=worldPrologue(entry.id,entry.premise,entry.cover);
  const [session,setSession]=useState<Session>({version:1,id:'',roleId:'',state:null,narrative:entry.premise,choices:[],clip:prologue.video??'',rounds:0});
  const current=useRef(session);
  useEffect(()=>{current.current=session;},[session]);
  const [phase,setPhase]=useState<Phase>('intro'),[scope,setScope]=useState<string|null>(null),[configured,setConfigured]=useState(false);
  const [enabled,setEnabled]=useState(false),[paused,setPaused]=useState(false),[seconds,setSeconds]=useState(15),[text,setText]=useState(''),[focused,setFocused]=useState(false);
  const [visible,setVisible]=useState(true),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [saveError,setSaveError]=useState(''),[waitSeconds,setWaitSeconds]=useState(0);
  const embedded=Boolean(onBack);
  useEffect(()=>{
    if(!embedded)return;
    const url=new URL(window.location.href);url.searchParams.set('world',entry.id);url.searchParams.set('mode','video');
    window.history.replaceState(window.history.state,'',url);
    return()=>{
      const next=new URL(window.location.href);
      if(next.searchParams.get('world')===entry.id&&next.searchParams.get('mode')==='video'){
        next.searchParams.delete('world');next.searchParams.delete('mode');
        window.history.replaceState(window.history.state,'',next);
      }
    };
  },[entry.id,embedded]);
  useEffect(()=>{
    if(phase!=='planning'&&phase!=='generating')return;
    const start=Date.now();const timer=setInterval(()=>setWaitSeconds(Math.floor((Date.now()-start)/1000)),1000);
    return()=>clearInterval(timer);
  },[phase]);
  const player=useRef<HTMLVideoElement>(null),frame=useRef<string|null>(null),busy=useRef(false),alive=useRef(true),controller=useRef<AbortController|null>(null);
  const layout=useRef<HTMLElement>(null),heading=useRef<HTMLElement>(null),controls=useRef<HTMLElement>(null);
  useEffect(()=>{
    const resize=()=>{
      if(!layout.current||!heading.current||!controls.current)return;
      const style=getComputedStyle(layout.current);
      const available=window.innerHeight-heading.current.offsetHeight-controls.current.offsetHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-24;
      layout.current.style.setProperty('--stage-height',`${Math.max(160,available)}px`);
    };
    const observer=new ResizeObserver(resize);
    if(heading.current)observer.observe(heading.current);
    if(controls.current)observer.observe(controls.current);
    resize();window.addEventListener('resize',resize);
    return()=>{observer.disconnect();window.removeEventListener('resize',resize);};
  },[]);
  const storageKey=scope?`xgen:video-pilot:v2:${scope}:${entry.id}`:null;
  const save=(next:Session)=>{current.current=next;setSession(next);if(storageKey)try{sessionStorage.setItem(storageKey,JSON.stringify(next));setSaveError('');}catch{setSaveError('浏览器未能保存本次进度，请暂勿刷新或关闭此标签页。已生成的视频未被删除。');}};
  useEffect(()=>{
    alive.current=true;const stop=new AbortController();
    void(async()=>{
      try{
        const a=await fetch('/api/account',{cache:'no-store',signal:stop.signal});if(!a.ok)throw Error('登录状态暂时无法验证');
        const account=await a.json() as {user?:{id:string}|null};const id=account.user?.id??'guest';
        if(stop.signal.aborted)return;
        setScope(id);
        let restored:Session|null=null;
        try{const candidate=JSON.parse(sessionStorage.getItem(`xgen:video-pilot:v2:${id}:${entry.id}`)??'null');
          if(candidate?.version===1&&typeof candidate.id==='string'&&candidate.state&&entry.world.characters.some(c=>c.id===candidate.roleId)&&Array.isArray(candidate.choices)
            &&typeof candidate.clip==='string'&&(candidate.clip.startsWith('/assets/prologues/')||/^\/api\/media\/asset\/[a-f0-9]{64}$/.test(candidate.clip)))restored=candidate;
        }catch{/* Invalid/old pilot data is ignored. */}
        if(restored){current.current=restored;setSession(restored);setPhase(restored.pending?'error':'playing');setPaused(true);if(restored.pending)setError('已恢复尚未完成的回合。点击恢复查询，不会重新购买视频。');}
        else{setSession(s=>({...s,id:crypto.randomUUID()}));}
        const r=await fetch('/api/fal-video',{headers:{'x-xgen-account':id},cache:'no-store',signal:stop.signal});
        if(!r.ok)throw Error('已读取本机进度，但视频服务状态暂时无法查询');
        const status=await r.json() as {configured?:boolean};if(stop.signal.aborted)return;
        setConfigured(status.configured===true);
      }catch(e){if(!stop.signal.aborted)setError(e instanceof Error?e.message:'连接失败');}
      finally{if(!stop.signal.aborted)setLoading(false);}
    })();
    return()=>{alive.current=false;stop.abort();controller.current?.abort();};
  },[entry.id,entry.world.characters]);
  useEffect(()=>{
    const update=()=>setVisible(document.visibilityState==='visible'&&document.hasFocus());
    update();document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);window.addEventListener('blur',update);
    return()=>{document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update);window.removeEventListener('blur',update);};
  },[]);
  const roles=entry.fixedRoleId?entry.world.characters.filter(c=>c.id===entry.fixedRoleId):entry.world.characters;
  function selectRole(roleId:string){
    if(busy.current)return;
    const initial=initialVideoRole(entry,roleId);
    // A public/multi-role camera is not the selected person's first-person camera.
    if(!entry.fixedRoleId)frame.current=null;
    save({...current.current,...initial,roleId});setPhase('choices');setSeconds(15);setError('');
  }
  function ended(){
    if(current.current.pending){setPhase('error');setPaused(true);return;}
    try{const v=player.current;if(v&&v.videoWidth){const canvas=document.createElement('canvas');canvas.width=Math.min(960,v.videoWidth);canvas.height=Math.round(canvas.width*v.videoHeight/v.videoWidth);
      canvas.getContext('2d')!.drawImage(v,0,0,canvas.width,canvas.height);frame.current=canvas.toDataURL('image/jpeg',0.82);}}
    catch{frame.current=null;}
    setSeconds(15);
    if(current.current.roleId)setPhase('choices');
    else if(roles.length===1)selectRole(roles[0].id);
    else setPhase('roles');
  }
  async function poll(pending:Pending,signal:AbortSignal){
    if(!pending.id)throw Error('没有可查询的任务编号');
    const deadline=Date.now()+300_000;
    while(Date.now()<deadline){
      const r=await fetch(`/api/fal-video?id=${pending.id}`,{headers:{'x-xgen-account':scope!},signal,cache:'no-store'});
      const body=await r.json() as MediaReply;if(!r.ok)throw Error(videoErrors[body.error??'']??'任务查询暂时失败，可以恢复查询，不能重复购买。');
      if(body.status==='ready'){
        if(!body.assetUrl||!/^\/api\/media\/asset\/[a-f0-9]{64}$/.test(body.assetUrl))throw Error('返回的视频地址无效');
        save({...current.current,clip:body.assetUrl,pending:{...pending,assetUrl:body.assetUrl}});setPhase('ready');return;
      }
      if(body.status==='failed'||body.status==='reserved')throw Error(videoErrors[body.error??body.status]??videoErrors.failed);
      await new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},2000);signal.addEventListener('abort',abort,{once:true});});
    }
    throw Error('生成仍未完成，已暂停查询。可稍后恢复，不会重复购买。');
  }
  async function submit(pending:Pending,signal:AbortSignal){
    if(!pending.id){
      const r=await fetch('/api/fal-video',{method:'POST',headers:{'Content-Type':'application/json','x-xgen-account':scope!},body:JSON.stringify(pending.input),signal});
      const body=await r.json() as MediaReply;
      if(body.id){pending={...pending,id:body.id};save({...current.current,pending});}
      if(!r.ok||body.status==='failed'||body.status==='reserved')throw Error(videoErrors[body.error??body.status]??'提交状态不确定；恢复时只使用本回合编号，不会重复购买。');
    }
    await poll(pending,signal);
  }
  async function act(action:string){
    const s=current.current;
    if(busy.current||!enabled||!scope||!s.state||!action.trim()||s.finished||s.pending)return;
    // Fresh first-person continuations require a real decoded last frame, never a poster fallback.
    if((s.rounds>0||entry.fixedRoleId&&s.clip)&&!frame.current){setError('未能读取末帧，请完整重播当前片段后再选择。没有提交生成。');setPaused(true);return;}
    busy.current=true;setError('');setWaitSeconds(0);setPhase('planning');const abort=new AbortController();controller.current=abort;
    try{
      const response=await createRemoteAIAdapter(scope).advanceWorld(videoTurnRequest(entry,s.roleId,s.state,s.narrative,s.choices,action),abort.signal);
      if(!alive.current||abort.signal.aborted)return;
      const prompt=videoMotionPrompt(entry,s.roleId,s.state,response,!!frame.current);
      const pending:Pending={input:{confirmed:true,turnKey:`${s.id}:${s.state.turn}`,prompt,frame:frame.current},response,action};
      save({...s,pending});setWaitSeconds(0);setPhase('generating');await submit(pending,abort.signal);setText('');
    }catch(e){if(alive.current&&!abort.signal.aborted){setError(e instanceof Error?e.message:'生成失败');setPhase('error');setPaused(true);}}
    finally{busy.current=false;}
  }
  async function resume(){
    if(busy.current||!current.current.pending||!scope)return;
    busy.current=true;setError('');setPhase('generating');const abort=new AbortController();controller.current=abort;
    try{await submit(current.current.pending,abort.signal);}catch(e){if(alive.current&&!abort.signal.aborted){setError(e instanceof Error?e.message:'查询失败');setPhase('error');}}finally{busy.current=false;}
  }
  function playing(){
    const s=current.current,p=s.pending;
    if(p?.assetUrl&&s.state){save({...s,state:commitVideoTurn(entry,s.roleId,s.state,p.action,p.response),narrative:p.response.narrative,choices:threeChoices(p.response.nextChoices),
      rounds:s.rounds+1,clips:[...(s.clips??[]),{url:p.assetUrl,action:p.action}],pending:undefined,finished:p.response.ending.reached});}
    setPhase('playing');
  }
  const autoAction=useRef(()=>{});
  useEffect(()=>{autoAction.current=()=>{if(phase==='roles')selectRole(roles[0].id);else void act(current.current.choices[0]?.label??'');};});
  const ticking=enabled&&!paused&&visible&&!focused&&!text.trim()&&!error&&!session.pending&&!session.finished&&(phase==='choices'||phase==='roles');
  useEffect(()=>{
    if(!ticking)return;
    const timer=setInterval(()=>setSeconds(n=>Math.max(0,n-1)),1000);return()=>clearInterval(timer);
  },[ticking]);
  useEffect(()=>{if(seconds===0&&ticking){const timer=setTimeout(()=>{setSeconds(15);autoAction.current();},0);return()=>clearTimeout(timer);}},[seconds,ticking]);
  useEffect(()=>{if(phase==='ready')void player.current?.play().catch(()=>{/* User gesture required, keep visible controls. */});},[phase]);
  const active=phase==='roles'||phase==='choices'||phase==='error';
  return <section ref={layout} className="video-explorer">
    <header ref={heading}>{onBack?<button onClick={onBack}><ArrowLeft size={18}/> 返回</button>:<Link href="/prologue-comparison"><ArrowLeft size={18}/> 返回对比</Link>}<h1>{entry.title}</h1><span>视频探索</span></header>
    <div className="video-explorer-stage">
      {/* Actual native dialogue is unverified; don't invent a caption transcript. */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
      {!loading&&session.clip? <video ref={player} key={session.clip} src={session.clip} controls playsInline autoPlay={!session.pending} preload="metadata" poster={session.rounds===0?prologue.shots[0]?.poster:undefined}
        onEnded={ended} onPlaying={playing} onError={()=>{setError('视频暂时无法播放，剧情不会继续。请检查连接后重播。');setPaused(true);}} aria-label="当前剧情视频">
        {/* Raw model dialogue is unverified: no invented subtitle track. Text alternative below. */}
      </video>:<Image src={entry.cover} alt={entry.title} width={1280} height={720} unoptimized/>}
    </div>
    <section ref={controls} className="video-explorer-controls" aria-label="接下来的行动">
      {!enabled&&<div className="video-explorer-start"><p>看完前情，在此选择后续行动。续片由 fal H3 Max 生成，要求原生声音。每段15秒，不设体验段数上限，会持续消耗额度；配置就绪不代表账户余额充足。</p>
        <p>开启后，将本世界的可见剧情、角色外观与视频末帧交给 fal；不发送个人资料、私人聊天或角色秘密。视频存入本账号私人空间。</p>
        <button disabled={loading||!configured} onClick={()=>{setEnabled(true);setPaused(false);setSeconds(15);if(!session.clip)ended();else if(player.current?.ended)ended();}}>{loading?'检查连接中…':configured?'开启视频探索（会使用 fal 额度）':'fal 尚未就绪'}</button>
      </div>}
      {(enabled||active)&&<>
        <div className="video-explorer-status"><span>{phase==='planning'?`正在编排剧情 · 已等待 ${waitSeconds} 秒`:phase==='generating'?`正在生成并检查视频 · 已等待 ${waitSeconds} 秒`:phase==='ready'?'新片就绪，点击播放继续':session.finished?'这一段故事已到达结局':active?`${phase==='roles'?'选择体验角色':'接下来怎么做'} · ${ticking?`${seconds}秒后自动选择第一项`:'自动选择已暂停'}`:'正在播放，结束后在这里选择'}</span>
          {active&&enabled&&!session.pending&&!session.finished&&<button onClick={()=>{setPaused(!paused);setSeconds(15);}} aria-label={paused?'恢复自动选择':'暂停自动选择'}>{paused?<Play size={16}/>:<Pause size={16}/>} {paused?'恢复计时':'暂停计时'}</button>}
        </div>
        {phase==='roles'&&<div className="video-explorer-choices">{roles.map((role,i)=><button key={role.id} onClick={()=>selectRole(role.id)}><strong>{role.name}{i===0?' · 默认':''}</strong><span>{role.identity}</span></button>)}</div>}
        {(phase==='choices'||phase==='error'&&!session.pending)&&session.state&&!session.finished&&<>
          {!enabled&&<p>先开启上方视频探索，再提交行动；未开启不会生成或计费。</p>}
          <div className="video-explorer-choices">{session.choices.map((c,i)=><button disabled={!enabled} key={c.id} onClick={()=>void act(c.label)}><small>{i===0?'默认行动':'另一种选择'}</small>{c.label}</button>)}</div>
          <form onSubmit={e=>{e.preventDefault();void act(text);}}><label htmlFor="video-action">或自己行动</label><div><input id="video-action" maxLength={600} value={text} onChange={e=>setText(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="说一句话，或描述一个动作…"/><button disabled={!enabled||!text.trim()} aria-label="提交自己的行动"><Send size={18}/></button></div></form>
        </>}
        {phase==='ready'&&<button onClick={()=>void player.current?.play()}>播放新片</button>}
      </>}
      {error&&<p role="alert">{error}</p>}
      {saveError&&<p role="alert">{saveError}</p>}
      {session.pending&&phase==='error'&&<button onClick={()=>void resume()}>恢复本回合查询（不重新购买）</button>}
      <details onToggle={e=>{if(e.currentTarget.open)setPaused(true);}}><summary>更多 · 剧情与探索方式</summary>
        <p>进度保存在当前浏览器标签页，刷新可恢复；不是跨设备云同步。刷新后需重新开启生成，避免自动扣费。</p>
        {!!session.clips?.length&&<nav aria-label="已生成片段">{session.clips.filter(c=>/^\/api\/media\/asset\/[a-f0-9]{64}$/.test(c.url)).map((c,i)=><p key={c.url}><a href={c.url} target="_blank" rel="noreferrer">回看第 {i+1} 段 · {c.action}</a></p>)}</nav>}
        {onText&&<button onClick={onText}>改用图文 / 自带形象探索</button>}
        {!onText&&session.finished&&<Link href={`/?world=${entry.id}&mode=text`}>改用图文探索（另开体验）</Link>}
        <p>{session.narrative}</p><p>多角色选角后的第一段重建对应视角，之后读取实际末帧续演。原生音轨会自动检查，但模型是否拍准动作、对白是否清晰，仍需实际观看。刷新后需重播/恢复查询；离开或失焦后暂停自动选择。</p></details>
    </section>
  </section>;
}
