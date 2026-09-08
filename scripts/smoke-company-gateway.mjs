// Explicit paid smoke test: one synthetic image, short utterance, and five-second video.
// Never load personal archives. Persist only guest cookie + generated asset IDs for polling.
import { readFile, writeFile } from 'node:fs/promises';
const mode=process.argv[2];
const origin=process.argv[3]||'http://127.0.0.1:3102';
if(!['http://127.0.0.1:3102','https://xgen-interactive-demo.vercel.app'].includes(origin)) throw Error('unexpected_origin');
const statePath='/private/tmp/xgen-company-gateway-smoke.json';
let state=mode==='create'?{origin}:JSON.parse(await readFile(statePath,'utf8'));
if(state.origin!==origin) throw Error('origin_changed');
async function api(path,body) {
  const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'x-xgen-account':'guest','Content-Type':'application/json',...(state.cookie?{Cookie:state.cookie}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(115000)});
  const cookie=r.headers.getSetCookie().find(s=>s.startsWith('xgen-image-owner='));if(cookie) state.cookie=cookie.split(';')[0];
  const value=await r.json();console.log(path,r.status,JSON.stringify(value));return value;
}
if(mode==='create') {
  await api('/api/image');await api('/api/media');
  state.image=await api('/api/image',{purpose:'scene',requestId:1,sceneId:'company-synthetic-cat',prompt:'A small orange cat sits beside a sunlit window in an empty quiet room. Warm cinematic light. No people, no text.',seed:86753});
  await writeFile(statePath,JSON.stringify(state),{mode:0o600});
  state.speech=await api('/api/media',{kind:'speech',text:'你好，欢迎来到小世界。窗边的小猫正在晒太阳。',voice:'zh_female_vv_uranus_bigtts',confirmed:true});
  await writeFile(statePath,JSON.stringify(state),{mode:0o600});
  state.video=await api('/api/media',{kind:'video',text:'一间空的安静房间，窗边一只橘猫抬头看向阳光。缓慢推近的镜头，暖色自然光，没有人物，没有文字。',confirmed:true});
} else if(mode==='query') {
  for(const kind of ['speech','video'])if(state[kind]?.id) { const next=await api('/api/media?id='+state[kind].id); if(next.id)state[kind]=next; }
} else if(mode==='reuse') {
  const speech=await api('/api/media',{kind:'speech',text:'你好，欢迎来到小世界。窗边的小猫正在晒太阳。',voice:'zh_female_vv_uranus_bigtts',confirmed:true});
  if(!speech.reused||speech.id!==state.speech.id)throw Error('reuse_failed');
} else throw Error('use create | query | reuse');
await writeFile(statePath,JSON.stringify(state),{mode:0o600});
for(const kind of ['image','speech','video']) if(state[kind]?.assetUrl) {
  const r=await fetch(origin+state[kind].assetUrl,{headers:{Cookie:state.cookie},signal:AbortSignal.timeout(30000)});
  const bytes=await r.arrayBuffer();console.log('asset',kind,r.status,r.headers.get('content-type'),bytes.byteLength);
  const denied=await fetch(origin+state[kind].assetUrl);await denied.arrayBuffer();console.log('other_guest',kind,denied.status);
}
