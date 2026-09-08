// Explicit offline editorial operation, never imported by the website.
// Bounded to four public fictional shots. Journal prevents duplicate paid submissions.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { companyFetch, companyAssetUrl } from '../lib/company-gateway.ts';
import { videoResult } from '../lib/media-policy.ts';
const dir='work/yoga-prologue-v1';
const output='public/assets/prologues/yoga-v1';
const style='虚构成人都市婚姻短剧，克制真实的中国电影摄影，横屏16:9，柔和胶片质感，不出现任何字幕、标志、旁白或可读文字，没有裸露、没有亲密性行为、没有儿童出镜。女主36岁中国女性，及肩黑发，米白开衫配鼠尾草绿高领上衣。';
const prompts=[
 '夜晚的家庭餐厅。女主在桌边坐下，39岁短黑发男子穿藏蓝衬衫背对她看手机，桌上两份晚饭已经凉了。她想开口又停住。镜头从两副餐具缓慢移动到两人之间空着的桌面。单一连续镜头。',
 '暖光瑜伽教室。27岁短黑发中国男私教，深灰运动T恤，站在女主一米外递给她一杯温水，微笑倾听。她略显拘谨，接杯后第一次放松地微笑。镜头缓慢靠近温水与两人的神情。保持专业空间，没有身体接触。单一连续镜头。',
 '傍晚瑜伽馆前台。只拍成年女性穿米白开衫的双手：一只手腕戴廉价莲花手链，另一只手握手机，手机屏幕反光没有文字。她犹豫地把银行卡从钱包抽出半截，停住。暖光变冷，镜头缓慢推近手链与银行卡。单一连续镜头。',
 '更衣室独立隔间内，女主已经完整穿好米白开衫和绿色高领上衣。她独自站在关闭的门前，左手握手机，手机忽然亮起但屏幕没有可读文字，右手停在门锁旁，没有打开。她看向手机，又抬头看门。最后画面停在未打开的锁扣和悬停的手。单一连续镜头。',
];
await mkdir(dir,{recursive:true});await mkdir(output,{recursive:true});
let journal;try{journal=JSON.parse(await readFile(`${dir}/jobs.json`,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;journal={shots:prompts.map((prompt,i)=>({index:i,prompt:style+prompt,status:'new'}))};}
const save=()=>writeFile(`${dir}/jobs.json`,JSON.stringify(journal,null,2));
const action=process.argv[2]||'status';
for(const shot of journal.shots){
 if(action==='submit'&&shot.status==='new'){
  shot.status='submitting';await save();
  const r=await companyFetch('/videos',{model:'kling-video-o1',prompt:shot.prompt,seconds:'5',size:'1920x1080',mode:'pro'},45000);
  if(!r.ok){shot.status=`http-${r.status}`;await save();continue;}
  const job=await r.json();const id=job.id||job.task_id;
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(id))throw Error('invalid_job_id');
  shot.id=id;shot.status='queued';await save();
 }
 if(action==='collect'&&shot.id&&shot.status!=='ready'){
  const r=await companyFetch(`/videos/${shot.id}`,undefined,20000);
  if(!r.ok){console.log(`shot ${shot.index+1}: query HTTP ${r.status}`);continue;}
  const result=videoResult(await r.json());
  if(result.status==='ready'){
   const path=`${output}/shot-${shot.index+1}.mp4`;
   let exists=false;try{await access(path);exists=true;}catch{}
   if(!exists){
    const video=await fetch(companyAssetUrl(result.url),{redirect:'error',signal:AbortSignal.timeout(60000)});
    if(!video.ok||Number(video.headers.get('content-length'))>20000000)throw Error('invalid_download');
    const buf=Buffer.from(await video.arrayBuffer());
    if(buf.length>20000000||buf.subarray(4,8).toString()!=='ftyp')throw Error('invalid_mp4');
    await writeFile(path,buf);shot.bytes=buf.length;
   }
   shot.status='ready';await save();
  }else if(result.status==='failed'){shot.status='failed';await save();}
 }
 console.log(`shot ${shot.index+1}: ${shot.status}${shot.bytes?` (${shot.bytes} bytes)`:''}`);
}
