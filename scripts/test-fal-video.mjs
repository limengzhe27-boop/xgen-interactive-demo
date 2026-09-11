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
const {initialVideoRole,threeChoices,videoMotionPrompt,commitVideoTurn,videoTurnRequest}=await import('../lib/video-exploration.ts');
const {studioWorlds}=await import('../lib/studio-worlds.ts');
const {branchKey,afterPending,compileBranch}=await import('../lib/video-branch-plans.ts');
const {videoBranchTurnKey,videoEndingFrame}=await import('../lib/video-prefetch.ts');
const {VideoBuffer}=await import('../lib/video-buffer.ts');
const {startVideo}=await import('../lib/video-autoplay.ts');
const {compactVideoScriptInput}=await import('../lib/video-script-input.ts');
test('video model input removes duplicate history without dropping story constraints or changing cache keys',()=>{
 const entry=studioWorlds.find(w=>w.id==='yoga-lotus-boundary'),role=entry.world.characters[0].id;
 const source={...initialVideoRole(entry,role),roleId:role,hasFrame:false};
 source.state.eventLedger=[{turn:1,action:'询问',result:'对方解释当前安排。'.repeat(50)}];
 source.state.rolePerspectives={other:{eventLedger:[{result:'另一角色的私人经历'}]}};
 const input=videoTurnRequest(entry,role,source.state,source.narrative,source.choices,'观察');
 const original=JSON.stringify(input),key=branchKey(entry,source),compact=compactVideoScriptInput(input);
 assert.equal(JSON.stringify(input),original);assert.equal(branchKey(entry,source),key);
 assert.ok(JSON.stringify(compact).length<original.length);
 assert.equal(compact.state.eventLedger,undefined);assert.equal(compact.state.rolePerspectives,undefined);
 assert.deepEqual(compact.recentTurns,input.recentTurns);assert.deepEqual(compact.currentScene,input.currentScene);
 for(const field of ['rules','tasks','relationships','difficultyConstraints','endingConditions','scheduledEvents','goals'])assert.deepEqual(compact.world[field],input.world[field]);
 for(const field of ['committedFacts','knownSecrets','inventory','completedTaskIds','characterStates'])assert.deepEqual(compact.state[field],input.state[field]);
 compact.world.characters.forEach((c,i)=>{assert.deepEqual(c.privateKnowledge,input.world.characters[i].privateKnowledge);assert.deepEqual(c.secrets,input.world.characters[i].secrets);assert.deepEqual(c.entry,input.world.characters[i].entry);});
});
test('pipeline starts frames before scripts, wakes immediately on a prepared branch and projects before joining video work',()=>{
 const ui=readFileSync(root+'components/video-explorer.tsx','utf8');
 assert.match(ui,/void endingFrame\(clip\)/);
 assert.match(ui,/phase,cachedPlans.length\]/);
 assert.match(ui,/setInterval\(\(\)=>void tick\(\),2000\)/);
 const act=ui.slice(ui.indexOf('async function act('),ui.indexOf('async function resume('));
 assert.ok(act.indexOf('save(next)')<act.indexOf('await prefetchRunning.current.get'));
 assert.match(ui,/await cache.load\(src\)/);
 assert.match(ui,/session.choices.flatMap/);
});
test('autoplay prefers audio, falls back only for permission denial, and respects cancellation',async()=>{
 let calls=0;const video={muted:false,async play(){calls++;if(!this.muted)throw new DOMException('gesture required','NotAllowedError');}};
 assert.equal(await startVideo(video,()=>true),'muted');assert.equal(calls,2);
 assert.equal(await startVideo(video,()=>false),'cancelled');assert.equal(calls,2);
 await assert.rejects(startVideo({muted:false,async play(){throw new Error('decode failed');}},()=>true),/decode failed/);
 assert.equal(await startVideo({muted:false,async play(){}},()=>true),'playing');
 const ui=readFileSync(root+'components/video-explorer.tsx','utf8');
 assert.doesNotMatch(ui,/key=\{playback.src\}|aria-label="播放新片"|requestVideoFrameCallback/);
 assert.match(ui,/onLoadedData=\{decoded\}/);
});
test('selecting an unfinished warmup streams immediately instead of awaiting the full file',async()=>{
 const original=globalThis.fetch,cache=new VideoBuffer(),src='/api/media/asset/'+'d'.repeat(64);
 globalThis.fetch=async(_url,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))));
 try{const pending=cache.load(src);const rejected=assert.rejects(pending);assert.equal(cache.playbackSource(src),src);await rejected;assert.equal(cache.peek(src),undefined);}finally{cache.dispose();globalThis.fetch=original;}
});
test('private video warmup and playback share one download and release old branches',async()=>{
 const original=globalThis.fetch,create=URL.createObjectURL,revoke=URL.revokeObjectURL;
 let downloads=0;const revoked=[];
 globalThis.fetch=async(_url,init)=>{downloads++;assert.equal(init.credentials,'same-origin');assert.equal(init.cache,'no-store');return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'video/mp4'}});};
 URL.createObjectURL=()=>`blob:fixture-${downloads}`;URL.revokeObjectURL=url=>revoked.push(url);
 const cache=new VideoBuffer(),a='/api/media/asset/'+'a'.repeat(64),b='/api/media/asset/'+'b'.repeat(64);
 try{
   const warm=cache.load(a),selected=cache.load(a);assert.equal(warm,selected);
   assert.equal(await warm,await selected);assert.equal(downloads,1);assert.equal(cache.peek(a),'blob:fixture-1');
   await cache.load(b);cache.retain([b]);assert.equal(cache.peek(a),undefined);assert.deepEqual(revoked,['blob:fixture-1']);
   cache.dispose();assert.equal(revoked.length,2);await assert.rejects(cache.load('https://other.test/private.mp4'));
 }finally{cache.dispose();globalThis.fetch=original;URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
test('video buffer rejects oversized responses and permits a download retry, not generation',async()=>{
 const original=globalThis.fetch,cache=new VideoBuffer(),src='/api/media/asset/'+'c'.repeat(64);let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('x',{headers:{'Content-Type':'video/mp4','Content-Length':String(25*1024*1024)}});};
 try{await assert.rejects(cache.load(src),/too_large/);await assert.rejects(cache.load(src),/too_large/);assert.equal(calls,2);assert.equal(cache.peek(src),undefined);}finally{cache.dispose();globalThis.fetch=original;}
});
test('prefetch billing keys survive reload and separate actions, worlds and roles',async()=>{
 const a=await videoBranchTurnKey('session','world:role:turn:clip','观察');
 assert.equal(a,await videoBranchTurnKey('session','world:role:turn:clip','观察'));
 assert.notEqual(a,await videoBranchTurnKey('session','world:role:turn:clip','离开'));
 assert.notEqual(a,await videoBranchTurnKey('session','world:other:turn:clip','观察'));
 assert.match(a,/^branch:[a-f0-9]{64}$/);
});
test('prefetch extracts an ending from a detached decoder, not the visible player',async()=>{
 const old=globalThis.document;let sought,cleaned=false,drawn=false;
 const decoder={duration:15,videoWidth:1920,videoHeight:1080,load(){cleaned=true;},removeAttribute(){},set currentTime(t){sought=t;queueMicrotask(()=>this.onseeked());},set src(s){assert.equal(s,'/clip.mp4');queueMicrotask(()=>this.onloadedmetadata());}};
 globalThis.document={createElement(tag){if(tag==='video')return decoder;return {getContext(){return {drawImage(v){assert.equal(v,decoder);drawn=true;}};},toDataURL(){return 'data:image/jpeg;base64,YQ==';}};}};
 try{assert.equal(await videoEndingFrame('/clip.mp4'),'data:image/jpeg;base64,YQ==');assert.equal(sought,14.95);assert.ok(cleaned&&drawn);}finally{globalThis.document=old;}
});
test('immersive actions use icon corners and a closed records dialog without label clutter',()=>{
 const ui=readFileSync(root+'components/video-explorer.tsx','utf8');
 const css=readFileSync(root+'app/video-explore/video-explore.css','utf8');
 assert.doesNotMatch(ui,/默认行动|另一种选择|或自己行动|更多 · 剧情与探索方式/);
 assert.match(ui,/<dialog ref=\{drawer\}/);
 assert.match(ui,/narrative:turnMemoryText\(p.response/);
 assert.match(ui,/enabled&&!drawerOpen&&!paused/);
 assert.match(css,/video-corner:hover/);
 assert.match(css,/@media\(hover:none\)/);
 assert.match(css,/grid-template-columns:1fr/);
 assert.match(ui,/<progress aria-label=\{countdownLabel\} max=\{15\} value=\{seconds\}/);
 assert.match(ui,/paused&&online&&visible/);
 assert.match(ui,/entry.portraits\[session.roleId\]\|\|entry.cover/);
 assert.match(ui,/if\(s.clip&&!frame.current\)/);
 assert.match(ui,/clip:roleClip\?\?\(roles.length===1\?current.current.clip:''\)/);
});
test('prepared branches project without committing and match the eventual played state',()=>{
 const entry=studioWorlds.find(w=>w.id==='yoga-lotus-boundary');
 const role=entry.world.characters[0].id;
 const source={...initialVideoRole(entry,role),roleId:role,hasFrame:false};
 const before=JSON.stringify(source);
 const response={actionDecision:{allowed:true},narrative:'你站稳脚步，对方停在门旁。',dialogue:[],statePatch:{committedFacts:[]},nextChoices:[],ending:{reached:false}};
 const projected=afterPending(entry,source,{action:'观察',response});
 assert.equal(JSON.stringify(source),before);
 assert.equal(projected.state.turn,source.state.turn+1);
 const actual={roleId:role,state:commitVideoTurn(entry,role,source.state,'观察',response),narrative:response.narrative,choices:threeChoices(response.nextChoices),hasFrame:true};
 assert.equal(branchKey(entry,projected),branchKey(entry,actual));
 for(const change of [{roleId:'other'},{hasFrame:true},{narrative:'different'},{choices:[]}])assert.notEqual(branchKey(entry,source),branchKey(entry,{...source,...change}));
 assert.equal(compileBranch(entry,source,'观察',response).action,'观察');
 assert.throws(()=>compileBranch(entry,source,'观察',{...response,actionDecision:{allowed:false}}));
 assert.equal(afterPending(entry,source,{action:'观察',response:{...response,ending:{reached:true}}}),null);
 const ui=readFileSync(root+'components/video-explorer.tsx','utf8');
 assert.match(ui,/if\(preset&&!prepared\)return/);
 assert.match(ui,/prepared\?\.response\?\?await/);
 assert.match(ui,/act\(c.label,true\)/);
});
test('long continuation has no frontend trial-round cap or backend daily RPC quota',()=>{
 assert.equal(policy.FAL_VIDEO_SECONDS,15);
 const ui=readFileSync(root+'components/video-explorer.tsx','utf8');
 assert.doesNotMatch(ui,/rounds\s*(?:>=|<)\s*2/);
 const api=readFileSync(root+'app/api/fal-video/route.ts','utf8');
 assert.doesNotMatch(api,/rpc\/demo_claim_media/);
 assert.match(api,/perAccountDailyLimit:null/);
 assert.match(api,/resolution=ignore-duplicates,return=representation/);
});
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
  assert.throws(()=>videoMotionPrompt(entry,role.id,initial.state,{...response,dialogue:[{characterId:role.id,text:'长'.repeat(60),visibleToRoleIds:[role.id]}]},true));
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
      if(init.method==='POST'){
        assert.equal(new Headers(init.headers).get('Prefer'),'resolution=ignore-duplicates,return=representation');
        if(rows.has(body.id))return Response.json([]);
        rows.set(body.id,body);return Response.json([body]);
      }
      const id=u.searchParams.get('id')?.replace('eq.','');if(init.method==='PATCH'){Object.assign(rows.get(id),body);return new Response(null,{status:204});}
      return Response.json(id?[rows.get(id)].filter(Boolean):[]);
    }
    if(u.pathname.startsWith('/storage/v1/object/'))return Response.json({ok:true});
    if(u.hostname==='queue.fal.run'){
      assert.equal(new Headers(init.headers).get('Authorization'),'Key synthetic-fal');
      if(init.method==='POST'){
        assert.equal(u.pathname,'/minimax/h3-max-turbo/image-to-video');
        paid++;assert.equal(body.duration,15);assert.equal(body.enable_safety_checker,true);assert.equal(body.generate_audio,undefined);
        if(mode==='balance')return Response.json({detail:'Exhausted balance'},{status:403});
        if(mode==='uncertain')throw Error('network lost');
        return Response.json({request_id:'test-job',status_url:'https://queue.fal.run/minimax/h3-max-turbo/requests/test-job/status',response_url:'https://queue.fal.run/minimax/h3-max-turbo/requests/test-job'});
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
    mode='ok';
    const keys=await Promise.all(['left','middle','right'].map(a=>videoBranchTurnKey('session','scene',a)));
    const branches=await Promise.all(keys.map(turnKey=>route.POST(req({...base,turnKey})).then(r=>r.json())));
    assert.equal(new Set(branches.map(b=>b.id)).size,3);assert.equal(paid,7);
    await Promise.all(keys.map(turnKey=>route.POST(req({...base,turnKey}))));
    assert.equal(paid,7,'reload and selection reuse all three paid branch reservations');
    const legacy=rows.get(branches[0].id);legacy.model='minimax/h3-max/image-to-video';
    legacy.task_id=JSON.stringify({request_id:'test-job',status_url:'https://queue.fal.run/minimax/h3-max/requests/test-job/status',response_url:'https://queue.fal.run/minimax/h3-max/requests/test-job'});
    const reused=await(await route.POST(req({...base,turnKey:keys[0]}))).json();
    assert.equal(reused.model,'minimax/h3-max/image-to-video');assert.equal(paid,7);
    const recovered=await(await query(legacy.id)).json();assert.equal(recovered.status,'ready');assert.equal(recovered.model,legacy.model);
  }finally{globalThis.fetch=original;}
});
