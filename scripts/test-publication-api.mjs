import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { studioWorlds } from '../lib/studio-worlds.ts';

test('publication authenticates, requires consent, excludes private context and never generates images', async () => {
  process.env.WORLD_PUBLICATION_ENABLED = 'true';
  let source = await readFile(new URL('../app/api/worlds/route.ts', import.meta.url), 'utf8');
  const moduleURL = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  source = source.replace("@/lib/server-auth", moduleURL(`export const sameOrigin=r=>r.headers.get('origin')==='https://demo.test'; export const authConfigured=()=>true; export const authContext=()=>({client:{auth:{getUser:async()=>{if(globalThis.__publicationTest.throwAuth)throw Error('offline'); return {data:{user:globalThis.__publicationTest.user}}}}},finish:r=>r});`));
  source = source.replace("@/lib/server-image-store", moduleURL(`export const imageId=()=> 'a'.repeat(64); export const imageOwner=()=>null; export const findImage=async()=>({owner_id:'someone-else',bucket:'world-private',status:'ready'}); export const claimImage=()=>{throw Error('unexpected copy')}; export const saveImage=claimImage; export const storageFetch=async(path,init)=>{globalThis.__publicationTest.calls.push({path,init});return Response.json([])};`));
  source = source.replace('@/lib/publication', new URL('../lib/publication.ts', import.meta.url).href);
  source = source.replace("import publicImages from '@/lib/public-image-manifest.json';", 'const publicImages = {};');
  const route = await import(moduleURL(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText));
  const state = globalThis.__publicationTest = { calls: [], user: null, throwAuth: false };
  const body = { sourceId: 'synthetic', consent: 'publish-world-and-selected-images-v1', world: structuredClone(studioWorlds[0].world), personalAgent: ['must never upload'] };
  body.world.privateChat = ['must never upload'];
  const request = (value = body, origin = 'https://demo.test') => new Request('https://demo.test/api/worlds', { method: 'POST', headers: { origin, 'x-xgen-account': 'fictional-account' }, body: JSON.stringify(value) });
  try {
    assert.equal((await route.POST(request(body, 'https://attacker.test'))).status, 403);
    assert.equal((await route.POST(request())).status, 401);
    assert.equal(state.calls.length, 0);
    state.user = { id: 'fictional-account' };
    assert.equal((await route.POST(request({ ...body, consent: '' }))).status, 400);
    assert.equal((await route.POST(request({ ...body, cover: `/api/image/asset/${'b'.repeat(64)}` }))).status, 400);
    assert.equal(state.calls.length, 0);
    const result = await route.POST(request());
    assert.equal(result.status, 200);
    assert.equal(state.calls.length, 1);
    assert.equal(state.calls[0].path, '/rest/v1/rpc/demo_publish_world');
    assert.ok(!state.calls[0].init.body.includes('must never upload'));
    assert.equal((await result.json()).world.world.characters.length, body.world.characters.length);
    state.throwAuth = true;
    assert.equal((await route.POST(request())).status, 400);
    assert.equal(state.calls.length, 1);
  } finally { delete globalThis.__publicationTest; }
});
