'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Pause, Play, Send, History, MessageSquare, X, RotateCw } from 'lucide-react';
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
import { turnMemoryText } from '@/lib/world-state';
import { migrateWorldState } from '@/lib/world-state-migration';
import {afterPending,branchKey,compileBranch,type BranchCache,type BranchSource} from '@/lib/video-branch-plans';
import {videoBranchTurnKey,videoEndingFrame} from '@/lib/video-prefetch';
import {VideoBuffer} from '@/lib/video-buffer';
import { commitVideoTurn, initialVideoRole, threeChoices, videoErrors, videoMotionPrompt, videoTurnRequest, type VideoChoice } from '@/lib/video-exploration';

type Pending={input:FalVideoInput;response:WorldTurnResponse;action:string;id?:string;assetUrl?:string;startedAt?:number};
type Prefetched=Pending&{status:string;error?:string};
type Session={version:1;id:string;roleId:string;state:WorldState|null;narrative:string;choices:VideoChoice[];clip:string;rounds:number;worldSnapshot?:StudioWorld;pending?:Pending;branches?:BranchCache;videos?:{key:string;jobs:Record<string,Prefetched>};draftAction?:string;finished?:boolean;clips?:{url:string;action:string;narrative?:string}[]};
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
  const [branchStatus,setBranchStatus]=useState(''),[branchRetry,setBranchRetry]=useState(0);
  const [branchPreparing,setBranchPreparing]=useState(false);
  const startedAt=useRef(0);
  const drawer=useRef<HTMLDialogElement>(null);
  const [drawerOpen,setDrawerOpen]=useState(false),[mediaPaused,setMediaPaused]=useState(false);
  function openRecords(){setPaused(true);player.current?.pause();setDrawerOpen(true);drawer.current?.showModal();}
  function togglePause(){if(phase==='playing'||phase==='intro'||phase==='ready'){const v=player.current;if(v){if(v.paused)void v.play().catch(()=>{});else v.pause();}}else{setPaused(p=>!p);setSeconds(15);}}

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
  const storageKey=scope?`xgen:video-pilot:v2:${scope}:${entry.id}`:null;
  const save=(input:Session)=>{const next={...input,worldSnapshot:input.worldSnapshot??entry};current.current=next;setSession(next);if(storageKey)try{sessionStorage.setItem(storageKey,JSON.stringify(next));setSaveError('');}catch{setSaveError('浏览器未能保存本次进度，请暂勿刷新或关闭此标签页。已生成的视频未被删除。');}};
  const baseSource:BranchSource|null=session.state&&!session.finished?{roleId:session.roleId,state:session.state,narrative:session.narrative,choices:session.choices,hasFrame:Boolean(session.clip)}:null;
  const preparationSource=baseSource&&session.pending?afterPending(entry,baseSource,session.pending):baseSource;
  const preparationKey=preparationSource?branchKey(entry,preparationSource):'';
  const baseKey=baseSource?branchKey(entry,baseSource):'';
  const cachedPlans=session.branches?.key===baseKey?session.branches.plans:[];
  const videoKey=JSON.stringify([baseKey,session.clip]);
  const prefetchRunning=useRef(new Map<string,Promise<void>>());
  const endFrames=useRef<{src:string;promise:Promise<string>}|null>(null);
  const prefetchContext=useRef('');prefetchContext.current=`${scope}:${videoKey}`;
  const [prefetchNote,setPrefetchNote]=useState('');
  const buffers=useRef<VideoBuffer|null>(null);
  if(!buffers.current)buffers.current=new VideoBuffer();
  const [playback,setPlayback]=useState({clip:'',src:''});
  const [shownClip,setShownClip]=useState('');
  const [holdFrame,setHoldFrame]=useState<string|null>(null);
  const [playbackRetry,setPlaybackRetry]=useState(0);
  const readySources=session.videos?.key===videoKey?Object.values(session.videos.jobs).flatMap(j=>j.assetUrl?[j.assetUrl]:[]):[];
  const bufferSources=JSON.stringify([...new Set([session.clip,playback.clip,...readySources])].filter(Boolean));
  useEffect(()=>{
    const cache=buffers.current!;
    cache.retain(JSON.parse(bufferSources) as string[]);
    if(online&&visible)for(const src of JSON.parse(bufferSources) as string[]){
      if(src.startsWith('/api/media/asset/'))void cache.load(src).catch(()=>{/* Selected video can stream if warming fails. */});
    }
  },[bufferSources,online,visible]);
  useEffect(()=>()=>buffers.current?.dispose(),[scope]);
  useEffect(()=>{
    let stale=false;
    const clip=session.clip;
    setHoldFrame(frame.current);setShownClip('');player.current?.pause();
    if(!clip){setPlayback({clip:'',src:''});setShownClip('');return;}
    // Blob URLs never enter saved sessions; reloads still use the authenticated asset.
    const source=clip.startsWith('/api/media/asset/')?buffers.current!.load(clip).catch(()=>clip):Promise.resolve(clip);
    void source.then(src=>{if(!stale)setPlayback({clip,src});});
    return()=>{stale=true;};
  },[session.clip,scope,playbackRetry]);
  useEffect(()=>{
    // Only the actual current scene gets videos. Projected grandchildren get scripts only.
    if(!enabled||!scope||!online||!visible||drawerOpen||session.pending||!session.state||session.finished||!['playing','intro','choices','error'].includes(phase))return;
    let stopped=false;
    const context=`${scope}:${videoKey}`;
    const valid=()=>!stopped&&alive.current&&prefetchContext.current===context&&!current.current.pending;
    const put=(action:string,job:Prefetched)=>{
      if(!alive.current||prefetchContext.current!==context)return;
      const s=current.current,jobs=s.videos?.key===videoKey?s.videos.jobs:{};
      const next={...s,videos:{key:videoKey,jobs:{...jobs,[action]:job}}};
      // A failed local write must stop before buying a task we cannot recover.
      if(!storageKey)throw Error('未能保存预生成任务');
      sessionStorage.setItem(storageKey,JSON.stringify(next));save(next);
    };
    async function tick(){
      if(!valid())return;
      const s=current.current;
      const plans=s.branches?.key===baseKey?s.branches.plans.slice(0,3):[];
      if(!plans.length)return;
      let ending:string|null=null;
      if(s.clip){
        if(endFrames.current?.src!==s.clip)endFrames.current={src:s.clip,promise:videoEndingFrame(buffers.current!.peek(s.clip)||s.clip)};
        try{ending=await endFrames.current.promise;}catch(e){if(valid())setPrefetchNote(e instanceof Error?e.message:'末帧读取失败');return;}
      }
      if(!valid())return;
      frame.current=ending;
      await Promise.allSettled(plans.map(async plan=>{
        const lock=`${context}:${plan.action}`;
        if(prefetchRunning.current.has(lock))return;
        const work=(async()=>{
          let job=current.current.videos?.key===videoKey?current.current.videos.jobs[plan.action]:undefined;
          if(job&&['ready','failed','reserved','uncertain'].includes(job.status))return;
          if(job?.startedAt&&Date.now()-job.startedAt>300_000)return;
          try{
            if(!job){
              const turnKey=await videoBranchTurnKey(s.id,videoKey,plan.action);
              if(!valid())return;
              job={action:plan.action,response:plan.response,input:{confirmed:true,turnKey,prompt:plan.prompt,frame:ending},status:'submitting',startedAt:Date.now()};
              put(plan.action,job);
            }
            if(!valid())return;
            const r=job.id?await fetch(`/api/fal-video?id=${job.id}`,{headers:{'x-xgen-account':scope!},cache:'no-store',signal:AbortSignal.timeout(110000)})
              :await fetch('/api/fal-video',{method:'POST',headers:{'Content-Type':'application/json','x-xgen-account':scope!},body:JSON.stringify(job.input),signal:AbortSignal.timeout(110000)});
            const body=await r.json() as MediaReply;
            if(body.assetUrl&&!/^\/api\/media\/asset\/[a-f0-9]{64}$/.test(body.assetUrl))throw Error('返回的视频地址无效');
            job={...job,id:body.id??job.id,status:r.ok?body.status:'uncertain',assetUrl:body.assetUrl,error:body.error};
            put(plan.action,job);
          }catch(e){
            if(job)try{put(plan.action,{...job,status:'uncertain',error:e instanceof Error?e.message:'查询失败'});}catch{/* Keep prior durable reservation. */}
          }
        })();
        prefetchRunning.current.set(lock,work);
        try{await work;}finally{prefetchRunning.current.delete(lock);}
      }));
    }
    void tick();const timer=setInterval(()=>void tick(),4000);
    return()=>{stopped=true;clearInterval(timer);};
    // Cache updates are consumed by the next tick, never restart paid submissions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[enabled,scope,online,visible,drawerOpen,videoKey,Boolean(session.pending),session.finished,phase]);
  const preparationRef=useRef(preparationKey);preparationRef.current=preparationKey;
  useEffect(()=>{
    if(!enabled||!scope||!online||!preparationSource||!preparationKey)return;
    const source=preparationSource,key=preparationKey,stop=new AbortController();
    const existing=current.current.branches?.key===key?current.current.branches.plans:[];
    const missing=source.choices.filter(c=>!existing.some(p=>p.action===c.label));
    if(!missing.length){setBranchPreparing(false);setBranchStatus('三个脚本已准备，下一层视频将提前生成');return;}
    setBranchPreparing(true);
    setBranchStatus('正在提前准备三个分支脚本，不生成视频');
    void Promise.allSettled(missing.map(async choice=>{
      const response=await createRemoteAIAdapter(scope).advanceWorld(videoTurnRequest(entry,source.roleId,source.state,source.narrative,source.choices,choice.label),stop.signal);
      const plan=compileBranch(entry,source,choice.label,response);
      if(stop.signal.aborted||preparationRef.current!==key)return;
      const latest=current.current,plans=latest.branches?.key===key?latest.branches.plans:existing;
      save({...latest,branches:{key,plans:[...plans.filter(p=>p.action!==plan.action),plan]}});
    })).then(()=>{
      if(stop.signal.aborted||preparationRef.current!==key)return;
      setBranchPreparing(false);
      const count=current.current.branches?.key===key?current.current.branches.plans.length:0;
      setBranchStatus(count===3?'三个脚本已准备，下一层视频将提前生成':`已准备 ${count}/3 个脚本；其余可以重新准备，就绪后会预生成视频`);
    });
    return()=>stop.abort();
    // The serialized key covers world version, role, all state, choices and frame mode.
    // Cache writes must not restart incomplete requests or purchase any media.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[preparationKey,enabled,scope,online,branchRetry]);
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
    if(roles.length>1)frame.current=null;
    // This old clip contains Lin's private experiences, not the husband's knowledge.
    const roleClip=entry.id==='yoga-lotus-boundary'&&roleId==='lin'&&!current.current.roleId?prologue.video:undefined;
    save({...current.current,...initial,roleId,clip:roleClip??(roles.length===1?current.current.clip:''),branches:undefined});setPhase(roleClip?'intro':'choices');setSeconds(15);setError('');
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
  async function act(action:string,preset=false){
    const s=current.current;
    if(busy.current||!enabled||!scope||!s.state||!action.trim()||s.finished||s.pending)return;
    // Fresh first-person continuations require a real decoded last frame, never a poster fallback.
    if(s.clip&&!frame.current){setError('正在读取当前片段末帧，请稍后选择。没有提交生成。');setPaused(true);return;}
    const key=branchKey(entry,{roleId:s.roleId,state:s.state,narrative:s.narrative,choices:s.choices,hasFrame:Boolean(s.clip)});
    const prepared=s.branches?.key===key?s.branches.plans.find(p=>p.action===action):undefined;
    // Preset clicks never fall back to a blocking text-model call.
    if(preset&&!prepared)return;
    busy.current=true;setText(action);setError('');startedAt.current=Date.now();setWaitSeconds(0);setWaitingNote(prepared?'使用已准备的脚本，正在提交视频。':'正在编排你自行输入的行动；此时尚未提交视频。');setPhase(prepared?'generating':'planning');const abort=new AbortController();controller.current=abort;
    save({...s,draftAction:action});
    try{
      // If a background submit is in flight, join it instead of racing its reservation.
      await prefetchRunning.current.get(`${scope}:${videoKey}:${action}`);
      if(!alive.current||abort.signal.aborted)return;
      const prefetched=current.current.videos?.key===videoKey?current.current.videos.jobs[action]:undefined;
      const response=prepared?.response??await createRemoteAIAdapter(scope).advanceWorld(videoTurnRequest(entry,s.roleId,s.state,s.narrative,s.choices,action),abort.signal);
      if(!alive.current||abort.signal.aborted)return;
      const prompt=prepared?.prompt??videoMotionPrompt(entry,s.roleId,s.state,response,!!frame.current);
      const pending:Pending=prefetched??{input:{confirmed:true,turnKey:await videoBranchTurnKey(s.id,videoKey,action),prompt,frame:frame.current},response,action,startedAt:startedAt.current};
      // Persist the exact request BEFORE any potentially billable submission.
      if(!storageKey)throw Error('未能确定保存位置，尚未提交视频。');
      const next={...current.current,pending,draftAction:action,worldSnapshot:s.worldSnapshot??entry};
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
    if(playback.clip!==current.current.clip)return;
    const s=current.current,p=s.pending;
    if(p?.assetUrl&&s.state){save({...s,state:commitVideoTurn(entry,s.roleId,s.state,p.action,p.response),narrative:p.response.narrative,choices:threeChoices(p.response.nextChoices),
      rounds:s.rounds+1,clips:[...(s.clips??[]),{url:p.assetUrl,action:p.action,narrative:turnMemoryText(p.response,entry.world,s.roleId)}],pending:undefined,draftAction:undefined,finished:p.response.ending.reached});setText('');}
    if(!s.roleId&&roles.length===1){
      const initial=initialVideoRole(entry,roles[0].id);
      save({...current.current,...initial,roleId:roles[0].id});
    }
    setPhase('playing');
  }
  function revealPlaying(){
    const clip=playback.clip;
    const reveal=()=>{
      if(!alive.current||current.current.clip!==clip)return;
      setShownClip(clip);setMediaPaused(false);playing();
    };
    const video=player.current;
    if(video&&'requestVideoFrameCallback' in video)video.requestVideoFrameCallback(reveal);
    else reveal();
  }
  const autoAction=useRef(()=>{});
  useEffect(()=>{autoAction.current=()=>{if(phase==='roles')selectRole(roles[0].id);else void act(current.current.choices[0]?.label??'',true);};});
  const ticking=enabled&&!drawerOpen&&!paused&&online&&visible&&!focused&&!text.trim()&&!error&&!session.pending&&!session.finished&&(phase==='roles'||phase==='choices'&&cachedPlans.some(p=>p.action===session.choices[0]?.label));
  useEffect(()=>{
    if(!ticking)return;
    const timer=setInterval(()=>setSeconds(n=>Math.max(0,n-1)),1000);return()=>clearInterval(timer);
  },[ticking]);
  useEffect(()=>{if(seconds===0&&ticking){const timer=setTimeout(()=>{setSeconds(15);autoAction.current();},0);return()=>clearTimeout(timer);}},[seconds,ticking]);
  useEffect(()=>{if(phase==='ready'&&!drawerOpen&&playback.clip===session.clip)void player.current?.play().catch(()=>{/* User gesture required, keep visible controls. */});},[phase,drawerOpen,playback,session.clip]);
  const choosing=(phase==='choices'||phase==='error'&&!session.pending)&&!!session.state&&!session.finished;
  const waiting=phase==='planning'||phase==='generating';
  const preparingDefault=choosing&&!cachedPlans.some(p=>p.action===session.choices[0]?.label);
  const countdownLabel=ticking?`${seconds}秒后自动选择`:preparingDefault?'行动准备中 · 计时未开始':`倒计时暂停 · ${seconds}秒`;
  const pauseActive=['playing','intro','ready'].includes(phase)?mediaPaused:paused;
  const roleName=roles.find(r=>r.id===session.roleId)?.name??'';
  const shortAction=(label:string)=>label.startsWith(roleName)&&roleName?label.slice(roleName.length).replace(/^[：:，,\s]+/,''):label;
  return <section ref={layout} className="video-explorer" data-screen-playing={phase==='playing'&&!error} aria-label={entry.title}>
    <header ref={heading} className="video-explorer-hud">
      <div className="video-corner">{onBack?<button aria-label="返回" title="返回" onClick={onBack}><ArrowLeft size={22}/></button>:<Link aria-label="返回对比" title="返回对比" href="/prologue-comparison"><ArrowLeft size={22}/></Link>}</div>
      <div className="video-corner video-corner-right">
        <button onClick={togglePause} aria-label={pauseActive?'继续':'暂停'} title={pauseActive?'继续':'暂停'}>{pauseActive?<Play size={21}/>:<Pause size={21}/>}</button>
        {onText?<button onClick={onText} aria-label="切换图文探索" title="切换图文探索"><MessageSquare size={21}/></button>:<Link href={`/?world=${entry.id}&mode=text`} aria-label="图文探索（另开体验）" title="图文探索（另开体验）"><MessageSquare size={21}/></Link>}
        <button onClick={openRecords} aria-label="剧情记录" title="剧情记录" aria-haspopup="dialog" aria-expanded={drawerOpen}><History size={21}/></button>
      </div>
    </header>
    <div className="video-explorer-stage">
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
      {!loading&&session.clip&&playback.src?<video ref={player} key={playback.src} src={playback.src} controls={phase==='playing'||phase==='intro'||phase==='ready'} playsInline autoPlay={!session.pending} preload="auto" poster={holdFrame||entry.portraits[session.roleId]||entry.cover}
        onPause={()=>setMediaPaused(true)} onEnded={()=>{if(playback.clip===current.current.clip)ended();}} onPlaying={revealPlaying} onError={()=>{setError('视频加载失败，成片和进度已保留。可以重新加载，不会重新生成。');setPhase('error');setPaused(true);}} aria-label="当前剧情视频"/>:<Image src={entry.portraits[session.roleId]||entry.cover} alt={roleName||entry.title} width={1280} height={720} unoptimized/>}
      {session.clip&&shownClip!==session.clip&&<div className="video-transition-cover" aria-label="缓冲视频，保留上一幕"><Image src={holdFrame||entry.portraits[session.roleId]||entry.cover} alt="" width={1280} height={720} unoptimized/><span role="status">正在缓冲画面…</span></div>}
    </div>
    <section ref={controls} className="video-explorer-controls" aria-label="接下来的行动">
      {!enabled&&<div className="video-explorer-start">
        <p>播放时提前生成下一层三个分支，每轮最多生成三段视频；未选择的分支也会消耗额度。不发送私人聊天。</p>
        <button disabled={loading||!configured} onClick={()=>{setEnabled(true);setPaused(false);setSeconds(15);if(!session.clip)ended();else if(player.current?.ended)ended();}}>{loading?'连接中…':configured?'开启探索':'服务暂不可用'}</button>
      </div>}
      {waiting&&<p className="video-brief" role="status">{phase==='planning'?'正在编排你的行动':'正在生成下一幕'} · {waitSeconds}秒</p>}
      {enabled&&(choosing||phase==='roles')&&<div className="video-countdown" data-paused={!ticking}><span>{countdownLabel}</span><progress aria-label={countdownLabel} max={15} value={seconds}/></div>}
      {phase==='roles'&&<div className="video-explorer-choices">{roles.map(role=><button disabled={loading} key={role.id} title={role.identity} onClick={()=>selectRole(role.id)}>{role.name}</button>)}</div>}
      {choosing&&<>
        <div className="video-explorer-choices">{session.choices.map((c,i)=>{const job=session.videos?.key===videoKey?session.videos.jobs[c.label]:undefined;return <button disabled={!enabled||!online||!cachedPlans.some(p=>p.action===c.label)} key={c.id} title={job?.assetUrl?'视频已就绪':job?'视频准备中':c.label} aria-label={c.label} onClick={()=>void act(c.label,true)}><span>{shortAction(c.label)}</span>{job?.assetUrl&&<small>已就绪</small>}{i===0&&ticking&&<em aria-label={`${seconds}秒后自动选择`}>{seconds}</em>}</button>;})}</div>
        <form onSubmit={e=>{e.preventDefault();void act(text);}}><input aria-label="输入自己的行动" id="video-action" maxLength={600} value={text} onChange={e=>setText(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="你想怎么做…" /><button disabled={!enabled||!online||!text.trim()} aria-label="提交自己的行动"><Send size={20}/></button></form>
        {enabled&&cachedPlans.length<session.choices.length&&<div className="video-brief" role="status">{branchPreparing?'正在准备行动…':'部分行动尚未就绪'}{!branchPreparing&&<button aria-label="重新准备未完成的脚本" title="重新准备" disabled={!online} onClick={()=>setBranchRetry(n=>n+1)}><RotateCw size={17}/></button>}</div>}
      </>}
      {phase==='ready'&&<button aria-label="播放新片" onClick={()=>void player.current?.play()}><Play size={22}/></button>}
      {session.finished&&phase!=='playing'&&<p className="video-brief">当前剧情<button onClick={()=>{save({...current.current,finished:false,choices:threeChoices([])});setPaused(true);setPhase('choices');}}>继续探索</button></p>}
      {(error||saveError)&&<div className="video-brief" role="alert">暂未继续，进度已保留<button onClick={openRecords}>查看详情</button></div>}
      {!online&&<p className="video-brief" role="status">网络已断开，进度保留</p>}
      {session.pending&&phase==='error'&&<button disabled={!online} onClick={()=>void resume()}>{session.pending.assetUrl?'播放已保存片段':'恢复等待'}</button>}
    </section>
    <dialog ref={drawer} className="video-records" aria-labelledby="video-records-title" onClose={()=>{drawer.current?.querySelectorAll('video').forEach(v=>v.pause());setDrawerOpen(false);}} onClick={e=>{if(e.target===e.currentTarget){const b=e.currentTarget.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)e.currentTarget.close();}}}>
      <div className="video-records-heading"><h2 id="video-records-title">剧情记录</h2><button aria-label="关闭剧情记录" onClick={()=>drawer.current?.close()}><X size={22}/></button></div>
      <h3>{entry.title}</h3>
      {error&&<p role="alert">{error}</p>}{saveError&&<p role="alert">{saveError}</p>}
      {error&&session.clip&&<button onClick={()=>{setError('');setPlaybackRetry(n=>n+1);setPhase('ready');}}>重新加载视频</button>}
      {waiting&&<div><p>{waitingNote}</p><button onClick={pauseWaiting}>停止本页等待</button></div>}
      {branchStatus&&<p>{branchStatus}</p>}
      {prefetchNote&&<p>{prefetchNote}</p>}
      {session.videos?.key===videoKey&&<p>下一层视频：{Object.values(session.videos.jobs).filter(j=>j.status==='ready').length}/3 已就绪。选择未完成的分支会继续等待原任务。</p>}
      {session.state&&<StoryUpdateNotice current={entry} latest={latestEntry} disabled={!!session.pending||!['choices','error'].includes(phase)} onApply={attachUpdate}/>}
      {session.state&&roles.length>1&&!entry.world.entryAdmission&&<label>切换视角 · 时间不变 <select aria-label="同一存档切换角色" value={session.roleId} disabled={!!session.pending||!['choices','error'].includes(phase)} onChange={e=>switchViewpoint(e.target.value)}>{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></label>}
      <section><h3>当前场景</h3><p>{session.narrative}</p></section>
      {session.roleId&&session.rounds===0&&!session.state?.rolePerspectives&&characterRecap(entry.world,session.roleId).length>0&&<section><h3>角色前情</h3>{characterRecap(entry.world,session.roleId).map((fact,i)=><p key={i}>{fact}</p>)}</section>}
      {prologue.video&&roles.length===1&&<details><summary>开场视频</summary><video controls preload="none" src={prologue.video} aria-label="回看开场视频"/></details>}
      {(session.clips??[]).filter(c=>/^\/api\/media\/asset\/[a-f0-9]{64}$/.test(c.url)).map((c,i)=><details key={c.url}><summary>第 {i+1} 段 · {c.action}</summary><p>{c.narrative??'此旧片段未单独保存文字，请参照当前场景。'}</p><video controls preload="none" src={c.url} aria-label={`回看第${i+1}段`}/></details>)}
      {session.finished&&<RequestStoryUpdate key={`${scope}:${entry.id}`} worldId={entry.id} accountScope={scope??'pending'}/>}
      <details><summary>探索说明</summary><p>每段15秒，播放时预生成下一层三个分支，不递归生成未选择路线。已完成的分支直接播放，未完成的继续等待。进度保存在当前浏览器标签页，刷新后恢复；不是跨设备同步。</p><p>离开或失焦暂停新预生成，已提交的任务不会取消；恢复时复用原任务。未选择的分支也已消耗生成额度。只有选中的视频开始播放后才推进剧情。</p></details>
    </dialog>
  </section>;
}
