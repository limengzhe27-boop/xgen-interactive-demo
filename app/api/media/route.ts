import { requestAccount, sameOrigin } from '@/lib/server-auth';
import { companyFetch, companyGateway, companyModel } from '@/lib/company-gateway';
import { imageId, imageOwner, storageConfigured, storageFetch } from '@/lib/server-image-store';
import { boundedMedia, findMedia, refreshVideo, saveMedia, updateMedia } from '@/lib/server-media-store';
import { readMediaInput, videoPayload } from '@/lib/media-policy';
export const maxDuration = 120;
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  try {
    const account = await requestAccount(request, Boolean(id));
    const owner = imageOwner(request, true, account.id);
    if (!id) {
      let ready = false;
      try { await storageFetch('/rest/v1/demo_media_assets?select=id&limit=0'); ready = true; } catch { /* fail closed before billing */ }
      let configured = false;
      let models = { speech: 'doubao-tts', video: 'kling-video-o1' };
      try {
        configured = Boolean(companyGateway()) && storageConfigured() && ready;
        models = { speech: companyModel('speech'), video: companyModel('video') };
      } catch { /* fail closed if config invalid */ }
      return account.finish(Response.json({ configured, provider: 'yibu', models }, { headers: owner?.cookie ? { 'Set-Cookie': owner.cookie } : {} }));
    }
    let asset = await findMedia(id);
    if (!asset || asset.owner_id !== owner?.id) return account.finish(Response.json({ error:'not_found' }, { status:404 }));
    asset = await refreshVideo(asset);
    return account.finish(Response.json({ id, kind:asset.kind, status:asset.status, ...(asset.status === 'ready' ? { assetUrl:`/api/media/asset/${id}` } : {}) }));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'account_changed') {
      return Response.json({ error:'account_changed' }, { status:409, headers: { 'Cache-Control':'no-store' } });
    }
    return Response.json({ error:'media_unavailable' }, { status:503, headers: { 'Cache-Control':'no-store' } });
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error:'invalid_origin' }, { status:403 });
  try {
    const account = await requestAccount(request, true);
    const owner = imageOwner(request, false, account.id);
    if (!owner) return account.finish(Response.json({ error:'session_required' }, { status:401 }));
    const raw = await request.text();
    if (raw.length > 12000) return account.finish(Response.json({ error:'request_too_large' }, { status:413 }));
    let parsed; try { parsed = JSON.parse(raw); } catch { return account.finish(Response.json({ error:'invalid_request' }, { status:400 })); }
    const input = readMediaInput(parsed);
    if (!input) return account.finish(Response.json({ error:'invalid_request' }, { status:400 }));
    if (!companyGateway()) return account.finish(Response.json({ error:'model_not_configured' }, { status:503 }));
    const model = companyModel(input.kind);
    const id = imageId(['company-media-v1',owner.id,input.kind,model,input.text,input.voice]);
    const reservation = await storageFetch('/rest/v1/rpc/demo_claim_media', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ p_id:id,p_owner:owner.id,p_kind:input.kind,p_model:model }) });
    const claim = await reservation.json() as { status:string };
    const reply = (status:string, reused = false) => account.finish(Response.json({ id,kind:input.kind,status,reused,provider:'yibu',model,...(status==='ready'?{assetUrl:`/api/media/asset/${id}`}:{}) }));
    if (['ready','queued','reserved','failed'].includes(claim.status)) return reply(claim.status,true);
    if (claim.status !== 'claimed') return account.finish(Response.json({ error:claim.status }, { status:429 }));
    // A lost/uncertain submit remains reserved. Repeated POSTs cannot pay twice.
    if (input.kind === 'speech') {
      const response = await companyFetch('/audio/speech', { model,input:input.text,voice:input.voice,response_format:'mp3',speed:1 }, 60000);
      if (!response.ok) { await updateMedia(id,{status:'failed'}); return reply('failed'); }
      await saveMedia({id,kind:'speech'},await boundedMedia(response,'speech'));
      return reply('ready');
    }
    const response = await companyFetch('/videos',videoPayload(model,input.text),45000);
    if (!response.ok) { await updateMedia(id,{status:'failed'}); return reply('failed'); }
    const job = await response.json() as { id?:string; task_id?:string };
    const task = job.id || job.task_id;
    if (!task || !/^[A-Za-z0-9_-]{1,160}$/.test(task)) throw new Error('invalid_video_job');
    await updateMedia(id,{status:'queued',task_id:task});
    return reply('queued');
  } catch { return Response.json({ error:'media_unavailable_no_auto_retry' }, { status:503, headers:{'Cache-Control':'no-store'} }); }
}
