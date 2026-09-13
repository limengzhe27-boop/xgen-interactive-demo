import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import sharp from 'sharp';
import {companyFetch,companyAssetUrl} from '../lib/company-gateway.ts';
import {videoResult} from '../lib/media-policy.ts';
import {compileNativeDirectedPrologue} from '../lib/prologue-direction.ts';
const dir='work/centuries-prologue-20260914',file=`${dir}/job.json`,action=process.argv[2];
await mkdir(dir,{recursive:true});let job;
try{job=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(action==='submit'){
 if(job)throw Error('Existing attempt: do not resubmit');
 const plan=JSON.parse(await readFile('docs/centuries-prologue.plan.json','utf8'));
 const direction=JSON.parse(await readFile('docs/centuries-prologue.direction.json','utf8'));
 const prompt=compileNativeDirectedPrologue(plan,direction).shots[0].nativeTextToVideoPrompt+'\n图片仅为阿蘅外形参考，不作首帧。15秒16:9真人电影，保持参考脸型和红围巾，原生同期音画。';
 const image='data:image/png;base64,'+(await sharp('public/assets/expansion/cultivation-three-centuries/r2.webp').png().toBuffer()).toString('base64');
 job={status:'submitting',model:'doubao-seedance-2-5-260628',attemptedAt:new Date().toISOString(),prompt,reference:'cultivation-three-centuries/r2.webp',maximumSubmissions:1,review:'Paper self-review only; no completed film yet; exact fees unknown.'};
 const lock=await open(file,'wx');await lock.writeFile(JSON.stringify(job,null,2));await lock.close();
 try{
  const response=await companyFetch('/videos',{model:job.model,prompt,metadata:{content:[{type:'image_url',role:'reference_image',image_url:{url:image}}],generate_audio:true,duration:15,ratio:'16:9',resolution:'720p',watermark:false}},55000);
  const body=await response.json();job.http=response.status;
  if(!response.ok){job.status='failed';job.error=JSON.stringify(body.error??body).slice(0,600);}
  else{const id=body.id??body.task_id;if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(id))throw Error('No reliable task id');job.id=id;job.status='queued';}
 }catch(e){job.status='uncertain';job.error=e.message;}
 await writeFile(file,JSON.stringify(job,null,2));
}
if(action==='collect'&&job?.id&&!['ready','failed'].includes(job.status)){
 const response=await companyFetch(`/videos/${job.id}`,undefined,25000);
 if(!response.ok)throw Error(`Query ${response.status}`);
 const body=await response.json(),result=videoResult(body);job.status=result.status;
 if(result.status==='ready'){
  const response=await fetch(companyAssetUrl(result.url),{redirect:'error',signal:AbortSignal.timeout(55000)});
  if(!response.ok)throw Error('Download failed');const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>100000000||bytes.subarray(4,8).toString()!=='ftyp')throw Error('Invalid media');
  await writeFile(`${dir}/original.mp4`,bytes);job.bytes=bytes.length;
 }
 if(result.status==='failed')job.error=JSON.stringify(body.error??body).slice(0,600);
 await writeFile(file,JSON.stringify(job,null,2));
}
console.log(JSON.stringify({status:job?.status,id:job?.id,error:job?.error,bytes:job?.bytes}));
