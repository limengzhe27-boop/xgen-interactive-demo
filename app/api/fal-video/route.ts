import sharp from 'sharp/lib/index.js';
import { requestAccount, sameOrigin } from '@/lib/server-auth';
import { imageOwner, imageId, storageConfigured, storageFetch } from '@/lib/server-image-store';
import { findMedia, updateMedia } from '@/lib/server-media-store';
import { falFetch, refreshFalVideo } from '@/lib/server-fal-video';
import { FAL_VIDEO_MODEL, FAL_VIDEO_SECONDS, falFailure, readFalInput, readFalJob } from '@/lib/fal-video';
export const maxDuration=120;
const headers={'Cache-Control':'private, no-store'};
function errorCode(e:unknown){return e instanceof Error && /^fal_[a-z_]+$/.test(e.message)?e.message:'fal_unavailable';}
export async function GET(request:Request){
  try{
    const account=await requestAccount(request,true),owner=imageOwner(request,true,account.id);
    const id=new URL(request.url).searchParams.get('id');
    if(!id){
      let storageReady=false;try{await storageFetch('/rest/v1/demo_media_assets?select=id&limit=0');storageReady=true;}catch{/* Fail closed before billing. */}
      return account.finish(Response.json({configured:!!process.env.FAL_KEY?.trim()&&storageConfigured()&&storageReady,model:FAL_VIDEO_MODEL,seconds:FAL_VIDEO_SECONDS,
        note:'配置就绪不代表余额或实际生成已验证。',perAccountDailyLimit:null}, {headers:{...headers,...(owner?.cookie?{'Set-Cookie':owner.cookie}:{})}}));
    }
    let asset=await findMedia(id);
    if(!asset||asset.owner_id!==owner?.id||asset.model!==FAL_VIDEO_MODEL)return account.finish(Response.json({error:'not_found'},{status:404,headers}));
    asset=await refreshFalVideo(asset);
    let error:string|undefined;
    if(asset.status==='failed')try{error=JSON.parse(asset.task_id??'{}').error;}catch{/* Legacy rows. */}
    return account.finish(Response.json({id,status:asset.status,error,...(asset.status==='ready'?{assetUrl:`/api/media/asset/${id}`}:{})},{headers}));
  }catch(e){return Response.json({error:errorCode(e)},{status:503,headers});}
}
export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:'invalid_origin'},{status:403,headers});
  try{
    const account=await requestAccount(request,true),owner=imageOwner(request,false,account.id);
    if(!owner)return account.finish(Response.json({error:'session_required'},{status:401,headers}));
    if(!process.env.FAL_KEY?.trim())return account.finish(Response.json({error:'fal_not_configured'},{status:503,headers}));
    if(Number(request.headers.get('content-length'))>1_600_000)return Response.json({error:'request_too_large'},{status:413,headers});
    const raw=await request.text();if(raw.length>1_600_000)return Response.json({error:'request_too_large'},{status:413,headers});
    let input;try{input=readFalInput(JSON.parse(raw));}catch{/* Invalid JSON. */}
    if(!input)return account.finish(Response.json({error:'invalid_request'},{status:400,headers}));
    let frame:string|undefined;
    if(input.frame){
      try{const normalized=await sharp(Buffer.from(input.frame.split(',')[1],'base64'),{limitInputPixels:8_000_000}).resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();frame=`data:image/jpeg;base64,${normalized.toString('base64')}`;}
      catch{return account.finish(Response.json({error:'invalid_frame'},{status:400,headers}));}
    }
    // Stable per owner/turn: edited text cannot repurchase an uncertain submission.
    const id=imageId(['fal-native-v1',owner.id,input.turnKey]);
    // Unique primary key remains the cross-instance billing lock. User removed
    // fal trial count quotas; do not change unrelated company speech/video quotas.
    const reservation=await storageFetch('/rest/v1/demo_media_assets?on_conflict=id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({id,owner_id:owner.id,kind:'video',model:FAL_VIDEO_MODEL,status:'reserved',bytes:0})});
    const inserted=await reservation.json() as {id:string}[];
    const existing=inserted.length?null:await findMedia(id);
    if(!inserted.length&&(!existing||existing.owner_id!==owner.id||existing.model!==FAL_VIDEO_MODEL))throw new Error('fal_reservation_failed');
    const claim={status:inserted.length?'claimed':existing!.status};
    const reply=(status:string,reused=false,error?:string)=>account.finish(Response.json({id,status,reused,error,model:FAL_VIDEO_MODEL,...(status==='ready'?{assetUrl:`/api/media/asset/${id}`}:{})},{headers}));
    if(['ready','queued','reserved','failed'].includes(claim.status))return reply(claim.status,true);
    if(claim.status!=='claimed')return account.finish(Response.json({error:claim.status},{status:429,headers}));
    const result=await falFetch(`https://queue.fal.run/${FAL_VIDEO_MODEL}`,{prompt:input.prompt,duration:FAL_VIDEO_SECONDS,resolution:'768P',enable_safety_checker:true,prompt_expansion_mode:'balanced',...(frame?{image_url:frame}:{})});
    if(!result.ok){const detail=(await result.json().catch(()=>({})) as {detail?:unknown}).detail;const error=falFailure(result.status,detail);await updateMedia(id,{status:'failed',task_id:JSON.stringify({error})});return reply('failed',false,error);}
    const job=readFalJob(await result.json());
    await updateMedia(id,{status:'queued',task_id:JSON.stringify(job)});
    return reply('queued');
  }catch(e){return Response.json({error:errorCode(e),message:'提交状态不确定，不自动重提。请按原回合恢复查询。'},{status:503,headers});}
}
