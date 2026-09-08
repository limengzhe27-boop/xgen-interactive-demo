import { requestAccount } from '@/lib/server-auth';
import { imageOwner, storageFetch } from '@/lib/server-image-store';
import { findMedia, mediaPath } from '@/lib/server-media-store';
export async function GET(request:Request, context:{ params:Promise<{id:string}> }) {
  try {
    const account = await requestAccount(request);
    const asset = await findMedia((await context.params).id);
    if (!asset || asset.status!=='ready' || asset.owner_id!==imageOwner(request,false,account.id)?.id) return account.finish(new Response(null,{status:404}));
    const range = request.headers.get('range');
    if (range && !/^bytes=\d*-\d*$/.test(range)) return account.finish(new Response(null,{status:416}));
    const response = await storageFetch(mediaPath(asset.id,asset.kind),{headers:range?{Range:range}:{}});
    const headers = new Headers({'Content-Type':asset.kind==='speech'?'audio/mpeg':'video/mp4','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Vary':'Cookie','Accept-Ranges':'bytes'});
    for (const name of ['content-length','content-range']) { const value=response.headers.get(name);if(value)headers.set(name,value); }
    return account.finish(new Response(response.body,{status:response.status,headers}));
  } catch { return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}}); }
}
