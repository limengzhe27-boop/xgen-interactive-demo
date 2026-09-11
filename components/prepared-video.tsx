'use client';
import {useLayoutEffect,useRef,useState,type RefObject,type VideoHTMLAttributes} from 'react';
import {videoSlots,type VideoSlots} from '@/lib/video-slots';

type Props=VideoHTMLAttributes<HTMLVideoElement>&{src:string;warmSrc:string;player:RefObject<HTMLVideoElement|null>;onPrepared:()=>void};
export function PreparedVideo({src,warmSrc,player,onPrepared,...props}:Props){
  const elements=useRef<(HTMLVideoElement|null)[]>([null,null]);
  const [slots,setSlots]=useState<VideoSlots>({active:0,sources:[src,warmSrc]});
  const next=videoSlots(slots,src,warmSrc);
  if(next!==slots)setSlots(next);
  useLayoutEffect(()=>{
    const active=elements.current[slots.active];player.current=active;
    const idle=elements.current[1-slots.active];if(idle){idle.muted=true;idle.pause();}
    if(active&&active.readyState>=2&&active.videoWidth>0)onPrepared();
  },[slots,player,onPrepared]);
  useLayoutEffect(()=>()=>{for(const video of elements.current){video?.pause();video?.removeAttribute('src');video?.load();}player.current=null;},[player]);
  return <>{slots.sources.map((source,i)=>{
    const active=i===slots.active;
    return <video key={i} {...(active?props:{})} ref={node=>{elements.current[i]=node;}} src={source||undefined}
      playsInline preload={source?'auto':'none'} muted={!active} aria-hidden={!active} tabIndex={active?undefined:-1}
      style={active?props.style:{position:'absolute',width:1,height:1,opacity:0,pointerEvents:'none'}}/>;
  })}</>;
}
