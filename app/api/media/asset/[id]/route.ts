import { requestAccount } from '@/lib/server-auth';
import { imageOwner, storageFetch } from '@/lib/server-image-store';
import { findMedia, mediaPath } from '@/lib/server-media-store';
import {falPlaybackUrl,refreshFalVideo} from '@/lib/server-fal-video';
import {after} from 'next/server.js';
export const maxDuration=120;
export async function GET(request:Request, context:{ params:Promise<{id:string}> }) {
  try {
    const account = await requestAccount(request);
    const asset = await findMedia((await context.params).id);
    if (!asset || asset.owner_id!==imageOwner(request,false,account.id)?.id) return account.finish(new Response(null,{status:404}));
    const provisional=falPlaybackUrl(asset);
    if(asset.status!=='ready'&&!provisional)return account.finish(new Response(null,{status:404}));
    const range = request.headers.get('range');
    if (range && !/^bytes=\d*-\d*$/.test(range)) return account.finish(new Response(null,{status:416}));
    if(provisional)after(async()=>{try{const latest=await findMedia(asset.id);if(latest)await refreshFalVideo(latest);}catch{console.warn('fal_archive_retry_pending',{id:asset.id});}});
    const response = provisional?await fetch(provisional,{headers:range?{Range:range}:{},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(60000)}):await storageFetch(mediaPath(asset.id,asset.kind),{headers:range?{Range:range}:{}});
    const headers = new Headers({'Content-Type':asset.kind==='speech'?'audio/mpeg':'video/mp4','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Vary':'Cookie','Accept-Ranges':'bytes'});
    for (const name of ['content-length','content-range']) { const value=response.headers.get(name);if(value)headers.set(name,value); }
    return account.finish(new Response(response.body,{status:response.status,headers}));
  } catch { return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}}); }
}
