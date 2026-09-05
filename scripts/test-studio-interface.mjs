// Server-render checks, not browser layout or live-model validation. No network calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const root = fileURLToPath(new URL('../', import.meta.url));
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/')) {
      const path = root + specifier.slice(2);
      for (const suffix of ['.tsx', '.ts']) if (existsSync(path + suffix)) return next(pathToFileURL(path + suffix).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('file:') && /\.tsx?$/.test(url)) return { format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText };
    return next(url, context);
  },
});
const { StudioHome } = await import('../components/studio-home.tsx');
const { PersonalAgent } = await import('../components/personal-agent.tsx');
const { knownRecommendations } = await import('../lib/personal-recommendations.ts');
const { studioWorlds } = await import('../lib/studio-worlds.ts');
const { POST } = await import('../app/api/ai/route.ts');
const { pendingMemories, restorePersonalConversation } = await import('../lib/personal-memory.ts');
const { isCreatorAgentResponse, isPersonalAgentResponse } = await import('../lib/ai-validation.ts');
const worlds = studioWorlds.map((entry) => ({ ...entry, roleCount: entry.world.characters.length }));
const noop = () => {};
const personalProps = { message: '', conversation: [], busy: false, error: '', recommendations: [], worlds,
  memories: [], onMessage: noop, onSubmit: noop, onRemoveMemory: noop, onOpenWorld: noop, onCreate: noop };

test('personal Agent starts without a fabricated recommendation or fixed old-world promotion', () => {
  const html = renderToStaticMarkup(React.createElement(PersonalAgent, personalProps));
  assert.ok(html.includes('不必先有一个问题'));
  assert.ok(html.includes('帮我一起理清先后顺序'));
  assert.ok(!html.includes('aria-label="推荐结果"'));
  assert.ok(!html.includes('暴雨山庄'));
  assert.ok(!html.includes('在线'));
  assert.ok(!html.includes('personal-match-copy'));
});
test('personal Agent renders only actual matches, their reason, conversation and removable preferences', () => {
  const html = renderToStaticMarkup(React.createElement(PersonalAgent, { ...personalProps,
    conversation: [{ role: 'user', content: '我想当众打脸' }, { role: 'assistant', content: '你可以从抢功旧账入手。' }],
    memories: ['不想复杂解谜'], recommendations: [{ worldId: worlds[1].id, reason: '抢功与甲乙方身份反转符合你的要求', matchedMemoryIds: [] }] }));
  assert.ok(html.includes(worlds[1].title)); assert.ok(!html.includes(worlds[0].title));
  assert.ok(html.includes('抢功与甲乙方身份反转符合你的要求'));
  assert.ok(html.includes('删除记忆：不想复杂解谜'));
  assert.ok(html.includes('我想当众打脸') && html.includes('抢功旧账'));
});
test('failed Agent request keeps the entered text visible and marks old matches as old', () => {
  const html = renderToStaticMarkup(React.createElement(PersonalAgent, { ...personalProps, message: '改成遗产争夺', error: '本次请求失败', recommendations: [{ worldId: worlds[1].id, reason: '之前的匹配', matchedMemoryIds: [] }] }));
  assert.ok(html.includes('改成遗产争夺')); assert.ok(html.includes('上次匹配的世界')); assert.ok(html.includes('本次请求失败'));
});
test('recommendations exclude unknown IDs, empty reasons and duplicates, and cap at two', () => {
  const row = (worldId, reason = '符合本次偏好') => ({ worldId, reason, matchedMemoryIds: [] });
  assert.deepEqual(knownRecommendations([row('missing'), row('a', ''), row('a'), row('a'), row('b'), row('c')], ['a', 'b', 'c']).map((item) => item.worldId), ['a', 'b']);
});
test('catalogue server-renders a single featured world, distinct remaining cards and a synopsis entry', () => {
  const html = renderToStaticMarkup(React.createElement(StudioHome, { section: 'home', worlds, characters: [], recent: [], onCreate: noop, onOpenWorld: noop, onChat: noop, onPersonal: noop, onLibrary: noop, onOpenRecord: noop }));
  assert.equal((html.match(/class="studio-featured"/g) || []).length, 1);
  assert.equal((html.match(/class="studio-card"/g) || []).length, worlds.length - 1);
  assert.ok(html.includes('剧情简介'));
  const css = readFileSync(new URL('../app/studio.css', import.meta.url), 'utf8');
  assert.match(css, /\.studio-card p[^}]*-webkit-line-clamp: 3/);
  assert.match(css, /\.studio-world-grid[^}]*align-items: start/);
});
test('melodramatic revision changes rules, openings and tasks while preserving independent role goals', () => {
  for (const entry of studioWorlds) {
    assert.ok(entry.world.rules.some((rule) => rule.id === 'melodrama'));
    assert.equal(entry.world.title, entry.title);
    assert.ok(entry.world.characters.every((role) => entry.world.goals.some((goal) => goal.roleId === role.id)));
  }
  assert.ok(studioWorlds[0].world.characters.some((role) => role.publicBackground.includes('死对头')));
  assert.ok(studioWorlds[1].world.tasks.some((task) => task.successCondition.includes('纠正主创归属')));
  assert.ok(studioWorlds[2].world.openingScene.narrative.includes('你又不姓何'));
});

async function mockedPersonal(recommendedId) {
  const originalFetch = globalThis.fetch;
  const previousKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'synthetic-test-only';
  let payload; let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++; payload = JSON.parse(init.body);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ reply: '这次按你说的换口味。', memoryCandidates: [], recommendations: [{ worldId: recommendedId, reason: '符合本次表达', matchedMemoryIds: [] }] }) } }] });
  };
  try {
    const input = { contractVersion: '2026-09-04.v2', userMessage: '换一个', currentMemories: [], recentExperiences: [], availableWorldIds: ['fixture'], availableWorlds: [{ id: 'fixture', title: '合成测试', genre: '虚构', premise: '测试', surpriseLevel: 2 }], conversation: [{ role: 'user', content: '刚才想玩追悔，现在想逆袭' }] };
    const response = await POST(new Request('http://localhost/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'personal-agent', input }) }));
    return { response, payload, calls };
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = previousKey;
  }
}
test('personal endpoint forwards recent context to the model without a real network call', async () => {
  const result = await mockedPersonal('fixture');
  assert.equal(result.response.status, 200); assert.equal(result.calls, 1);
  const content = result.payload.messages.find((message) => message.role === 'user').content;
  const input = JSON.parse(content.slice(content.indexOf('{')));
  assert.equal(input.conversation[0].content, '刚才想玩追悔，现在想逆袭');
});
test('personal endpoint rejects an invented world rather than exposing it as a recommendation', async () => {
  const result = await mockedPersonal('invented-world');
  assert.equal(result.response.status, 502); assert.equal(result.calls, 1);
  assert.equal((await result.response.json()).error, 'recommendation_outside_catalogue');
});

test('new personal memories are explicit candidates, never automatic behavioral profiles', () => {
  const row = (value, source = 'explicit') => ({ id: value, category: 'interest', value, source, confidence: 1, requiresConfirmation: false });
  assert.deepEqual(pendingMemories([row('喜欢散步'), row('喜欢散步'), row('已保存'), row('猜测性格', 'behavior'), row(' ')], ['已保存']), ['喜欢散步']);
  const html = renderToStaticMarkup(React.createElement(PersonalAgent, { ...personalProps, pending: ['喜欢散步'] }));
  assert.ok(html.includes('待确认的记忆') && html.includes('记住：喜欢散步') && html.includes('这次不记'));
  assert.ok(!html.includes('删除记忆：喜欢散步'));
});

test('saved recent conversation accepts old missing data, filters invalid rows and bounds history', () => {
  assert.deepEqual(restorePersonalConversation(undefined), []);
  assert.deepEqual(restorePersonalConversation([{ role: 'system', content: 'bad' }, { role: 'user', content: '' }]), []);
  const rows = Array.from({ length: 50 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: String(i) }));
  const restored = restorePersonalConversation(JSON.parse(JSON.stringify(rows)));
  assert.equal(restored.length, 40); assert.equal(restored[0].content, '10');
});

test('personal schema accepts everyday assistance with no recommendations and rejects malformed memory', () => {
  const output = { reply: '先把手头要做的事写下来，我们一起排顺序。', memoryCandidates: [], recommendations: [] };
  assert.ok(isPersonalAgentResponse(output));
  assert.ok(!isPersonalAgentResponse({ ...output, memoryCandidates: [{ id: 'bad', value: 'test', confidence: 2, requiresConfirmation: false }] }));
});

test('creation proposal has optional structured cast and rejects malformed cast without breaking old proposals', () => {
  const proposal = { title: '测试', premise: '虚构故事', brief: { coreGoal: '目标', successCondition: '完成', failureCondition: '失败', complexityLevel: 2, tasks: [], difficulties: [], scheduledEvents: [] } };
  const result = { reply: '先讨论人物', proposal, nextQuestions: [], readiness: 'needs_detail' };
  assert.ok(isCreatorAgentResponse(result));
  assert.ok(isCreatorAgentResponse({ ...result, proposal: { ...proposal, characters: [{ name: '小林', identity: '店主', persona: '好奇', relationship: '邻居', appearance: '围裙' }] } }));
  assert.ok(!isCreatorAgentResponse({ ...result, proposal: { ...proposal, characters: [{ name: '缺少字段' }] } }));
});

test('personal instructions support everyday conversation; creation discussion is available before filling roles', async () => {
  const result = await mockedPersonal('fixture');
  const system = result.payload.messages.find((message) => message.role === 'system').content;
  assert.ok(system.includes('普通聊天或讨论创作时 recommendations=[]'));
  assert.ok(system.includes('个人 AI 助理'));
  assert.ok(!system.includes('而不是泛用助手'));
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes('{step === 1 && <div className="creator-first-discussion">{discussionPanel}</div>}'));
  assert.ok(page.includes('setCreatorMessage(seed)'));
});
