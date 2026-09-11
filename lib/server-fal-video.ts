import { isFalVideoModel, falAssetUrl, falFailure, falQueueUrl, mp4HasAudio, readFalJob } from './fal-video';
import { boundedMedia, saveMedia, updateMedia, type MediaAsset } from './server-media-store';
import {readVideoTiming} from './video-timing';
export function falPlaybackUrl(asset:MediaAsset):URL|null{
  if(!isFalVideoModel(asset.model)||asset.status!=='queued')return null;
  try{const data=JSON.parse(asset.task_id??'{}');return data.audioValidated===true&&typeof data.playbackUrl==='string'?falAssetUrl(data.playbackUrl):null;}catch{return null;}
}
const saving=new Map<string,Promise<void>>();
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
  const download=await fetch(falAssetUrl(outputUrl),{redirect:'error',signal:AbortSignal.timeout(60000)});
  const buffer=await boundedMedia(download,'video');
  timing.downloadMs=Date.now()-downloadStart;
  if(!mp4HasAudio(buffer))return fail('fal_missing_native_audio');
  if(defer){
    const task_id=JSON.stringify({...job,timing,playbackUrl:outputUrl,audioValidated:true});
    await updateMedia(asset.id,{status:'queued',task_id});
    await defer(async()=>{
      if(saving.has(asset.id))return saving.get(asset.id);
      const work=(async()=>{const start=Date.now();await saveMedia(asset,buffer,()=>{timing.storeMs=Date.now()-start;return JSON.stringify({...job,timing});});})();
      saving.set(asset.id,work);
      try{await work;}catch{console.warn('fal_archive_pending',{id:asset.id});}finally{saving.delete(asset.id);}
    });
    return {...asset,task_id};
  }
  const storeStart=Date.now();
  await saveMedia(asset,buffer,()=>{timing.storeMs=Date.now()-storeStart;return JSON.stringify({...job,timing});});
  return {...asset,status:'ready',task_id:JSON.stringify({...job,timing})};
}
