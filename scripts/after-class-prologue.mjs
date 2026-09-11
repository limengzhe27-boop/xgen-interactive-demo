// One authorized submission per role; status reads never resubmit or switch providers.
import {readFile,writeFile,open,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {companyFetch,companyAssetUrl} from '../lib/company-gateway.ts';
import {videoResult} from '../lib/media-policy.ts';
import {compileNativeDirectedPrologue} from '../lib/prologue-direction.ts';
const [action='status']=process.argv.slice(2);
if(!['submit','status','collect'].includes(action))throw Error('unsupported action');
const directory='work/after-class-prologues',file=`${directory}/lin-job.json`;
await mkdir(directory,{recursive:true});
let job;try{job=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(action==='submit'){
 if(job)throw Error('Already attempted. Inspect the existing request, never resubmit.');
 const plan=JSON.parse(await readFile('docs/after-class-lin-prologue.plan.json','utf8'));
 const direction=JSON.parse(await readFile('docs/after-class-lin-prologue.direction.json','utf8'));
 const prompt=compileNativeDirectedPrologue(plan,direction).shots[0].nativeTextToVideoPrompt+'\n真人电影质感。图片1仅为虚构角色周野的外形参考，不作为首帧；林小满第一人称。原生同期声音，15秒，16:9，不添加字幕。';
 const reference='data:image/png;base64,'+(await sharp('public/assets/after-class-v1/zhou-story-v2.webp').png().toBuffer()).toString('base64');
 job={status:'submitting',model:'doubao-seedance-2-5-260628',role:'林小满',attemptedAt:new Date().toISOString(),prompt,reference:'zhou-story-v2.webp',maximumSubmissions:1,nativeAudioRequested:true,review:'Paper/preflight only; user requested no frame QA; actual bill unknown.'};
 const lock=await open(file,'wx');await lock.writeFile(JSON.stringify(job,null,2));await lock.close();
 try{
  const r=await companyFetch('/videos',{model:job.model,prompt,metadata:{content:[{type:'image_url',role:'reference_image',image_url:{url:reference}}],generate_audio:true,duration:15,ratio:'16:9',resolution:'720p',watermark:false}},55000);
  const body=await r.json();job.httpStatus=r.status;
  if(!r.ok){job.status='failed';job.error=String(body.error?.message??body.message??'rejected').slice(0,400);}
  else{const id=body.id??body.task_id;if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(id))throw Error('uncertain task id');job.id=id;job.status='queued';}
 }catch(e){job.status='uncertain_no_retry';job.error=e.message;}
 await writeFile(file,JSON.stringify(job,null,2));
}
if(action==='collect'&&job?.id&&!['ready','failed'].includes(job.status)){
 const r=await companyFetch(`/videos/${job.id}`,undefined,25000);if(!r.ok)throw Error(`status ${r.status}`);
 const body=await r.json(),result=videoResult(body);job.status=result.status;job.checkedAt=new Date().toISOString();
 if(result.status==='ready'){
  const asset=await fetch(companyAssetUrl(result.url),{redirect:'error',signal:AbortSignal.timeout(55000)});if(!asset.ok)throw Error('asset unavailable');
  const bytes=Buffer.from(await asset.arrayBuffer());if(bytes.length>100000000||bytes.subarray(4,8).toString()!=='ftyp')throw Error('invalid mp4');
  await writeFile(`${directory}/lin-original.mp4`,bytes);job.bytes=bytes.length;
 }
 if(result.status==='failed')job.error=String(body.error?.message??body.message??'provider failed').slice(0,400);
 await writeFile(file,JSON.stringify(job,null,2));
}
console.log(JSON.stringify({status:job?.status,id:job?.id,error:job?.error,bytes:job?.bytes}));
