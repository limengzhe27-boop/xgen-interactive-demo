import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { accountStorageKey } from '../lib/account-scope.ts';
import { imageOwner } from '../lib/server-image-store.ts';
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
void test('guest records remain intact, accounts have separate local keys and cloud image owners', () => {
  const key = 'xgen-small-world-demo-v1';
  assert.equal(accountStorageKey(key, 'guest'), key);
  assert.notEqual(accountStorageKey(key, A), accountStorageKey(key, B));
  assert.throws(() => accountStorageKey(key, 'pending'));
  process.env.IMAGE_SESSION_SECRET = 'synthetic-test-only';
  const request = new Request('https://xgen-interactive-demo.vercel.app');
  const guest = imageOwner(request, true);
  const withCookie = new Request(request, { headers: { cookie: guest.cookie } });
  const ownA = imageOwner(withCookie, false, A), ownB = imageOwner(withCookie, false, B);
  assert.notEqual(ownA.id, guest.id); assert.notEqual(ownA.id, ownB.id);
  assert.equal(ownA.id, imageOwner(request, false, A).id); // Another device, same account.
  assert.equal(ownA.cookie, null);
});
void test('server detects stale tabs and rejects identity failures before private requests run', async () => {
  const moduleURL = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
  let source = await readFile(new URL('../lib/server-auth.ts', import.meta.url), 'utf8');
  source = source.replace('@supabase/ssr', moduleURL(`export const createServerClient=()=>({auth:{getUser:async()=>globalThis.__authFixture}});export const parseCookieHeader=()=>[];export const serializeCookieHeader=()=>'';`));
  const { requestAccount } = await import(moduleURL(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText));
  Object.assign(process.env, { AUTH_PROVIDER:'github', SUPABASE_URL:'https://fixture.test', SUPABASE_PUBLISHABLE_KEY:'synthetic' });
  const request = scope => new Request('https://xgen-interactive-demo.vercel.app/api/ai', { headers: scope ? { 'x-xgen-account':scope } : {} });
  try {
    globalThis.__authFixture = { data:{user:{id:A}}, error:null };
    assert.equal((await requestAccount(request(A), true)).id, A);
    await assert.rejects(requestAccount(request(B), true), /account_changed/);
    await assert.rejects(requestAccount(request('guest'), true), /account_changed/);
    await assert.rejects(requestAccount(request(), true), /account_changed/);
    globalThis.__authFixture = { data:{user:null}, error:{name:'AuthSessionMissingError'} };
    assert.equal((await requestAccount(request('guest'), true)).id, null);
    globalThis.__authFixture.error = {name:'AuthRetryableFetchError'};
    await assert.rejects(requestAccount(request('guest'), true), /account_unavailable/);
  } finally { delete globalThis.__authFixture; delete process.env.AUTH_PROVIDER; }
});

void test('private image delivery rejects other accounts even with the same guest cookie', async () => {
  const moduleURL = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
  let source = await readFile(new URL('../app/api/image/asset/[id]/route.ts', import.meta.url), 'utf8');
  source = source.replace('@/lib/server-auth', moduleURL(`export const requestAccount=async()=>({id:globalThis.__imageAccount,finish:r=>r});`));
  source = source.replace('@/lib/server-image-store', new URL('../lib/server-image-store.ts', import.meta.url).href);
  const { GET } = await import(moduleURL(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText));
  Object.assign(process.env, { SUPABASE_URL:'https://fixture.test', SUPABASE_SECRET_KEY:'synthetic', IMAGE_SESSION_SECRET:'synthetic' });
  const req = new Request('https://xgen-interactive-demo.vercel.app/api/image/asset/'+ 'a'.repeat(64));
  const owner = imageOwner(req, false, A).id;
  const realFetch = globalThis.fetch; let objectReads = 0;
  globalThis.fetch = async url => {
    const path = url instanceof Request ? url.url : url instanceof URL ? url.href : url;
    if (path.includes('/rest/v1/')) return Response.json([{id:'a'.repeat(64),owner_id:owner,bucket:'world-private',status:'ready'}]);
    objectReads++; return new Response(new Uint8Array([1,2,3]));
  };
  try {
    const params = {params:Promise.resolve({id:'a'.repeat(64)})};
    globalThis.__imageAccount=A; assert.equal((await GET(req,params)).status,200);
    globalThis.__imageAccount=B; assert.equal((await GET(req,params)).status,404);
    globalThis.__imageAccount=null; assert.equal((await GET(req,params)).status,404);
    assert.equal(objectReads,1);
  } finally { globalThis.fetch=realFetch;delete globalThis.__imageAccount; }
});
