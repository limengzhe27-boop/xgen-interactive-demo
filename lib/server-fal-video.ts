import { FAL_VIDEO_MODEL, falAssetUrl, falFailure, falQueueUrl, mp4HasAudio, readFalJob } from './fal-video';
import { boundedMedia, saveMedia, updateMedia, type MediaAsset } from './server-media-store';
export async function falFetch(url: string | URL, body?: unknown) {
  const key=process.env.FAL_KEY?.trim();
  if(!key)throw new Error('fal_not_configured');
  return fetch(url,{method:body?'POST':'GET',headers:{Authorization:`Key ${key}`,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(body?45000:20000),cache:'no-store'});
}
export async function refreshFalVideo(asset:MediaAsset):Promise<MediaAsset> {
  if(asset.model!==FAL_VIDEO_MODEL||asset.status!=='queued'||!asset.task_id)return asset;
  const job=readFalJob(JSON.parse(asset.task_id));
  const fail=async(reason:string)=>{await updateMedia(asset.id,{status:'failed',task_id:JSON.stringify({error:reason})});return {...asset,status:'failed',task_id:JSON.stringify({error:reason})};};
  const r=await falFetch(falQueueUrl(job.status_url));
  if(!r.ok)throw new Error(falFailure(r.status,(await r.json().catch(()=>({})) as {detail?:unknown}).detail));
  const status=await r.json() as {status?:string;error?:unknown};
  if(status.error)return fail('fal_generation_failed');
  if(status.status!=='COMPLETED')return asset;
  const result=await falFetch(falQueueUrl(job.response_url));
  if(!result.ok){if(result.status>=500)throw new Error('fal_result_unavailable');return fail(falFailure(result.status,(await result.json().catch(()=>({})) as {detail?:unknown}).detail));}
  const data=await result.json() as {video?:{url?:unknown}};
  if(typeof data.video?.url!=='string')return fail('fal_invalid_output');
  const download=await fetch(falAssetUrl(data.video.url),{redirect:'error',signal:AbortSignal.timeout(60000)});
  const buffer=await boundedMedia(download,'video');
  if(!mp4HasAudio(buffer))return fail('fal_missing_native_audio');
  await saveMedia(asset,buffer);
  return {...asset,status:'ready'};
}
