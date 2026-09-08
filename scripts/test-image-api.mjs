import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { imageOwner } from '../lib/server-image-store.ts';

async function loadRoute(path) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  for (const name of ['image-policy', 'server-image-store', 'server-auth', 'company-gateway']) source = source.replaceAll(`@/lib/${name}`, new URL(`../lib/${name}.ts`, import.meta.url).href);
  return import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`);
}
test('full generation saves once; retries reuse; pending and quotas never call a model', async () => {
  Object.assign(process.env, { SUPABASE_URL: 'https://storage.example.test', SUPABASE_SECRET_KEY: 'test', IMAGE_SESSION_SECRET: 'synthetic', YIBU_API_KEY: 'test' });
  const route = await loadRoute('../app/api/image/route.ts');
  const assetRoute = await loadRoute('../app/api/image/asset/[id]/route.ts');
  const owner = imageOwner(new Request('https://demo.test/api/image'), true);
  const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#334455' } }).png().toBuffer();
  const realFetch = globalThis.fetch; let status = 'claimed'; let modelCalls = 0; let stored; let assetId;
  globalThis.fetch = async (url, init = {}) => {
    url = String(url);
    if (url.endsWith('/rpc/demo_claim_image')) { assetId = JSON.parse(init.body).p_id; return Response.json({ status }); }
    if (url === 'https://yibuapi.com/v1/images/generations') { modelCalls++; return Response.json({ data: [{ url: 'https://test.tos-cn-beijing.volces.com/test.png' }] }); }
    if (url === 'https://test.tos-cn-beijing.volces.com/test.png') return new Response(png);
    if (url.includes('/storage/v1/object/')) {
      if (init.method === 'POST') { stored = init.body; return Response.json({ ok: true }); }
      return new Response(stored);
    }
    if (url.includes('/rest/v1/demo_image_assets')) {
      if (init.method === 'PATCH') { status = 'ready'; return new Response(null, { status: 204 }); }
      return Response.json([{ id: assetId, owner_id: owner.id, bucket: 'world-private', status: 'ready', model: 'test' }]);
    }
    throw new Error('Unexpected request');
  };
  const req = (cookie = owner.cookie, extra = {}) => new Request('https://demo.test/api/image', { method: 'POST', headers: { cookie, origin: 'https://demo.test' }, body: JSON.stringify({ purpose: 'scene', requestId: 1, sceneId: 'fixture', prompt: 'fictional test', seed: 4, ...extra }) });
  try {
    assert.equal((await route.POST(req(''))).status, 401);
    const first = await (await route.POST(req())).json();
    assert.equal(first.cloudStored, true); assert.equal(first.reused, false); assert.equal(modelCalls, 1); assert.ok(stored.length);
    const second = await (await route.POST(req())).json();
    assert.equal(second.assetUrl, first.assetUrl); assert.equal(second.reused, true); assert.equal(modelCalls, 1);
    for (const s of ['pending', 'daily_limit', 'storage_limit', 'failed']) {
      status = s; assert.ok((await route.POST(req())).status >= 400); assert.equal(modelCalls, 1);
    }
    const context = { params: Promise.resolve({ id: assetId }) };
    assert.equal((await assetRoute.GET(new Request(`https://demo.test${first.assetUrl}`), context)).status, 404);
    const own = await assetRoute.GET(new Request(`https://demo.test${first.assetUrl}`, { headers: { cookie: owner.cookie } }), context);
    assert.equal(own.status, 200); assert.equal(own.headers.get('cache-control'), 'private, no-store');
  } finally { globalThis.fetch = realFetch; }
});
