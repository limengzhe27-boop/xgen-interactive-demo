export const FAL_VIDEO_MODEL = 'minimax/h3-max-turbo/image-to-video';
export function isFalVideoModel(model:string){
  return model===FAL_VIDEO_MODEL||model==='minimax/h3-max/image-to-video';
}
export const FAL_VIDEO_SECONDS = 15;
export type FalVideoInput = { confirmed: true; turnKey: string; prompt: string; frame: string | null };
export function readFalInput(value: unknown): FalVideoInput | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.confirmed !== true || typeof v.turnKey !== 'string' || !/^[a-zA-Z0-9:_-]{8,120}$/.test(v.turnKey)
    || typeof v.prompt !== 'string' || v.prompt.trim().length < 20 || v.prompt.length > 6500
    || !(v.frame === null || typeof v.frame === 'string' && v.frame.length < 1_500_000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(v.frame))) return null;
  return { confirmed:true, turnKey:v.turnKey, prompt:v.prompt.trim(), frame:v.frame as string | null };
}
export function falQueueUrl(value: string) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.hostname !== 'queue.fal.run' || u.port || u.username || u.password || u.search || u.hash
    || !/^\/minimax\/h3-max(?:-turbo)?(?:\/image-to-video)?\/requests\/[a-zA-Z0-9_-]+(?:\/(?:status|cancel))?$/.test(u.pathname)) throw new Error('invalid_fal_queue_url');
  return u;
}
export function falAssetUrl(value: string) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || !(u.hostname === 'fal.media' || u.hostname.endsWith('.fal.media')) || u.username || u.password || u.port) throw new Error('invalid_fal_asset_url');
  return u;
}
export type FalJob = { status_url:string; response_url:string; request_id:string };
export function readFalJob(value: unknown): FalJob {
  const j=value as Partial<FalJob>;
  if (!j || typeof j.request_id !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(j.request_id)
    || typeof j.status_url !== 'string' || typeof j.response_url !== 'string') throw new Error('invalid_fal_job');
  const status=falQueueUrl(j.status_url), result=falQueueUrl(j.response_url);
  if (!status.pathname.endsWith(`/requests/${j.request_id}/status`) || !result.pathname.endsWith(`/requests/${j.request_id}`)) throw new Error('invalid_fal_job');
  return {request_id:j.request_id,status_url:status.href,response_url:result.href};
}
export function falFailure(status: number, detail: unknown) {
  if (status === 403 && /exhausted balance|insufficient|balance/i.test(String(detail))) return 'fal_balance_exhausted';
  if (status === 401 || status === 403) return 'fal_access_denied';
  if (status === 422) return 'fal_input_rejected';
  if (status === 429) return 'fal_rate_limited';
  return 'fal_generation_failed';
}
// Walk ISO BMFF boxes. Audio presence is not a claim of intelligible dialogue.
export function mp4HasAudio(bytes: Uint8Array): boolean {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const word=(p:number)=>String.fromCharCode(...bytes.subarray(p,p+4));
  function walk(start:number,end:number,depth:number):boolean {
    if(depth>4)return false;
    for(let p=start;p+8<=end;){
      let size=view.getUint32(p);let header=8;
      if(size===1){if(p+16>end)return false;const big=view.getBigUint64(p+8);if(big>BigInt(end-p))return false;size=Number(big);header=16;}
      if(size===0)size=end-p;
      if(size<header||p+size>end)return false;
      const type=word(p+4);
      if(type==='hdlr' && depth===3 && size>=header+12 && word(p+header+8)==='soun')return true;
      if((depth===0&&type==='moov'||depth===1&&type==='trak'||depth===2&&type==='mdia')&&walk(p+header,p+size,depth+1))return true;
      p+=size;
    }return false;
  }return walk(0,bytes.length,0);
}
