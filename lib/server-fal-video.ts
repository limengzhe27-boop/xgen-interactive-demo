import { isFalVideoModel, falAssetUrl, falFailure, falQueueUrl, mp4HasAudio, readFalJob } from './fal-video';
import { boundedMedia, saveMedia, updateMedia, type MediaAsset } from './server-media-store';
import {readVideoTiming} from './video-timing';
export async function falFetch(url: string | URL, body?: unknown) {
  const key=process.env.FAL_KEY?.trim();
  if(!key)throw new Error('fal_not_configured');
  return fetch(url,{method:body?'POST':'GET',headers:{Authorization:`Key ${key}`,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(body?45000:20000),cache:'no-store'});
}
export async function refreshFalVideo(asset:MediaAsset):Promise<MediaAsset> {
  if(!isFalVideoModel(asset.model)||asset.status!=='queued'||!asset.task_id)return asset;
  const job=readFalJob(JSON.parse(asset.task_id));
  const timing=readVideoTiming(JSON.parse(asset.task_id).timing);
  const fail=async(reason:string)=>{await updateMedia(asset.id,{status:'failed',task_id:JSON.stringify({error:reason})});return {...asset,status:'failed',task_id:JSON.stringify({error:reason})};};
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
  const downloadStart=Date.now();
  const download=await fetch(falAssetUrl(data.video.url),{redirect:'error',signal:AbortSignal.timeout(60000)});
  const buffer=await boundedMedia(download,'video');
  timing.downloadMs=Date.now()-downloadStart;
  if(!mp4HasAudio(buffer))return fail('fal_missing_native_audio');
  const storeStart=Date.now();
  await saveMedia(asset,buffer,()=>{timing.storeMs=Date.now()-storeStart;return JSON.stringify({...job,timing});});
  return {...asset,status:'ready',task_id:JSON.stringify({...job,timing})};
}
