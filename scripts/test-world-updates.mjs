import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const url = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
test('update requests require authenticated scope, enforce ownership for history and fail without receipt', async () => {
  const state = globalThis.__updateTest = { user: { id: 'reader' }, calls: [], status: 'received', broken: false };
  let source = await readFile(new URL('../app/api/worlds/updates/route.ts', import.meta.url), 'utf8');
  source = source.replace('@/lib/server-auth', url(`export const authConfigured=()=>true;export const sameOrigin=r=>r.headers.get('origin')==='https://demo.test';export const authContext=()=>({client:{auth:{getUser:async()=>({data:{user:globalThis.__updateTest.user}})}},finish:r=>r});`));
  source = source.replace('@/lib/server-image-store', url(`export const storageFetch=async(path,init={})=>{const s=globalThis.__updateTest;s.calls.push({path,init});if(s.broken)throw Error();if(path.includes('demo_request_world_update'))return Response.json({status:s.status});if(path.includes('demo_world_publications'))return Response.json(s.user.id==='author'?[{id:'owned'}]:[]);if(path.includes('demo_world_editions'))return Response.json([{edition:1,title:'Test'}]);return Response.json([]);};`));
  const route = await import(url(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText));
  const id = 'a'.repeat(64);
  const req = (method, body, scope = state.user?.id ?? 'guest', query = '', origin = 'https://demo.test') => new Request(`https://demo.test/api/worlds/updates${query}`, { method, headers: { origin, 'x-xgen-account': scope }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    assert.equal((await route.POST(req('POST', { id: `community-${id}` }, 'reader', '', 'https://evil.test'))).status, 403);
    assert.equal((await route.POST(req('POST', { id: `community-${id}` }, 'other'))).status, 409);
    assert.equal((await route.POST(req('POST', { id: 'built-in' }))).status, 400);
    assert.equal(state.calls.length, 0);
    const result = await route.POST(req('POST', { id: `community-${id}`, requester: 'forged' }));
    assert.equal((await result.json()).received, true);
    assert.equal(JSON.parse(state.calls.at(-1).init.body).p_requester, 'reader');
    assert.equal((await route.GET(req('GET', null, 'reader', `?id=${id}`))).status, 404);
    assert.ok(!state.calls.some(call => call.path.includes('demo_world_editions')));
    state.user = { id: 'author' };
    assert.equal((await route.GET(req('GET', null, 'author', `?id=${id}&before=10`))).status, 200);
    assert.match(state.calls.at(-1).path, /edition=lt.10/);
    assert.equal((await route.GET(req('GET', null, 'author', `?id=${id}&before=1%26select=*`))).status, 400);
    state.status = 'own_world';
    assert.equal((await route.POST(req('POST', { id: `community-${id}` }))).status, 409);
    state.status = 'unavailable';
    assert.equal((await route.POST(req('POST', { id: `community-${id}` }))).status, 404);
    state.broken = true;
    const failed = await route.POST(req('POST', { id: `community-${id}` }));
    assert.equal(failed.status, 503); assert.equal((await failed.json()).received, undefined);
    state.user = null;
    assert.equal((await route.POST(req('POST', { id: `community-${id}` }))).status, 401);
  } finally { delete globalThis.__updateTest; }
});
test('migration captures content atomically and de-duplicates requests without direct client grants', async () => {
  const sql = await readFile(new URL('../supabase/migrations/202609100001_publication_history_requests.sql', import.meta.url), 'utf8');
  assert.match(sql, /after insert or update on public.demo_world_publications/);
  assert.match(sql, /NEW.document - 'sourceId'/);
  assert.match(sql, /primary key \(publication_id, edition, requester_id\)/);
  assert.match(sql, /where id = p_id for update/);
  assert.match(sql, /on conflict do nothing/);
  assert.match(sql, /grant select on public.demo_world_editions to service_role/);
  assert.doesNotMatch(sql, /grant (?:all|insert|update|delete).*to (?:anon|authenticated|service_role)/);
});
