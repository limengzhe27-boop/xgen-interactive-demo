import {readFile, writeFile, open, mkdir} from 'node:fs/promises';
import {companyFetch, companyAssetUrl} from '../lib/company-gateway.ts';
import {videoResult} from '../lib/media-policy.ts';
import {compileNativeDirectedPrologue} from '../lib/prologue-direction.ts';
import {mp4HasAudio} from '../lib/fal-video.ts';
const [id, action] = process.argv.slice(2);
if (!['beauties-native-v1','peach-native-v1'].includes(id) || !['submit','collect'].includes(action)) throw Error('Use an approved opening id and submit/collect');
const dir=`work/${id}`, file=`${dir}/job.json`;
await mkdir(dir,{recursive:true});
let job;
try { job=JSON.parse(await readFile(file,'utf8')); } catch(e) { if(e.code!=='ENOENT') throw e; }
if(action==='submit') {
  if(job) throw Error('Already attempted; collect the existing job, do not resubmit');
  const plan=JSON.parse(await readFile(`docs/prologues/${id}/plan.json`,'utf8'));
  const direction=JSON.parse(await readFile(`docs/prologues/${id}/direction.json`,'utf8'));
  const compiled=compileNativeDirectedPrologue(plan,direction);
  const prompt='15秒原生有声写实故事开场，严格第一人称，人物、动作、中文对白同期生成。正常速度演出三个连续动作节拍，不是静态图片运镜。不要字幕、旁白或片尾。\n'+compiled.shots[0].nativeTextToVideoPrompt;
  job={status:'submitting',model:'doubao-seedance-2-5-260628',seconds:15,prompt,attemptedAt:new Date().toISOString(),maximumSubmissions:1,nativeAudioRequired:true,review:'User requested no frame extraction or visual review; only file/audio-track presence is checked.'};
  const lock=await open(file,'wx'); await lock.writeFile(JSON.stringify(job,null,2)); await lock.close();
  let response;
  try { response=await companyFetch('/videos',{model:job.model,prompt,metadata:{generate_audio:true,duration:15,ratio:'16:9',resolution:'720p',watermark:false}},60000); }
  catch(error) { job.status=error.cause?.code==='ENOTFOUND'?'not_sent':'uncertain'; job.transportError=error.cause?.code??'unknown'; await writeFile(file,JSON.stringify(job,null,2)); throw error; }
  const raw=await response.json(); job.httpStatus=response.status;
  if(!response.ok) { job.status='failed'; job.error=String(raw.error?.message??raw.message??'Submission rejected').slice(0,500); }
  else { job.id=raw.id??raw.task_id; job.status=job.id?'queued':'uncertain'; }
  await writeFile(file,JSON.stringify(job,null,2));
} else if(job?.id && job.status!=='ready') {
  const response=await companyFetch(`/videos/${job.id}`,undefined,25000);
  if(!response.ok) throw Error(`Status HTTP ${response.status}`);
  const raw=await response.json(), result=videoResult(raw);
  job.status=result.status;
  if(result.status==='ready') {
    const response=await fetch(companyAssetUrl(result.url),{redirect:'error',signal:AbortSignal.timeout(60000)});
    if(!response.ok) throw Error(`Asset HTTP ${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer());
    await writeFile(`${dir}/original.mp4`,bytes);
    job.bytes=bytes.length; job.hasAudio=mp4HasAudio(bytes);
    if(!job.hasAudio) { job.status='failed'; job.error='No audio track; original preserved, no automatic regeneration'; }
    else { await mkdir(`public/assets/prologues/${id}`,{recursive:true}); await writeFile(`public/assets/prologues/${id}/preview.mp4`,bytes); }
  }
  if(result.status==='failed') job.error=String(raw.error?.message??raw.message??'Provider generation failed').slice(0,500);
  await writeFile(file,JSON.stringify(job,null,2));
}
console.log(JSON.stringify({opening:id,status:job?.status,id:job?.id,http:job?.httpStatus,error:job?.error,bytes:job?.bytes,hasAudio:job?.hasAudio}));
