// In-memory storage double: verifies application authorization, not production database permissions.
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { studioWorlds } from '../lib/studio-worlds.ts';
const moduleURL = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
test('author publication lifecycle isolates accounts, detects stale changes and excludes private context', async () => {
  const old = process.env.WORLD_PUBLICATION_ENABLED;
  process.env.WORLD_PUBLICATION_ENABLED = 'true';
  const state = globalThis.__pubManagement = { user: { id: 'author-a' }, rows: [], calls: [] };
  let source = await readFile(new URL('../app/api/worlds/route.ts', import.meta.url), 'utf8');
  source = source.replace('@/lib/server-auth', moduleURL(`export const sameOrigin=r=>r.headers.get('origin')==='https://demo.test'; export const authConfigured=()=>true; export const authContext=()=>({client:{auth:{getUser:async()=>({data:{user:globalThis.__pubManagement.user}})}},finish:r=>r});`));
  source = source.replace('@/lib/server-image-store', moduleURL(`import {createHash} from 'node:crypto'; export const imageId=p=>createHash('sha256').update(JSON.stringify(p)).digest('hex'); export const imageOwner=()=>null; export const findImage=async()=>null; export const claimImage=()=>{throw Error('No image generation/copy allowed')}; export const saveImage=claimImage;
  export const storageFetch=async(path,init={})=>{const s=globalThis.__pubManagement;s.calls.push({path,init}); if(path.includes('/rpc/')) {const b=JSON.parse(init.body); const old=s.rows.find(r=>r.id===b.p_id); if(old&&old.owner_id!==b.p_owner)throw Error('not owner'); const row={id:b.p_id,owner_id:b.p_owner,document:b.p_document,published:true,updated_at:new Date().toISOString()}; s.rows=s.rows.filter(r=>r.id!==row.id).concat(row);return Response.json(null);}
  const q=new URL(path,'https://storage.test').searchParams; const rows=s.rows.filter(r=>['id','owner_id','updated_at','published'].every(k=>!q.has(k)||String(r[k])===q.get(k).slice(3)));if(init.method==='PATCH'){rows.forEach(r=>Object.assign(r,JSON.parse(init.body)));}return Response.json(rows);};`));
  for (const name of ['publication-art','publication','library-art','legacy-art','meme-worlds']) source = source.replace(`@/lib/${name}`,new URL(`../lib/${name}.ts`,import.meta.url).href);
  source = source.replace("import publicImages from '@/lib/public-image-manifest.json';", 'const publicImages = {};');
  const route = await import(moduleURL(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText));
  const req=(method,body,scope=state.user?.id??'guest',query='')=>new Request('https://demo.test/api/worlds'+query,{method,headers:{origin:'https://demo.test','x-xgen-account':scope},...(body?{body:JSON.stringify(body)}:{})});
  try {
    const body={sourceId:'draft-a',consent:'publish-world-and-selected-images-v1',world:structuredClone(studioWorlds[0].world),memories:['PRIVATE_MARKER'],chat:['PRIVATE_MARKER']};
    assert.equal((await route.POST(req('POST',body))).status,200);
    assert.ok(!JSON.stringify(state.rows).includes('PRIVATE_MARKER'));
    const a=(await (await route.GET(req('GET',null,'author-a','?mine=true'))).json()).publications[0];
    assert.equal(a.document.sourceId,'draft-a');
    state.user={id:'reader-b'};
    assert.equal((await (await route.GET(req('GET',null,'reader-b','?mine=true'))).json()).publications.length,0);
    assert.equal((await (await route.GET(req('GET'))).json()).worlds.length,1);
    const patch={id:a.id,updatedAt:a.updated_at,published:false};
    assert.equal((await route.PATCH(req('PATCH',patch,'author-a'))).status,409);
    assert.equal((await route.PATCH(req('PATCH',patch))).status,409);
    assert.equal(state.rows[0].published,true);
    state.user={id:'author-a'};
    process.env.WORLD_PUBLICATION_ENABLED='false';
    assert.equal((await route.PATCH(req('PATCH',patch))).status,200);
    assert.equal((await (await route.GET(req('GET'))).json()).worlds.length,0);
    assert.equal(state.rows.length,1); // Unpublish does not delete the author copy.
    const latest={...patch,updatedAt:state.rows[0].updated_at,published:true,consent:body.consent};
    assert.equal((await route.PATCH(req('PATCH',latest))).status,403);
    process.env.WORLD_PUBLICATION_ENABLED='true';
    assert.equal((await route.PATCH(req('PATCH',{...latest,updatedAt:'2000-01-01T00:00:00Z'}))).status,409);
    assert.equal((await route.PATCH(req('PATCH',latest))).status,200);
    assert.equal((await (await route.GET(req('GET'))).json()).worlds.length,1);
    assert.equal((await route.POST(req('POST',{...body,world:{...body.world,title:'不应覆盖'}}))).status,409);
    assert.equal((await route.POST(req('POST',{...body,expectedUpdatedAt:state.rows[0].updated_at,world:{...body.world,title:'更新后的合成作品'}}))).status,200);
    assert.equal(state.rows.length,1);
    assert.equal(state.rows[0].document.title,'更新后的合成作品');
    // The author/editor endpoint must resolve the same legacy art as the public catalogue.
    state.rows[0].document={id:'community-56ed98581aeb49b16bfe83b22761525138a3a139c137955931288b7fe5dfa5d6',sourceId:'draft-a',title:'下课以后',cover:'',portraits:{},world:{characters:[
      {id:'draft-role-0',name:'周野',imagePrompt:'校服穿得松松垮垮，头发有些长，右手腕戴着一根旧红绳'},
      {id:'draft-role-1',name:'沈知夏',imagePrompt:'常穿素色衬衫与长裙，戴细框眼镜，说话时习惯转笔'},
      {id:'draft-role-2',name:'林小满',imagePrompt:'马尾扎得整齐，校服熨得平整，书包上挂着一只旧挂件'},
    ]}};
    const editor=(await (await route.GET(req('GET',null,'author-a','?mine=true'))).json()).publications[0].document;
    const catalog=(await (await route.GET(req('GET'))).json()).worlds[0];
    assert.equal(editor.portraits['draft-role-0'],'/assets/after-class-v1/zhou.webp');
    assert.deepEqual(editor.portraits,catalog.portraits);
    assert.equal(editor.sourceId,'draft-a');assert.equal(catalog.sourceId,undefined);
    state.user=null;
    assert.equal((await route.GET(req('GET',null,'guest','?mine=true'))).status,401);
    assert.equal((await route.PATCH(req('PATCH',patch))).status,401);
  } finally { delete globalThis.__pubManagement; if(old===undefined)delete process.env.WORLD_PUBLICATION_ENABLED;else process.env.WORLD_PUBLICATION_ENABLED=old; }
});
