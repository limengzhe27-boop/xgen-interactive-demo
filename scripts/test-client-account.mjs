import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { generateSceneImage } from '../lib/remote-image-service.ts';

void test('account-scoped text and image clients send immutable identity headers, including guests', async () => {
  const moduleURL = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
  let source = await readFile(new URL('../lib/remote-ai-adapter.ts', import.meta.url), 'utf8');
  source = source.replace('@/lib/ai-validation', moduleURL('export const isCreatorAgentResponse=()=>true,isPersonalAgentResponse=()=>true,isWorldGenerationResponse=()=>true,isWorldTurnResponse=()=>true;'));
  const { createRemoteAIAdapter } = await import(moduleURL(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText));
  const realFetch = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    if (!init.body) return Response.json({ configured: true });
    calls.push({ url, scope: init.headers['x-xgen-account'], signal: init.signal });
    const input = JSON.parse(init.body);
    return Response.json(url === '/api/image' ? { ...input, assetUrl: '/api/image/asset/' + 'a'.repeat(64), provider: 'yibu', model: 'synthetic', persistent: true } : {});
  };
  try {
    const scopes = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'guest'];
    for (const scope of scopes) {
      const adapter = createRemoteAIAdapter(scope), controller = new AbortController();
      await adapter.advanceWorld({ interaction: { mode: 'character-chat' } }, controller.signal);
      await generateSceneImage({ requestId: 1, sceneId: 'synthetic', prompt: 'fixture', seed: 1 }, controller.signal, scope);
      assert.equal(calls.at(-2).scope, scope); assert.equal(calls.at(-1).scope, scope);
      assert.equal(calls.at(-2).signal, controller.signal); assert.equal(calls.at(-1).signal, controller.signal);
    }
    assert.equal(calls.length, 6);
  } finally { globalThis.fetch = realFetch; }
});
