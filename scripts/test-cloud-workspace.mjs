import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { readCloudSnapshot, readLocalWorkspace, workspaceKeys, applyPendingWorkspace, restoredImage } from '../lib/cloud-workspace.ts';
const owner = '77777777-7777-4777-8777-000000260909';
const snapshot = { version: 1, demo: JSON.stringify({ memories: ['合成记忆'], worldTitle: '测试', worldSeed: '', draftRoles: [] }), studio: JSON.stringify({ version: 1, documents: [], runs: [], chats: [], draftId: 'test' }), images: { 'v2:scene:abc:def': '/api/image/asset/'+'a'.repeat(64) } };
function memoryStorage() { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) }; }
test('snapshot boundary permits only cloud image pointers, correct local shapes and bounded bytes', () => {
  assert.deepEqual(readCloudSnapshot(snapshot), snapshot);
  assert.throws(()=>readCloudSnapshot({...snapshot, images:{'v2:scene:abc:def':'data:image/png;base64,AA'}}));
  assert.throws(()=>readCloudSnapshot({...snapshot, demo:'{}'}));
  assert.throws(()=>readCloudSnapshot({...snapshot, studio:'x'.repeat(2_000_001)}));
  assert.throws(()=>workspaceKeys('guest'));
  for (const field of ['chats', 'runs']) assert.throws(()=>readCloudSnapshot({...snapshot, studio:JSON.stringify({...JSON.parse(snapshot.studio),[field]:[{}]})}));
});
test('explicit restoration backs up existing account records without touching other accounts or guest', () => {
  const storage=memoryStorage(), keys=workspaceKeys(owner);
  storage.setItem(keys.demo,'old-demo'); storage.setItem(keys.studio,'old-studio'); storage.setItem('xgen-small-world-demo-v1','guest');
  storage.setItem(keys.pending,JSON.stringify(snapshot)); applyPendingWorkspace(storage,owner);
  assert.equal(storage.getItem(keys.demo),snapshot.demo);
  assert.equal(JSON.parse(storage.getItem(keys.backup)).demo,'old-demo');
  assert.equal(storage.getItem(keys.pending),null); assert.equal(storage.getItem('xgen-small-world-demo-v1'),'guest');
  assert.deepEqual(readLocalWorkspace(storage,owner),snapshot);
  assert.deepEqual(readLocalWorkspace(storage,owner,{'v2:scene:abc:def':'/api/image/asset/'+'b'.repeat(64)}),snapshot, 'restored references win over stale IndexedDB entries');
  assert.equal(restoredImage(storage,owner,'v2:scene:abc:def'),snapshot.images['v2:scene:abc:def']);
});
test('storage failure during restore rolls back and leaves staging for recovery', () => {
  const storage=memoryStorage(), keys=workspaceKeys(owner); storage.setItem(keys.demo,'old-demo'); storage.setItem(keys.studio,'old-studio'); storage.setItem(keys.pending,JSON.stringify(snapshot));
  const set=storage.setItem; let fail=true;
  storage.setItem=(k,v)=>{if(k===keys.studio&&fail){fail=false;throw Error('quota');}set(k,v);};
  assert.throws(()=>applyPendingWorkspace(storage,owner));
  assert.equal(storage.getItem(keys.demo),'old-demo'); assert.equal(storage.getItem(keys.studio),'old-studio'); assert.ok(storage.getItem(keys.pending));
});
test('cloud route enforces identity, consent, origin and revisions; no model or service-role request', async () => {
  const mod=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  let code=await readFile(new URL('../app/api/workspace/route.ts',import.meta.url),'utf8');
  code=code.replace('@/lib/server-auth',mod(`export const sameOrigin=r=>r.headers.get('origin')==='https://demo.test'; export const authConfigured=()=>true; export const authContext=()=>({finish:r=>r,client:{auth:{getUser:async()=>({data:{user:globalThis.__cloud.user}})},from:()=>({select:()=>({eq:(_,owner)=>{globalThis.__cloud.selectedOwner=owner;return {maybeSingle:async()=>({data:null})}}})}),rpc:async(name,input)=>{globalThis.__cloud.calls.push({name,input});return {data:globalThis.__cloud.result}}}});`));
  code=code.replace('@/lib/cloud-workspace',new URL('../lib/cloud-workspace.ts',import.meta.url).href);
  const route=await import(mod(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText));
  const state=globalThis.__cloud={user:null,calls:[],result:{status:'saved',revision:1,updatedAt:'2026-09-07T00:00:00Z'}};
  const body={snapshot,consent:'save-private-workspace-v1',revision:0,requestId:'77777777-7777-4777-8777-000000260910'};
  const req=(method='PUT',data=body,scope=owner,origin='https://demo.test')=>new Request('https://demo.test/api/workspace',{method,headers:{origin,'x-xgen-account':scope},...(method==='GET'?{}:{body:JSON.stringify(data)})});
  try {
    assert.equal((await route.PUT(req())).status,401);
    state.user={id:owner}; assert.equal((await route.PUT(req('PUT',body,owner,'https://evil.test'))).status,403);
    assert.equal((await route.GET(req('GET',undefined,'guest'))).status,409);
    assert.equal((await route.PUT(req('PUT',{...body,consent:''}))).status,400); assert.equal(state.calls.length,0);
    assert.equal((await route.GET(req('GET'))).status,200); assert.equal(state.selectedOwner,owner);
    assert.equal((await route.PUT(req())).status,200); assert.equal(state.calls[0].name,'demo_save_workspace'); assert.equal('p_owner' in state.calls[0].input,false);
    state.result={status:'conflict',revision:2}; assert.equal((await route.PUT(req())).status,409);
    state.result={status:'quota'}; assert.equal((await route.PUT(req())).status,429);
    state.result={status:'saved',revision:3}; assert.equal((await route.DELETE(req('DELETE',{...body,consent:'delete-private-workspace-v1'}))).status,200); assert.equal(state.calls.at(-1).input.p_document,null);
  } finally {delete globalThis.__cloud;}
});
