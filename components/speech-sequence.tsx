'use client';
import {useEffect,useRef,useState} from 'react';
import {Volume2,Pause,LoaderCircle} from 'lucide-react';
import {SPEECH_VOICES} from '@/lib/media-policy';
import type {SpeechSegment} from '@/lib/speech-sequence';

export function SpeechSequence(props:{segments:SpeechSegment[];accountScope:string}) {
  return <Sequence key={JSON.stringify(props)} {...props}/>;
}
function Sequence({segments,accountScope}:{segments:SpeechSegment[];accountScope:string}) {
  const audio=useRef<HTMLAudioElement>(null), epoch=useRef(0), index=useRef(0);
  const request=useRef<AbortController|null>(null), active=useRef(false);
  const ready=useRef(new Map<number,string>());
  const [state,setState]=useState<'idle'|'loading'|'playing'>('idle');
  const [error,setError]=useState('');
  useEffect(()=>{
    const stop=()=>{active.current=false;++epoch.current;request.current?.abort();audio.current?.pause();setState('idle');};
    window.addEventListener('xgen-speech-stop',stop);
    return ()=>{window.removeEventListener('xgen-speech-stop',stop);active.current=false;++epoch.current;request.current?.abort();audio.current?.pause();};
  },[]);
  async function play(part:number,version:number) {
    if(version!==epoch.current || !active.current) return;
    if(part>=segments.length){index.current=0;active.current=false;setState('idle');return;}
    index.current=part;setState('loading');setError('');
    const controller=new AbortController();request.current=controller;
    try {
      let url=ready.current.get(part);
      if(!url){
        const segment=segments[part];
        const hash=Array.from(segment.speaker).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
        const voice=SPEECH_VOICES[hash%SPEECH_VOICES.length].id;
        const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['speech',segment.text,voice])));
        const key=`xgen-media-v1:${accountScope}:${Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')}`;
        let id='';try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(/^[a-f0-9]{64}$/.test(saved?.id))id=saved.id;}catch{/* optional index */}
        if(version!==epoch.current)return;
        const headers={'Content-Type':'application/json','x-xgen-account':accountScope};
        if(!id){const status=await fetch('/api/media',{headers,signal:controller.signal,cache:'no-store'});if(!status.ok || !(await status.json() as {configured?:boolean}).configured)throw Error('语音服务暂不可用，请稍后继续。');}
        const response=await fetch(id?`/api/media?id=${id}`:'/api/media',{method:id?'GET':'POST',headers,signal:controller.signal,cache:'no-store',...(!id?{body:JSON.stringify({kind:'speech',text:segment.text,voice,confirmed:true})}:{})});
        const result=await response.json() as {id:string;status:string;assetUrl?:string;error?:string};
        if(!response.ok)throw Error(result.error==='daily_limit'?'今日语音额度已用完。':'本段语音暂不可用，点击可重试或查询原任务。');
        if(!/^[a-f0-9]{64}$/.test(result.id)||!['ready','reserved','queued','failed'].includes(result.status))throw Error('语音返回格式异常。');
        if(version!==epoch.current)return;
        try{localStorage.setItem(key,JSON.stringify({id:result.id}));}catch{/* server deduplicates */}
        if(result.status!=='ready')throw Error(result.status==='failed'?'本段语音生成失败，未跳过内容。':'本段语音尚在准备，点击可查询并继续。');
        if(result.assetUrl!==`/api/media/asset/${result.id}`)throw Error('语音地址异常。');
        url=result.assetUrl;ready.current.set(part,url!);
      }
      if(version!==epoch.current || !active.current || !audio.current)return;
      if(audio.current.getAttribute('src')!==url)audio.current.src=url!;
      await audio.current.play();
      if(version===epoch.current)setState('playing');
    }catch(e){if(version===epoch.current&&!controller.signal.aborted){active.current=false;setState('idle');setError(e instanceof Error?e.message:'未能播放，请点击继续。');}}
    finally{if(request.current===controller)request.current=null;}
  }
  function toggle(){
    if(active.current){active.current=false;++epoch.current;request.current?.abort();audio.current?.pause();setState('idle');return;}
    window.dispatchEvent(new Event('xgen-speech-stop'));active.current=true;void play(index.current,epoch.current);
  }
  return <div className="company-media"><button type="button" className="flow-control" onClick={toggle} disabled={!segments.length} title="按顺序朗读本段旁白与角色对白，首次使用公司语音服务，已有语音缓存复用">
    {state==='loading'?<LoaderCircle className="is-spinning"/>:state==='playing'?<Pause/>:<Volume2/>}{state==='loading'?'正在准备语音 · 点击停止':state==='playing'?'暂停朗读':'听这段内容'}
  </button><audio ref={audio} preload="none" onEnded={()=>{if(active.current)void play(index.current+1,epoch.current);}} onError={()=>{active.current=false;setState('idle');setError('本段语音加载失败，请点击继续。');}}/>{error&&<p role="alert">{error}</p>}</div>;
}
