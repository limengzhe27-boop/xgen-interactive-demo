import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync,existsSync } from 'node:fs';
import { fileURLToPath,pathToFileURL } from 'node:url';
import ts from 'typescript';
const root=fileURLToPath(new URL('../',import.meta.url));
registerHooks({resolve(s,c,next){
  if(s.startsWith('@/'))for(const suffix of ['.ts','.tsx'])if(existsSync(root+s.slice(2)+suffix))return next(pathToFileURL(root+s.slice(2)+suffix).href,c);
  if(s.startsWith('.')&&c.parentURL?.startsWith('file:'))for(const suffix of ['.ts','.tsx']){const u=new URL(s+suffix,c.parentURL);if(existsSync(u))return next(u.href,c);}
  return next(s,c);
},load(u,c,next){if(u.startsWith('file:')&&/\.tsx?$/.test(u))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(u),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};return next(u,c);}});
const route=await import('../app/api/media/route.ts'), assetRoute=await import('../app/api/media/asset/[id]/route.ts');
const {imageOwner}=await import('../lib/server-image-store.ts');
const {boundedMedia}=await import('../lib/server-media-store.ts');
test('media generation, queries and assets are idempotent and owner-isolated',async()=>{
  Object.assign(process.env,{SUPABASE_URL:'https://storage.test',SUPABASE_SECRET_KEY:'synthetic',IMAGE_SESSION_SECRET:'test',YIBU_API_KEY:'synthetic'});
  const origin='http://localhost:3000';const owner=imageOwner(new Request(origin),true);const other=imageOwner(new Request(origin),true);
  const rows=new Map(),objects=new Map();let calls=0;let quota=false;let videoCompleted=false;
  const original=globalThis.fetch;
  globalThis.fetch=async(url,init={})=>{
    const u=new URL(url);const body=init.body&&typeof init.body==='string'?JSON.parse(init.body):null;
    if(u.pathname.endsWith('/rpc/demo_claim_media')){
      if(rows.has(body.p_id))return Response.json({status:rows.get(body.p_id).status});
      if(quota)return Response.json({status:'daily_limit'});
      rows.set(body.p_id,{id:body.p_id,owner_id:body.p_owner,kind:body.p_kind,model:body.p_model,status:'reserved'});return Response.json({status:'claimed'});
    }
    if(u.pathname==='/rest/v1/demo_media_assets'){
      const id=u.searchParams.get('id')?.replace('eq.','');
      if(init.method==='PATCH'){Object.assign(rows.get(id),body);return new Response(null,{status:204});}
      return Response.json(id?(rows.has(id)?[rows.get(id)]:[]):[]);
    }
    if(u.pathname.startsWith('/storage/v1/object/')){
      if(init.method==='POST'){objects.set(u.pathname,init.body);return Response.json({ok:true});}
      return new Response(objects.get(u.pathname));
    }
    if(u.href==='https://yibuapi.com/v1/audio/speech'){calls++;return new Response(new Uint8Array([73,68,51,1,2,3]));}
    if(u.href==='https://yibuapi.com/v1/videos'){calls++;return Response.json({id:'task-synthetic',status:'queued'});}
    if(u.href==='https://yibuapi.com/v1/videos/task-synthetic')return Response.json(videoCompleted?{status:'completed',metadata:{url:'https://yibuapi.com/test.mp4'}}:{status:'queued'});
    if(u.href==='https://yibuapi.com/test.mp4'){assert.equal(init.headers,undefined);return new Response(Buffer.from([0,0,0,24,102,116,121,112,1,2]));}
    throw Error('unexpected request '+u.pathname);
  };
  const req=(body,cookie=owner.cookie)=>new Request(origin+'/api/media',{method:body?'POST':'GET',headers:{origin,cookie},...(body?{body:JSON.stringify(body)}:{})});
  const speech={kind:'speech',text:'合成测试',voice:'zh_female_vv_uranus_bigtts',confirmed:true};
  try{
    const [first,second]=await Promise.all([route.POST(req(speech)),route.POST(req(speech))]);
    const a=await first.json(),b=await second.json();assert.equal(a.id,b.id);assert.equal(calls,1);
    const reused=await(await route.POST(req(speech))).json();assert.equal(reused.status,'ready');assert.equal(reused.reused,true);assert.equal(calls,1);
    assert.equal((await route.POST(req({...speech,confirmed:false}))).status,400);
    const stranger=new Request(origin+'/api/media?id='+a.id,{headers:{cookie:other.cookie}});
    assert.equal((await route.GET(stranger)).status,404);
    assert.equal((await assetRoute.GET(new Request(origin+a.assetUrl,{headers:{cookie:other.cookie}}),{params:Promise.resolve({id:a.id})})).status,404);
    const own=await assetRoute.GET(new Request(origin+a.assetUrl,{headers:{cookie:owner.cookie}}),{params:Promise.resolve({id:a.id})});assert.equal(own.status,200);assert.equal(own.headers.get('cache-control'),'private, no-store');
    const video=await(await route.POST(req({kind:'video',text:'一只猫',confirmed:true}))).json();assert.equal(video.status,'queued');assert.equal(calls,2);
    videoCompleted=true;
    const ready=await(await route.GET(new Request(origin+'/api/media?id='+video.id,{headers:{cookie:owner.cookie}}))).json();assert.equal(ready.status,'ready');assert.equal(calls,2);
    const health = await route.GET(new Request(origin+'/api/media'));
    assert.equal(health.status, 200);
    const healthJson = await health.json();
    assert.equal(typeof healthJson.configured, 'boolean');
    assert.equal(healthJson.provider, 'yibu');
  }finally{globalThis.fetch=original;}
});
test('binary output must match the promised media type and byte cap',async()=>{
  await assert.rejects(()=>boundedMedia(Response.json({error:'not audio'}),'speech'));
  await assert.rejects(()=>boundedMedia(new Response('x',{headers:{'content-length':'20000001'}}),'video'));
  await assert.rejects(()=>boundedMedia(new Response(null,{status:502}),'speech'));
});
