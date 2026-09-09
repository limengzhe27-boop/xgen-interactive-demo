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
const policy=await import('../lib/fal-video.ts');
const route=await import('../app/api/fal-video/route.ts');
const {imageOwner}=await import('../lib/server-image-store.ts');
const {initialVideoRole,threeChoices,videoMotionPrompt,commitVideoTurn}=await import('../lib/video-exploration.ts');
const {studioWorlds}=await import('../lib/studio-worlds.ts');
function box(type,body=Buffer.alloc(0)){const head=Buffer.alloc(8);head.writeUInt32BE(body.length+8);head.write(type,4);return Buffer.concat([head,body]);}
const audio=Buffer.concat([box('ftyp'),box('moov',box('trak',box('mdia',box('hdlr',Buffer.concat([Buffer.alloc(8),Buffer.from('soun')])))))]);
test('MP4 audio detection walks real boxes and rejects spoofed/plain strings',()=>{
  assert.equal(policy.mp4HasAudio(audio),true);assert.equal(policy.mp4HasAudio(box('ftyp',Buffer.from('soun'))),false);
  assert.equal(policy.mp4HasAudio(Buffer.from('soun')),false);
  assert.equal(policy.mp4HasAudio(readFileSync(root+'public/assets/prologues/ascension-native-v3/preview.mp4')),true);
  assert.equal(policy.mp4HasAudio(readFileSync(root+'public/assets/prologues/ascension-v1/prologue.mp4')),false);
});
test('fal policy rejects external image fetches, malformed queue URLs and model injection',()=>{
  const base={confirmed:true,turnKey:'fixture:0001',prompt:'一个有明确动作与原生声音的测试故事，包含可见的行动后果。',frame:null};
  assert.ok(policy.readFalInput(base));assert.equal(policy.readFalInput({...base,frame:'http://localhost/secret'}),null);
  assert.equal(policy.readFalInput({...base,confirmed:false}),null);
  for(const url of ['http://queue.fal.run/minimax/h3-max/requests/a','https://queue.fal.run.evil.test/minimax/h3-max/requests/a','https://queue.fal.run/minimax/h3-max/requests/a?target=evil','https://queue.fal.run/other/requests/a'])assert.throws(()=>policy.falQueueUrl(url));
  assert.throws(()=>policy.falAssetUrl('https://fal.media.evil.test/a.mp4'));
  assert.equal(policy.falFailure(403,'User is locked. Reason: Exhausted balance.'),'fal_balance_exhausted');
});
test('video roles keep location and private knowledge separate; fal only receives visible material',()=>{
  const entry=studioWorlds.find(w=>w.id==='yoga-lotus-boundary');
  const role=entry.world.characters.find(c=>c.startLocationId!==entry.world.openingScene.locationId);
  const initial=initialVideoRole(entry,role.id);assert.equal(initial.choices.length,3);assert.notEqual(initial.state.location,entry.world.openingScene.locationId);
  const response={actionDecision:{allowed:true},narrative:'你站稳脚步，对方停在门旁。',dialogue:[],statePatch:{committedFacts:[]},nextChoices:[],goalProgress:{activeTaskIds:[],completedTaskIds:[],summary:''},ending:{reached:false,canContinue:true},image:{required:false,reason:'reuse',sceneId:'x'}};
  const prompt=videoMotionPrompt(entry,role.id,initial.state,response,false);
  for(const c of entry.world.characters)for(const secret of c.secrets)if(secret)assert.equal(prompt.includes(secret),false);
  assert.equal(threeChoices([]).length,3);
  assert.throws(()=>videoMotionPrompt(entry,role.id,initial.state,{...response,dialogue:[{characterId:role.id,text:'长'.repeat(40),visibleToRoleIds:[role.id]}]},true));
  const committed=commitVideoTurn(entry,role.id,initial.state,'观察',response);assert.equal(initial.state.turn,0);assert.equal(committed.turn,1);
});
test('fal submit/query is owner-isolated, idempotent and native-audio gated; no provider auto retry',async()=>{
  Object.assign(process.env,{SUPABASE_URL:'https://storage.test',SUPABASE_SECRET_KEY:'synthetic',IMAGE_SESSION_SECRET:'test',FAL_KEY:'synthetic-fal'});
  delete process.env.AUTH_PROVIDER;
  const origin='http://localhost:3000';const owner=imageOwner(new Request(origin),true),other=imageOwner(new Request(origin),true);
  const rows=new Map();let paid=0,mode='ok',completed=false,cdnCredential=false;const original=globalThis.fetch;
  globalThis.fetch=async(url,init={})=>{
    const u=new URL(url);const body=typeof init.body==='string'?JSON.parse(init.body):null;
    if(u.pathname.endsWith('/rpc/demo_claim_media')){
      if(rows.has(body.p_id))return Response.json({status:rows.get(body.p_id).status});
      rows.set(body.p_id,{id:body.p_id,owner_id:body.p_owner,kind:'video',model:body.p_model,status:'reserved'});return Response.json({status:'claimed'});
    }
    if(u.pathname==='/rest/v1/demo_media_assets'){
      const id=u.searchParams.get('id')?.replace('eq.','');if(init.method==='PATCH'){Object.assign(rows.get(id),body);return new Response(null,{status:204});}
      return Response.json(id?[rows.get(id)].filter(Boolean):[]);
    }
    if(u.pathname.startsWith('/storage/v1/object/'))return Response.json({ok:true});
    if(u.hostname==='queue.fal.run'){
      assert.equal(new Headers(init.headers).get('Authorization'),'Key synthetic-fal');
      if(init.method==='POST'){
        paid++;assert.equal(body.duration,5);assert.equal(body.enable_safety_checker,true);assert.equal(body.generate_audio,undefined);
        if(mode==='balance')return Response.json({detail:'Exhausted balance'},{status:403});
        if(mode==='uncertain')throw Error('network lost');
        return Response.json({request_id:'test-job',status_url:'https://queue.fal.run/minimax/h3-max/requests/test-job/status',response_url:'https://queue.fal.run/minimax/h3-max/requests/test-job'});
      }
      if(u.pathname.endsWith('/status'))return Response.json({status:completed?'COMPLETED':'IN_QUEUE'});
      return Response.json({video:{url:'https://v3.fal.media/test.mp4'}});
    }
    if(u.hostname==='v3.fal.media'){cdnCredential=new Headers(init.headers).has('Authorization');return new Response(mode==='silent'?box('ftyp'):audio);}
    throw Error('unexpected path '+u.pathname);
  };
  const req=(input,cookie=owner.cookie)=>new Request(origin+'/api/fal-video',{method:'POST',headers:{origin,cookie},body:JSON.stringify(input)});
  const query=(id,cookie=owner.cookie)=>route.GET(new Request(origin+'/api/fal-video?id='+id,{headers:{cookie}}));
  const base={confirmed:true,turnKey:'test:0001',prompt:'一个有明确动作与原生声音的测试故事，包含可见的行动后果。',frame:null};
  try{
    const [a,b]=await Promise.all([route.POST(req(base)),route.POST(req(base))]);const first=await a.json(),second=await b.json();assert.equal(first.id,second.id);assert.equal(paid,1);
    assert.equal((await query(first.id,other.cookie)).status,404);
    completed=true;assert.equal((await(await query(first.id)).json()).status,'ready');assert.equal(cdnCredential,false);
    await route.POST(req(base));assert.equal(paid,1);
    mode='balance';const locked=await(await route.POST(req({...base,turnKey:'test:0002'}))).json();assert.equal(locked.error,'fal_balance_exhausted');await route.POST(req({...base,turnKey:'test:0002'}));assert.equal(paid,2);
    mode='silent';const silent=await(await route.POST(req({...base,turnKey:'test:0003'}))).json();const checked=await(await query(silent.id)).json();assert.equal(checked.error,'fal_missing_native_audio');
    mode='uncertain';assert.equal((await route.POST(req({...base,turnKey:'test:0004'}))).status,503);assert.equal((await(await route.POST(req({...base,turnKey:'test:0004'}))).json()).status,'reserved');assert.equal(paid,4);
    assert.equal((await route.POST(req({...base,frame:'data:image/png;base64,YWJj'}))).status,400);assert.equal(paid,4);
  }finally{globalThis.fetch=original;}
});
