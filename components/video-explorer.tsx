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
import { playableCharacters, characterRecap } from '@/lib/character-entry';
import { switchRole } from '@/lib/role-switch';
import { applyStoryUpgrade } from '@/lib/story-upgrade';
import { StoryUpdateNotice } from '@/components/story-update-notice';
import { RequestStoryUpdate } from '@/components/request-story-update';
import { useRecordPlay } from '@/components/play-counts';
import { publicationWorld } from '@/lib/publication';
import { migrateWorldState } from '@/lib/world-state-migration';
import { commitVideoTurn, initialVideoRole, threeChoices, videoErrors, videoMotionPrompt, videoTurnRequest, type VideoChoice } from '@/lib/video-exploration';

type Pending={input:FalVideoInput;response:WorldTurnResponse;action:string;id?:string;assetUrl?:string;startedAt?:number};
type Session={version:1;id:string;roleId:string;state:WorldState|null;narrative:string;choices:VideoChoice[];clip:string;rounds:number;worldSnapshot?:StudioWorld;pending?:Pending;draftAction?:string;finished?:boolean;clips?:{url:string;action:string}[]};
type Phase='intro'|'roles'|'choices'|'planning'|'generating'|'ready'|'playing'|'error';
type MediaReply={id?:string;status:string;error?:string;assetUrl?:string};
export function VideoExplorer({entry:latestEntry,onBack,onText}:{entry:StudioWorld;onBack?:()=>void;onText?:()=>void}){
  const [entry,setEntry]=useState(latestEntry);
  const prologue=worldPrologue(entry.id,entry.premise,entry.cover);
  const roles=playableCharacters(entry.world,entry.fixedRoleId);
  const [session,setSession]=useState<Session>({version:1,id:'',roleId:'',state:null,narrative:entry.world.storyHook||entry.title,choices:[],clip:roles.length===1?(prologue.video??''):'',rounds:0});
  const current=useRef(session);
  useEffect(()=>{current.current=session;},[session]);
  const [phase,setPhase]=useState<Phase>(roles.length===1?'intro':'roles'),[scope,setScope]=useState<string|null>(null),[configured,setConfigured]=useState(false);
  useRecordPlay(session.rounds > 0 ? `world:${entry.id}` : null, scope);
  const [enabled,setEnabled]=useState(false),[paused,setPaused]=useState(false),[seconds,setSeconds]=useState(15),[text,setText]=useState(''),[focused,setFocused]=useState(false);
  const [visible,setVisible]=useState(true),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [saveError,setSaveError]=useState(''),[waitSeconds,setWaitSeconds]=useState(0);
  const [waitingNote,setWaitingNote]=useState(''),[online,setOnline]=useState(true);
  const startedAt=useRef(0);
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
    const start=current.current.pending?.startedAt||startedAt.current||Date.now();
    const update=()=>setWaitSeconds(Math.max(0,Math.floor((Date.now()-start)/1000)));
    update();const timer=setInterval(update,1000);
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
  const save=(input:Session)=>{const next={...input,worldSnapshot:input.worldSnapshot??entry};current.current=next;setSession(next);if(storageKey)try{sessionStorage.setItem(storageKey,JSON.stringify(next));setSaveError('');}catch{setSaveError('浏览器未能保存本次进度，请暂勿刷新或关闭此标签页。已生成的视频未被删除。');}};
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
          const savedEntry=candidate?.worldSnapshot?.id===latestEntry.id ? {...candidate.worldSnapshot,world:publicationWorld(candidate.worldSnapshot.world)} as StudioWorld : latestEntry;
          if(candidate?.version===1&&typeof candidate.id==='string'&&candidate.state&&savedEntry.world.characters.some(c=>c.id===candidate.roleId)&&Array.isArray(candidate.choices)
            &&typeof candidate.clip==='string'&&(candidate.clip===''||candidate.clip.startsWith('/assets/prologues/')||/^\/api\/media\/asset\/[a-f0-9]{64}$/.test(candidate.clip)))restored={...candidate,worldSnapshot:savedEntry};
        }catch{/* Invalid/old pilot data is ignored. */}
        if(restored){
          restored={...restored,state:migrateWorldState(restored.state!,restored.worldSnapshot?.world)};
          setText(restored.draftAction??restored.pending?.action??'');
          if(restored.worldSnapshot?.id===latestEntry.id)setEntry(restored.worldSnapshot);
          // An old unplayed universal intro is not valid for another character.
          if(entry.id==='yoga-lotus-boundary'&&restored.roleId!=='lin'&&restored.rounds===0&&restored.clip===prologue.video)restored={...restored,clip:''};
          current.current=restored;setSession(restored);setPhase(restored.pending?'error':restored.clip?'playing':'choices');setPaused(true);
          if(restored.pending)setError(restored.pending.assetUrl?'视频已保存，点击播放即可继续，无需重新生成。':'已找回未完成的回合。恢复将复用原回合编号，不另建视频任务。');}
        else{setSession(s=>({...s,id:crypto.randomUUID()}));}
        const r=await fetch('/api/fal-video',{headers:{'x-xgen-account':id},cache:'no-store',signal:stop.signal});
        if(!r.ok)throw Error('已读取本机进度，但视频服务状态暂时无法查询');
        const status=await r.json() as {configured?:boolean};if(stop.signal.aborted)return;
        setConfigured(status.configured===true);
      }catch(e){if(!stop.signal.aborted)setError(e instanceof Error?e.message:'连接失败');}
      finally{if(!stop.signal.aborted)setLoading(false);}
    })();
    return()=>{alive.current=false;stop.abort();controller.current?.abort();};
  },[latestEntry.id,latestEntry.world.characters]);
  useEffect(()=>{
    const update=()=>setOnline(navigator.onLine);
    update();window.addEventListener('online',update);window.addEventListener('offline',update);
    return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[]);
  useEffect(()=>{
    const update=()=>setVisible(document.visibilityState==='visible'&&document.hasFocus());
    update();document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);window.addEventListener('blur',update);
    return()=>{document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update);window.removeEventListener('blur',update);};
  },[]);
  function selectRole(roleId:string){
    if(busy.current)return;
    const initial=initialVideoRole(entry,roleId);
    // A public/multi-role camera is not the selected person's first-person camera.
    if(!entry.fixedRoleId)frame.current=null;
    // This old clip contains Lin's private experiences, not the husband's knowledge.
    const roleClip=entry.id==='yoga-lotus-boundary'&&roleId==='lin'&&!current.current.roleId?prologue.video:undefined;
    save({...current.current,...initial,roleId,...(roleClip?{clip:roleClip}:{})});setPhase(roleClip?'intro':'choices');setSeconds(15);setError('');
  }
  function switchViewpoint(roleId:string){
    const s=current.current;
    if(busy.current||s.pending||!s.state||roleId===s.roleId||!['choices','error'].includes(phase))return;
    try{
      const changed=switchRole(entry.world,s.state,s.roleId,roleId,entry.fixedRoleId);
      frame.current=null;setPaused(true);setSeconds(15);setText('');setError('');
      save({...s,...changed,roleId,clip:'',choices:['观察眼前的环境','确认身边有哪些人','查看自己随身的物品'].map((label,i)=>({id:`switch-${i}`,label,intent:label}))});
      setPhase('choices');
    }catch(e){setError(e instanceof Error?e.message:'暂时无法切换角色');}
  }
  function attachUpdate(latest:StudioWorld){
    const s=current.current;
    if(busy.current||s.pending||!s.state||!storageKey||!['choices','error'].includes(phase))return;
    try{
      const state=applyStoryUpgrade(entry,latest,s.state);
      const next={...s,state,worldSnapshot:latest,finished:false,choices:threeChoices([])};
      sessionStorage.setItem(`${storageKey}:before-update`,JSON.stringify(s));
      sessionStorage.setItem(storageKey,JSON.stringify(next));
      setEntry(latest);save(next);setPaused(true);setError('');setPhase('choices');
    }catch(e){setError(e instanceof Error?e.message:'接续失败，原进度保持不变。');}
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
      if(!navigator.onLine)throw Error('网络已断开。任务与原进度已保留，联网后可恢复查询。');
      setWaitingNote('正在查询原任务；离开等待不会取消已提交的生成。');
      const r=await fetch(`/api/fal-video?id=${pending.id}`,{headers:{'x-xgen-account':scope!},signal,cache:'no-store'});
      const body=await r.json() as MediaReply;if(!r.ok)throw Error(videoErrors[body.error??'']??'任务查询暂时失败，可以恢复查询，不能重复购买。');
      if(body.status==='ready'){
        if(!body.assetUrl||!/^\/api\/media\/asset\/[a-f0-9]{64}$/.test(body.assetUrl))throw Error('返回的视频地址无效');
        save({...current.current,clip:body.assetUrl,pending:{...pending,assetUrl:body.assetUrl}});setPhase('ready');return;
      }
      if(body.status==='failed'||body.status==='reserved')throw Error(videoErrors[body.error??body.status]??videoErrors.failed);
      setWaitingNote('服务端尚未返回成片，正在排队或生成。暂无可靠的剩余时间。');
      await new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},2000);signal.addEventListener('abort',abort,{once:true});});
    }
    throw Error('生成仍未完成，已暂停查询。可稍后恢复，不会重复购买。');
  }
  async function submit(pending:Pending,signal:AbortSignal){
    if(pending.assetUrl){save({...current.current,clip:pending.assetUrl});setPhase('ready');return;}
    if(!pending.id){
      setWaitingNote('正在确认本回合任务，恢复时复用同一编号。');
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
    if(s.clip&&(s.rounds>0||entry.fixedRoleId)&&!frame.current){setError('未能读取末帧，请完整重播当前片段后再选择。没有提交生成。');setPaused(true);return;}
    busy.current=true;setText(action);setError('');startedAt.current=Date.now();setWaitSeconds(0);setWaitingNote('正在根据你的行动编排下一段；此时尚未提交视频。');setPhase('planning');const abort=new AbortController();controller.current=abort;
    save({...s,draftAction:action});
    try{
      const response=await createRemoteAIAdapter(scope).advanceWorld(videoTurnRequest(entry,s.roleId,s.state,s.narrative,s.choices,action),abort.signal);
      if(!alive.current||abort.signal.aborted)return;
      const prompt=videoMotionPrompt(entry,s.roleId,s.state,response,!!frame.current);
      const pending:Pending={input:{confirmed:true,turnKey:`${s.id}:${s.state.turn}`,prompt,frame:frame.current},response,action,startedAt:startedAt.current};
      // Persist the exact request BEFORE any potentially billable submission.
      if(!storageKey)throw Error('未能确定保存位置，尚未提交视频。');
      const next={...s,pending,draftAction:action,worldSnapshot:s.worldSnapshot??entry};
      sessionStorage.setItem(storageKey,JSON.stringify(next));
      save(next);setWaitSeconds(0);setPhase('generating');await submit(pending,abort.signal);setText('');
    }catch(e){if(alive.current&&!abort.signal.aborted){setError(e instanceof Error?e.message:'生成失败');setPhase('error');setPaused(true);}}
    finally{busy.current=false;}
  }
  async function resume(){
    if(busy.current||!current.current.pending||!scope||!online)return;
    busy.current=true;setError('');setPhase('generating');const abort=new AbortController();controller.current=abort;
    try{await submit(current.current.pending,abort.signal);}catch(e){if(alive.current&&!abort.signal.aborted){setError(e instanceof Error?e.message:'查询失败');setPhase('error');}}finally{busy.current=false;}
  }
  function pauseWaiting(){
    controller.current?.abort();setPaused(true);setPhase('error');
    setError(current.current.pending?'已暂停本页查询，后台任务未取消。可稍后恢复同一回合。':'已停止等待剧情编排，尚未提交视频。行动文字已保留，可重新提交。');
  }
  function playing(){
    const s=current.current,p=s.pending;
    if(p?.assetUrl&&s.state){save({...s,state:commitVideoTurn(entry,s.roleId,s.state,p.action,p.response),narrative:p.response.narrative,choices:threeChoices(p.response.nextChoices),
      rounds:s.rounds+1,clips:[...(s.clips??[]),{url:p.assetUrl,action:p.action}],pending:undefined,draftAction:undefined,finished:p.response.ending.reached});setText('');}
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
      {session.state&&<StoryUpdateNotice current={entry} latest={latestEntry} disabled={!!session.pending||!['choices','error'].includes(phase)} onApply={attachUpdate}/>}
      {session.finished&&phase==='choices'&&<div><h2>当前剧情已体验完</h2><p>进度和已生成片段已保留，可以接入新增剧情，或留在当前世界自由探索。</p><button onClick={()=>{save({...current.current,finished:false,choices:threeChoices([])});setPaused(true);}}>留在这个世界</button></div>}
      {session.state&&roles.length>1&&!entry.world.entryAdmission&&<label>切换角色 <select aria-label="同一存档切换角色" value={session.roleId} disabled={!!session.pending||!['choices','error'].includes(phase)} onChange={e=>switchViewpoint(e.target.value)}>{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></label>}
      {session.state&&!session.clip&&<p>{session.narrative}</p>}
      {!enabled&&<div className="video-explorer-start"><p>先选择体验角色，再从对应场景行动。续片由 fal H3 Max 生成，要求原生声音。每段15秒，不设体验段数上限，会持续消耗额度；配置就绪不代表账户余额充足。</p>
        <p>开启后，将本世界的可见剧情、角色外观与视频末帧交给 fal；不发送个人资料、私人聊天或角色秘密。视频存入本账号私人空间。</p>
        <button disabled={loading||!configured} onClick={()=>{setEnabled(true);setPaused(false);setSeconds(15);if(!session.clip)ended();else if(player.current?.ended)ended();}}>{loading?'检查连接中…':configured?'开启视频探索（会使用 fal 额度）':'fal 尚未就绪'}</button>
      </div>}
      {(enabled||active||phase==='generating'||phase==='ready')&&<>
        <div className="video-explorer-status"><span>{phase==='planning'?`正在编排剧情 · 已等待 ${waitSeconds} 秒`:phase==='generating'?`等待成片 · 本回合已用 ${waitSeconds} 秒`:phase==='ready'?'新片就绪，点击播放继续':session.finished?'当前剧情已体验完':active?`${phase==='roles'?'选择体验角色':'接下来怎么做'} · ${ticking?`${seconds}秒后自动选择第一项`:'自动选择已暂停'}`:'正在播放，结束后在这里选择'}</span>
          {active&&enabled&&!session.pending&&!session.finished&&<button onClick={()=>{setPaused(!paused);setSeconds(15);}} aria-label={paused?'恢复自动选择':'暂停自动选择'}>{paused?<Play size={16}/>:<Pause size={16}/>} {paused?'恢复计时':'暂停计时'}</button>}
        </div>
        {(phase==='planning'||phase==='generating')&&<div aria-live="polite"><p>{waitingNote}</p><button onClick={pauseWaiting}>暂时停止等待</button></div>}
        {phase==='roles'&&<div className="video-explorer-choices">{roles.map((role,i)=><button disabled={loading} key={role.id} onClick={()=>selectRole(role.id)}><strong>{role.name}{i===0?' · 默认':''}</strong><span>{role.identity}</span></button>)}</div>}
        {session.roleId&&session.rounds===0&&!session.state?.rolePerspectives&&characterRecap(entry.world,session.roleId).length>0&&<div aria-label="角色专属前情">{characterRecap(entry.world,session.roleId).map((fact,i)=><p key={i}>{fact}</p>)}</div>}
        {(phase==='choices'||phase==='error'&&!session.pending)&&session.state&&!session.finished&&<>
          {!enabled&&<p>先开启上方视频探索，再提交行动；未开启不会生成或计费。</p>}
          <div className="video-explorer-choices">{session.choices.map((c,i)=><button disabled={!enabled} key={c.id} onClick={()=>void act(c.label)}><small>{i===0?'默认行动':'另一种选择'}</small>{c.label}</button>)}</div>
          <form onSubmit={e=>{e.preventDefault();void act(text);}}><label htmlFor="video-action">或自己行动</label><div><input id="video-action" maxLength={600} value={text} onChange={e=>setText(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="说一句话，或描述一个动作…"/><button disabled={!enabled||!text.trim()} aria-label="提交自己的行动"><Send size={18}/></button></div></form>
        </>}
        {phase==='ready'&&<button onClick={()=>void player.current?.play()}>播放新片</button>}
      </>}
      {error&&<p role="alert">{error}</p>}
      {session.finished&&<RequestStoryUpdate key={`${scope}:${entry.id}`} worldId={entry.id} accountScope={scope??'pending'}/>}
      {saveError&&<p role="alert">{saveError}</p>}
      {!online&&<p role="status">当前离线，联网后可继续；不会自动提交新视频。</p>}
      {session.pending&&phase==='error'&&<button disabled={!online} onClick={()=>void resume()}>{session.pending.assetUrl?'播放已保存的视频':'恢复本回合（复用原任务）'}</button>}
      <details onToggle={e=>{if(e.currentTarget.open)setPaused(true);}}><summary>更多 · 剧情与探索方式</summary>
        <p>进度保存在当前浏览器标签页，刷新可恢复；不是跨设备云同步。刷新后需重新开启生成，避免自动扣费。</p>
        {!!session.clips?.length&&<nav aria-label="已生成片段">{session.clips.filter(c=>/^\/api\/media\/asset\/[a-f0-9]{64}$/.test(c.url)).map((c,i)=><p key={c.url}><a href={c.url} target="_blank" rel="noreferrer">回看第 {i+1} 段 · {c.action}</a></p>)}</nav>}
        {onText&&<button onClick={onText}>改用图文 / 自带形象探索</button>}
        {!onText&&session.finished&&<Link href={`/?world=${entry.id}&mode=text`}>改用图文探索（另开体验）</Link>}
        <p>{session.narrative}</p><p>多角色选角后的第一段重建对应视角，之后读取实际末帧续演。原生音轨会自动检查，但模型是否拍准动作、对白是否清晰，仍需实际观看。刷新后需重播/恢复查询；离开或失焦后暂停自动选择。</p></details>
    </section>
  </section>;
}
