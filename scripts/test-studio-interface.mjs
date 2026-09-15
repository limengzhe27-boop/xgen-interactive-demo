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
test('message input renders only a textarea without dictation layout siblings', async () => {
  const { MessageTextarea } = await import('../components/message-textarea.tsx');
  const html = renderToStaticMarkup(React.createElement(MessageTextarea, { placeholder: '输入测试', onSend() {} }));
  assert.match(html, /^<textarea\b/);
  assert.match(html, /<\/textarea>$/);
  assert.doesNotMatch(html, /<details|dictation-help|系统语音输入/);
});
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      for (const suffix of ['.tsx', '.ts']) {
        const url = new URL(specifier + suffix, context.parentURL);
        if (existsSync(url)) return next(url.href, context);
      }
    }
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
const { ProfilePage } = await import('../components/profile-page.tsx');
const { knownRecommendations, recommendationReply } = await import('../lib/personal-recommendations.ts');
const { studioWorlds } = await import('../lib/studio-worlds.ts');
const { POST } = await import('../app/api/ai/route.ts');
const { pendingMemories, restorePersonalConversation } = await import('../lib/personal-memory.ts');
const { isCreatorAgentResponse, isPersonalAgentResponse, isWorldTurnRequest } = await import('../lib/ai-validation.ts');
const { admitPersona } = await import('../lib/player-persona.ts');
const { makeEndingFixture } = await import('./ending-fixture.mjs');
const worlds = studioWorlds.map((entry) => ({ ...entry, roleCount: entry.world.characters.length }));
const noop = () => {};
test('profile editor renders optional reference lookup before manual fields and never auto-queries', async () => {
  const { PersonaEditor } = await import('../components/player-persona.tsx');
  const html = renderToStaticMarkup(React.createElement(PersonaEditor, { value: null, accountScope: 'reference-test', onSave: () => true, expanded: true }));
  assert.ok(html.includes('查漏原作设定'));
  assert.ok(html.indexOf('查漏原作设定') < html.indexOf('身份名称'));
  assert.ok(!html.includes('公开角色名称 / 作品')); // Optional tool starts closed.
  assert.ok(html.includes('保存身份'));
  const { POST: lookup } = await import('../app/api/persona-reference/route.ts');
  const foreign = await lookup(new Request('https://xgen-interactive-demo.vercel.app/api/persona-reference', { method: 'POST', headers: { origin: 'https://other.test' }, body: '{}' }));
  assert.equal(foreign.status, 403);
  const guest = await lookup(new Request('https://xgen-interactive-demo.vercel.app/api/persona-reference', { method: 'POST', headers: { origin: 'https://xgen-interactive-demo.vercel.app', 'x-xgen-account': 'guest' }, body: JSON.stringify({ action: 'search', query: '女帝' }) }));
  assert.equal(guest.status, 401);
});
const personalProps = { message: '', conversation: [], busy: false, error: '', recommendations: [], worlds,
  memories: [], onMessage: noop, onSubmit: noop, onRemoveMemory: noop, onOpenWorld: noop, onCreate: noop };

test('persona entry collapses optional adaptation but preserves disclosure and explicit consent', async () => {
  const { PersonaAdmission } = await import('../components/player-persona.tsx');
  const entry = studioWorlds.find(w => w.id === 'contract-expiry');
  const persona = { version: 1, ownerId: 'test', name: '测试旅人', identity: '旅人', personality: '谨慎', appearance: '外套', abilities: '读心', updatedAt: 1 };
  const html = renderToStaticMarkup(React.createElement(PersonaAdmission, {entry, roleId:'persona-visitor', persona, onEnter:noop}));
  assert.match(html, /<details class="persona-adaptation"[^>]*>/);
  assert.doesNotMatch(html.match(/<details class="persona-adaptation"[^>]*>/)[0], /\bopen/);
  assert.match(html, /公司网关及模型供应商/);
  assert.match(html, /不附带私人聊天或个人记忆/);
  assert.match(html, /本世界不带入额外超常能力/);
  assert.match(html, /我确认本次身份与能力适配/);
  assert.match(html, /disabled[^>]*>以我的身份进入/);
});

test('required ability judgment stays expanded and cannot be skipped by the compact entry UI', async () => {
  const { PersonaAdmission } = await import('../components/player-persona.tsx');
  const base = studioWorlds.find(w => w.id === 'contract-expiry');
  const entry = {...base, world:{...base.world, entryPolicy:{...base.world.entryPolicy, abilityMode:'agent-judge'}}};
  const persona = {version:1,ownerId:'test',name:'测试旅人',identity:'旅人',personality:'谨慎',appearance:'外套',abilities:'读心',updatedAt:1};
  const html = renderToStaticMarkup(React.createElement(PersonaAdmission,{entry,roleId:'persona-visitor',persona,onEnter:noop}));
  assert.match(html, /<details class="persona-adaptation"[^>]*open=""/);
  assert.match(html, /请先获取入场建议，再确认进入/);
  assert.match(html, /type="checkbox"[^>]*disabled/);
});

test('account profile separates fictional persona from confirmed and pending real memories', () => {
  const html = renderToStaticMarkup(React.createElement(ProfilePage, {
    persona: { name: '测试侠客', identity: '虚构剑客', personality: '勇敢但怕高', appearance: '银发', abilities: '御剑' },
    identityControl: React.createElement('button', null, '编辑我的形象'), memories: ['现实中喜欢安静'], pending: ['可能喜欢登山'],
    profile: { introduction: '用户主动填写', preferences: '', communication: '' }, onProfile: noop, onEdit: noop,
    busy: false, onBack: noop, onChat: noop, onRemove: noop, onConfirm: noop, onDismiss: noop,
  }));
  assert.match(html, /我的资料/);
  assert.match(html, /虚拟形象/);
  assert.doesNotMatch(html, /勇敢但怕高/);
  assert.match(html, /用户主动填写/);
  assert.match(html, /聊天记忆/);
  assert.match(html, /现实中喜欢安静/);
  assert.match(html, /确认记住/);
  assert.match(html, /历史条目未记录来源/);
  assert.match(html, /不会自动同步或公开/);
});

test('world request validates persona admission before invoking a model', () => {
  const base = studioWorlds.find(w => w.id === 'contract-expiry');
  const persona = { version: 1, ownerId: 'test', name: '林星', identity: '', personality: '', appearance: '', abilities: '瞬移', updatedAt: 1 };
  const adapted = admitPersona(base, 'su', persona);
  const input = { ...makeEndingFixture(), world: adapted.world, selectedRoleId: 'su' };
  assert.equal(isWorldTurnRequest(input), true);
  assert.equal(isWorldTurnRequest({ ...input, selectedRoleId: 'gu' }), false);
  const changed = structuredClone(input); changed.world.entryAdmission.grantedAbilities = ['瞬移'];
  assert.equal(isWorldTurnRequest(changed), false);
  const malformed = structuredClone(input); malformed.world.entryPolicy.abilityMode = 'automatic';
  assert.equal(isWorldTurnRequest(malformed), false);
});

test('personal Agent starts without a fabricated recommendation or fixed old-world promotion', () => {
  const html = renderToStaticMarkup(React.createElement(PersonalAgent, personalProps));
  assert.ok(html.includes('不必先有一个问题'));
  assert.ok(html.includes('先陪我聊一会儿') && html.includes('一起构思一个世界'));
  assert.ok(!html.includes('personal-sidebar'));
  assert.ok(!html.includes('aria-label="推荐结果"'));
  assert.ok(!html.includes('暴雨山庄'));
  assert.ok(!html.includes('在线'));
  assert.ok(!html.includes('personal-match-copy'));
});
test('personal Agent renders actual matches inline while keeping saved memories out of the main view', () => {
  const html = renderToStaticMarkup(React.createElement(PersonalAgent, { ...personalProps,
    conversation: [{ role: 'user', content: '我想当众打脸' }, { role: 'assistant', content: recommendationReply('你可以从抢功旧账入手。', [{ worldId: worlds[1].id, reason: '抢功与甲乙方身份反转符合你的要求', matchedMemoryIds: [] }], worlds) }],
    memories: ['不想复杂解谜'], recommendations: [{ worldId: worlds[1].id, reason: '抢功与甲乙方身份反转符合你的要求', matchedMemoryIds: [] }] }));
  assert.ok(html.includes(worlds[1].title)); assert.ok(!html.includes(worlds[0].title));
  assert.ok(html.includes('抢功与甲乙方身份反转符合你的要求'));
  assert.ok(html.includes('关于我') && !html.includes('删除记忆：不想复杂解谜'));
  assert.ok(html.indexOf('companion-matches') > html.indexOf('personal-turn'));
  assert.ok(html.includes('我想当众打脸') && html.includes('抢功旧账'));
});
test('failed Agent request preserves input and does not attach unanchored old matches to a new reply', () => {
  const html = renderToStaticMarkup(React.createElement(PersonalAgent, { ...personalProps, message: '改成遗产争夺', error: '本次请求失败', recommendations: [{ worldId: worlds[1].id, reason: '之前的匹配', matchedMemoryIds: [] }] }));
  assert.ok(html.includes('改成遗产争夺')); assert.ok(!html.includes('companion-match')); assert.ok(html.includes('本次请求失败'));
});
test('recommendations exclude unknown IDs, empty reasons and duplicates, and cap at two', () => {
  const row = (worldId, reason = '符合本次偏好') => ({ worldId, reason, matchedMemoryIds: [] });
  assert.deepEqual(knownRecommendations([row('missing'), row('a', ''), row('a'), row('a'), row('b'), row('c')], ['a', 'b', 'c']).map((item) => item.worldId), ['a', 'b']);
});
const homeProps = { section: 'home', worlds, characters: [], recent: [], onCreate: noop, onOpenWorld: noop, onChat: noop, onPersonal: noop, onLibrary: noop, onOpenRecord: noop };
test('gallery renders each real world once, with one headline and no metadata or synopsis actions', () => {
  const html = renderToStaticMarkup(React.createElement(StudioHome, homeProps));
  assert.equal((html.match(/class="gallery-card"/g) || []).length, worlds.length);
  assert.ok(!html.includes('studio-featured') && !html.includes('gallery-recent-item'));
  assert.ok(!html.includes(worlds[0].premise));
  worlds.forEach(world => assert.ok(html.includes('进入：' + world.title)));
  assert.ok(!html.includes('gallery-type') && !html.includes('gallery-card-actions'));
  assert.ok(!html.includes('可选身份') && !html.includes('固定身份体验'));
  assert.ok(html.includes('搜索世界或角色'));
  assert.ok(html.includes('你想创造怎样的世界') && html.includes('<textarea'));
  const css = readFileSync(new URL('../app/gallery.css', import.meta.url), 'utf8');
  assert.match(css, /\.gallery-feed[^}]*align-items: start/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /gallery-card:focus-within/);
});
test('mixed gallery preserves both entries and character-only view excludes world cards', () => {
  const characters = [{ id: 'su', worldId: worlds[0].id, worldTitle: worlds[0].title, name: '苏晚', identity: '虚构角色', persona: '果断', image: '/assets/contract-su.jpg' }];
  const mixed = renderToStaticMarkup(React.createElement(StudioHome, { ...homeProps, characters }));
  assert.ok(mixed.includes('与苏晚对话：') && mixed.includes('进入：'));
  assert.ok(!mixed.includes('<h3>苏晚</h3>'));
  assert.equal((mixed.match(/data-kind="character"/g) || []).length, 1);
  const roleOnly = renderToStaticMarkup(React.createElement(StudioHome, { ...homeProps, section: 'characters', characters }));
  assert.ok(roleOnly.includes('与苏晚对话：') && !roleOnly.includes('data-kind="world"'));
  assert.ok(!roleOnly.includes('gallery-composer-anchor'));
});
test('identity is visible above conversation while memory and message actions stay on demand', () => {
  const html = renderToStaticMarkup(React.createElement(PersonalAgent, { ...personalProps, conversation: [{ role: 'user', content: '合成测试消息' }], identityPanel: React.createElement('div', null, '独立虚构身份') }));
  assert.ok(html.includes('<details class="personal-message-actions">') && html.includes('用这条消息开始创作'));
  assert.ok(html.includes('关于我') && html.includes('独立虚构身份'));
  assert.ok(html.indexOf('独立虚构身份') < html.indexOf('companion-conversation'));
  const source = readFileSync(new URL('../components/personal-agent.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('记忆与隐私') && source.includes('手动保存、恢复私人云存档'));
  assert.ok(source.indexOf('{identityPanel}') > source.indexOf('</SheetContent>'));
});
test('identity shortcut exposes create or edit directly without requesting an image', async () => {
  const { PersonaControl } = await import('../components/player-persona.tsx');
  const base = { accountScope: 'guest', onSave: () => false };
  const empty = renderToStaticMarkup(React.createElement(PersonaControl, { ...base, value: null }));
  assert.ok(empty.includes('创建我的形象') && !empty.includes('<img'));
  const saved = renderToStaticMarkup(React.createElement(PersonaControl, { ...base, value: { name: '合成角色', portraitUrl: '/test-portrait.webp' } }));
  assert.ok(saved.includes('编辑我的形象：合成角色') && saved.includes('/test-portrait.webp'));
});
test('solo first-person prelude offers direct entry without asking the reader to choose a person', async () => {
  const { WorldProloguePlayer } = await import('../components/world-prologue.tsx');
  const { worldPrologue } = await import('../lib/world-prologue.ts');
  const html = renderToStaticMarkup(React.createElement(WorldProloguePlayer, {
    title: '蜘蛛', prologue: worldPrologue('spider-under-table', '桌腿上的逃生', '/assets/expansion/spider-under-table/cover.webp'),
    fixedIdentity: '小蛛', onBack() {}, onContinue() {},
  }));
  assert.match(html, /以小蛛的视角继续/);
  assert.match(html, /由你决定/);
  assert.doesNotMatch(html, /再选择你要成为的人|选择入场身份/);
});

test('genre-specific drama and first-person rules preserve independent role goals', () => {
  for (const entry of studioWorlds) {
    assert.ok(entry.world.rules.some((rule) => entry.fixedRoleId ? rule.id === 'first-person' : ['melodrama', 'dramatic-action'].includes(rule.id)));
    assert.equal(entry.world.title, entry.title);
    assert.ok(entry.world.characters.every((role) => entry.world.goals.some((goal) => goal.roleId === role.id)));
  }
  assert.ok(studioWorlds.find(w => w.id === 'contract-expiry').world.characters.some((role) => role.publicBackground.includes('死对头')));
  assert.ok(studioWorlds.find(w => w.id === 'client-comeback').world.tasks.some((task) => task.successCondition.includes('纠正主创归属')));
  assert.ok(studioWorlds.find(w => w.id === 'inheritance-night').world.openingScene.narrative.includes('你又不姓何'));
});

async function mockedPersonal(recommendedId, action, userMessage = '换一个') {
  const originalFetch = globalThis.fetch;
  const previousKey = process.env.YIBU_API_KEY;
  process.env.YIBU_API_KEY = 'synthetic-test-only';
  let payload; let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++; payload = JSON.parse(init.body);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ reply: '这次按你说的换口味。', memoryCandidates: [], action, recommendations: [{ worldId: recommendedId, reason: '符合本次表达', matchedMemoryIds: [] }] }) } }] });
  };
  try {
    const input = { contractVersion: '2026-09-04.v2', userMessage, currentMemories: [], recentExperiences: [], availableWorldIds: ['fixture'], availableWorlds: [{ id: 'fixture', title: '合成测试', genre: '虚构', premise: '测试', surpriseLevel: 2 }], conversation: [{ role: 'user', content: '刚才想玩追悔，现在想逆袭' }] };
    const response = await POST(new Request('http://localhost/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'personal-agent', input }) }));
    return { response, payload, calls };
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.YIBU_API_KEY; else process.env.YIBU_API_KEY = previousKey;
  }
}
test('persona design endpoint strips private extras before model input and rejects malformed requests without a call', async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.YIBU_API_KEY;
  process.env.YIBU_API_KEY = 'synthetic-test-only';
  const draft = { name: '游侠', identity: '虚构成年人', personality: '好奇', appearance: '黑发', abilities: '解读机关' };
  let sent; let calls = 0;
  globalThis.fetch = async (_url, init) => { calls++; sent = JSON.parse(init.body); return Response.json({ choices: [{ message: { content: JSON.stringify({ reply: '待你确认', proposal: { ...draft, ownerId: 'forged', portraitUrl: 'https://invalid.example' } }) } }] }); };
  try {
    const request = input => new Request('http://localhost/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'design-persona', input }) });
    const input = { contractVersion: '2026-09-04.v2', message: '构思虚构游侠', draft, conversation: [], currentMemories: ['PRIVATE_SENTINEL'], ownerId: 'forged' };
    const response = await POST(request(input));
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.ok(!JSON.stringify(sent).includes('PRIVATE_SENTINEL'));
    assert.deepEqual(await response.json(), { reply: '待你确认', proposal: draft });
    const invalid = await POST(request({ ...input, draft: {} }));
    assert.equal(invalid.status, 400); assert.equal(calls, 1);
  } finally { globalThis.fetch = previousFetch; if (previousKey === undefined) delete process.env.YIBU_API_KEY; else process.env.YIBU_API_KEY = previousKey; }
});
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

test('personal endpoint validates action targets and suppresses an unsolicited open', async () => {
  const valid = await mockedPersonal('fixture', { type: 'open-world', worldId: 'fixture' }, '带我去那个合成世界');
  const output = await valid.response.json();
  assert.equal(output.action.type, 'open-world'); assert.deepEqual(output.recommendations, []);
  const invalid = await mockedPersonal('fixture', { type: 'open-world', worldId: 'missing' }, '带我进去');
  assert.equal(invalid.response.status, 502);
  const denied = await mockedPersonal('fixture', { type: 'open-world', worldId: 'fixture' }, '先不要进去');
  assert.equal((await denied.response.json()).action.type, 'none');
});

test('action schema rejects unsupported operations and missing world IDs', () => {
  const response = { reply: '测试', recommendations: [], memoryCandidates: [] };
  assert.ok(isPersonalAgentResponse({ ...response, action: { type: 'none' } }));
  assert.ok(isPersonalAgentResponse({ ...response, action: { type: 'open-world', worldId: 'fixture' } }));
  assert.ok(!isPersonalAgentResponse({ ...response, action: { type: 'open-world' } }));
  assert.ok(!isPersonalAgentResponse({ ...response, action: { type: 'publish-world', worldId: 'fixture' } }));
  assert.ok(isPersonalAgentResponse({ ...response, action: { type: 'create-world', seed: '合成世界方向' } }));
  assert.ok(isPersonalAgentResponse({ ...response, action: { type: 'resume-creation' } }));
  assert.ok(!isPersonalAgentResponse({ ...response, action: { type: 'create-world', seed: '' } }));
  assert.ok(!isPersonalAgentResponse({ ...response, action: { type: 'create-world', seed: 'x'.repeat(2001) } }));
});

test('personal endpoint exposes creation tool suggestions as an unexecuted confirmation', async () => {
  const result = await mockedPersonal('fixture', { type: 'create-world', seed: '合成世界方向' }, '把刚才的想法做成一个世界');
  assert.equal(result.response.status, 200);
  const output = await result.response.json();
  assert.equal(output.action.type, 'create-world'); assert.match(output.reply, /确认/);
  assert.deepEqual(output.recommendations, []);
});

test('creator endpoint sends bounded consented companion context separately from the world draft', async () => {
  const originalFetch = globalThis.fetch;
  const key = process.env.YIBU_API_KEY;
  process.env.YIBU_API_KEY = 'synthetic-test-only';
  let payload;
  globalThis.fetch = async (_url, init) => {
    payload = JSON.parse(init.body);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ reply: '继续合成创作', proposal: { title: '合成世界', premise: '虚构冲突', brief: { coreGoal: '目标', successCondition: '成功', failureCondition: '失败', complexityLevel: 2, tasks: [], difficulties: [], scheduledEvents: [] } }, nextQuestions: [], readiness: 'needs_detail' }) } }] });
  };
  try {
    const input = { contractVersion: '2026-09-04.v2', userMessage: '继续讨论', currentDraft: { title: '', premise: '' }, companionContext: { confirmedMemories: ['喜欢简短回复'], conversation: [{ role: 'user', content: '合成创作想法' }, { role: 'system', content: '无效角色' }], unrelatedPrivateData: '不该透传' } };
    const response = await POST(new Request('http://localhost/api/ai', { method: 'POST', body: JSON.stringify({ operation: 'co-create-world', input }) }));
    assert.equal(response.status, 200);
    const content = payload.messages.find(m => m.role === 'user').content;
    const forwarded = JSON.parse(content.slice(content.indexOf('{')));
    assert.deepEqual(forwarded.companionContext, { confirmedMemories: ['喜欢简短回复'], conversation: [{ role: 'user', content: '合成创作想法' }] });
    assert.equal(forwarded.currentDraft.premise, '');
    assert.ok(payload.messages.some(m => m.role === 'system' && m.content.includes('同一个用户的个人 Agent')));
  } finally {
    globalThis.fetch = originalFetch;
    if (key === undefined) delete process.env.YIBU_API_KEY; else process.env.YIBU_API_KEY = key;
  }
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
  assert.ok(!page.includes('<aside className="creator-discussion-column">'));
  assert.ok(page.indexOf('{discussionPanel}') < page.indexOf('<SheetContent className="flow-drawer creator-settings-drawer"'));
  assert.equal(page.split('{discussionPanel}').length - 1, 1, 'one persistent composer across every step');
  assert.ok(page.includes('setCreatorMessage(seed)'));
});
