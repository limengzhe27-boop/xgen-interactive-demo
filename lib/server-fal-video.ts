import { isFalVideoModel, falAssetUrl, falFailure, falQueueUrl, mp4HasAudio, readFalJob } from './fal-video';
import { boundedMedia, saveMedia, updateMedia, type MediaAsset } from './server-media-store';
import {readVideoTiming} from './video-timing';
import {mediaLimit} from './media-policy';
export function falPlaybackUrl(asset:MediaAsset):URL|null{
  if(!isFalVideoModel(asset.model)||asset.status!=='queued')return null;
  try{const data=JSON.parse(asset.task_id??'{}');return data.audioValidated===true&&typeof data.playbackUrl==='string'?falAssetUrl(data.playbackUrl):null;}catch{return null;}
}
const saving=new Map<string,Promise<void>>();
// A complete moov/audio handler near the start lets playback begin without
// downloading mdat first. Unknown layouts fall back to the existing full check.
export async function probeFalAudio(url:string):Promise<{audio:boolean;buffer?:Buffer}>{
  const r=await fetch(falAssetUrl(url),{headers:{Range:'bytes=0-262143'},redirect:'error',signal:AbortSignal.timeout(10000)});
  if(r.status===200){const buffer=await boundedMedia(r,'video');return {audio:mp4HasAudio(buffer),buffer};}
  const range=/^bytes 0-(\d+)\/(\d+)$/.exec(r.headers.get('content-range')||'');
  if(r.status!==206||!range||Number(range[2])>mediaLimit('video')||Number(range[1])>=Number(range[2])){await r.body?.cancel();return {audio:false};}
  const reader=r.body?.getReader();if(!reader)return {audio:false};
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>262144)return {audio:false};chunks.push(part.value);}}finally{await reader.cancel();}
  const bytes=Buffer.concat(chunks);
  return {audio:bytes.length===Number(range[1])+1&&bytes.subarray(4,8).toString()==='ftyp'&&mp4HasAudio(bytes)};
}
export async function falFetch(url: string | URL, body?: unknown) {
  const key=process.env.FAL_KEY?.trim();
  if(!key)throw new Error('fal_not_configured');
  return fetch(url,{method:body?'POST':'GET',headers:{Authorization:`Key ${key}`,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(body?45000:20000),cache:'no-store'});
}
export async function refreshFalVideo(asset:MediaAsset,defer?:(work:()=>Promise<void>)=>void|Promise<void>):Promise<MediaAsset> {
  if(!isFalVideoModel(asset.model)||asset.status!=='queued'||!asset.task_id)return asset;
  const job=readFalJob(JSON.parse(asset.task_id));
  const timing=readVideoTiming(JSON.parse(asset.task_id).timing);
  const playback=falPlaybackUrl(asset);
  if(playback&&saving.has(asset.id))return asset;
  const fail=async(reason:string)=>{await updateMedia(asset.id,{status:'failed',task_id:JSON.stringify({error:reason})});return {...asset,status:'failed',task_id:JSON.stringify({error:reason})};};
  let outputUrl=playback?.href;
  if(!outputUrl){
  const r=await falFetch(falQueueUrl(job.status_url));
  if(!r.ok)throw new Error(falFailure(r.status,(await r.json().catch(()=>({})) as {detail?:unknown}).detail));
  const status=await r.json() as {status?:string;error?:unknown};
  if(status.error)return fail('fal_generation_failed');
  if(status.status!=='COMPLETED')return asset;
  timing.observedCompleteAt=Date.now();
  const result=await falFetch(falQueueUrl(job.response_url));
  if(!result.ok){if(result.status>=500)throw new Error('fal_result_unavailable');return fail(falFailure(result.status,(await result.json().catch(()=>({})) as {detail?:unknown}).detail));}
  const data=await result.json() as {video?:{url?:unknown}};
  if(typeof data.video?.url!=='string')return fail('fal_invalid_output');
  outputUrl=falAssetUrl(data.video.url).href;
  }
  const downloadStart=Date.now();
  let buffer:Buffer|undefined;
  if(defer&&!playback){
    const probe=await probeFalAudio(outputUrl).catch(()=>({audio:false,buffer:undefined}));buffer=probe.buffer;
    if(probe.audio&&!buffer){
      const task_id=JSON.stringify({...job,timing,playbackUrl:outputUrl,audioValidated:true});
      await updateMedia(asset.id,{status:'queued',task_id});
      const playable={...asset,task_id};
      await defer(async()=>{try{await refreshFalVideo(playable);}catch{console.warn('fal_archive_pending',{id:asset.id});}});
      return playable;
    }
  }
  if(!buffer){const download=await fetch(falAssetUrl(outputUrl),{redirect:'error',signal:AbortSignal.timeout(60000)});buffer=await boundedMedia(download,'video');}
  timing.downloadMs=Date.now()-downloadStart;
  if(!mp4HasAudio(buffer))return fail('fal_missing_native_audio');
  if(defer){
    const task_id=JSON.stringify({...job,timing,playbackUrl:outputUrl,audioValidated:true});
    await updateMedia(asset.id,{status:'queued',task_id});
    await defer(async()=>{
      if(saving.has(asset.id))return saving.get(asset.id);
      const work=(async()=>{const start=Date.now();await saveMedia(asset,buffer!,()=>{timing.storeMs=Date.now()-start;return JSON.stringify({...job,timing});});})();
      saving.set(asset.id,work);
      try{await work;}catch{console.warn('fal_archive_pending',{id:asset.id});}finally{saving.delete(asset.id);}
    });
    return {...asset,task_id};
  }
  const storeStart=Date.now();
  await saveMedia(asset,buffer,()=>{timing.storeMs=Date.now()-storeStart;return JSON.stringify({...job,timing});});
  return {...asset,status:'ready',task_id:JSON.stringify({...job,timing})};
}
