import test from 'node:test';
import assert from 'node:assert/strict';
import { characterPublicIntroduction, initialConversationSuggestions, validCharacterPresentation } from '../lib/character-presentation.ts';
import { directConversationEntry, restoreConversationOpening } from '../lib/studio-session.ts';
import { publicationWorld } from '../lib/publication.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';

test('public presentation never falls back to private persona, goals or knowledge', () => {
  const role = { persona: 'PRIVATE_PERSONA', secrets: ['SECRET'], privateKnowledge: ['KNOWLEDGE'], goal: 'PRIVATE_GOAL' };
  assert.equal(characterPublicIntroduction(role), '');
  assert.equal(characterPublicIntroduction({ ...role, publicBackground: '公开背景' }), '公开背景');
  assert.equal(characterPublicIntroduction({ ...role, publicBackground: '旧介绍', publicIntroduction: '作者的新介绍' }), '作者的新介绍');
});
test('suggestions preserve author opt-out and do not invent hidden scene knowledge', () => {
  assert.deepEqual(initialConversationSuggestions({ text: '你好', suggestions: [] }), []);
  assert.deepEqual(initialConversationSuggestions({ suggestions: [' 问问窗外 ', '问问窗外', '继续听'] }), ['问问窗外', '继续听']);
  assert.equal(initialConversationSuggestions({ text: '你好' }).length, 2);
});
test('public fields and opening survive publishing and serialization; private extras are stripped', () => {
  const world = structuredClone(studioWorlds[0].world);
  const role = world.characters[0];
  role.publicIntroduction = '作者确认的公开介绍';
  role.chatOpening = { scene: '窗边。', text: '你想看看窗外吗？', suggestions: ['窗外有什么？'], extra: 'PRIVATE' };
  const restored = publicationWorld(JSON.parse(JSON.stringify(world)));
  assert.equal(restored.characters[0].publicIntroduction, role.publicIntroduction);
  assert.deepEqual(restored.characters[0].chatOpening, { scene: '窗边。', text: '你想看看窗外吗？', suggestions: ['窗外有什么？'] });
});
test('malformed optional presentation cannot be published', () => {
  for (const chatOpening of [{ scene: '', text: '你好' }, { scene: '现场', text: '你好', suggestions: '错类型' },
    { scene: '现场', text: '你好', suggestions: ['1', '2', '3', '4'] }]) {
    assert.equal(validCharacterPresentation({ chatOpening }), false);
    const world = structuredClone(studioWorlds[0].world);
    world.characters[0].chatOpening = chatOpening;
    assert.throws(() => publicationWorld(world));
  }
});
test('neutral visitor cannot inherit the target opening, entry or public introduction', () => {
  const entry = structuredClone(studioWorlds[0]);
  const target = entry.world.characters[0];
  target.publicIntroduction = '目标角色介绍';
  target.chatOpening = { scene: '目标场景', text: '目标台词' };
  const meeting = directConversationEntry(entry, target.id);
  const visitor = meeting.world.characters.find(role => role.id === meeting.world.openingScene.presentCharacterIds[0]);
  assert.equal(visitor.chatOpening, undefined);
  assert.equal(visitor.publicIntroduction, undefined);
  assert.equal(visitor.entry, undefined);
  assert.deepEqual(visitor.privateKnowledge, []);
  assert.deepEqual(entry.world.characters[0], target);
});
test('restore preserves saved opening, input and played history instead of regenerating them', () => {
  const initial = { entry: structuredClone(studioWorlds[0]), targetCharacterId: studioWorlds[0].world.characters[0].id,
    turns: [], draftInput: '尚未发送的回应', greeting: { scene: '手写开场', text: '手写台词' }, narrative: '旧现场' };
  assert.equal(restoreConversationOpening(initial), initial);
  const played = { ...initial, greeting: undefined, turns: [{ action: '已发生' }] };
  assert.equal(restoreConversationOpening(played), played);
  const legacy = { ...initial, greeting: undefined };
  const updated = restoreConversationOpening(legacy);
  assert.equal(updated.draftInput, initial.draftInput);
  assert.ok(updated.greeting.scene);
  assert.equal(legacy.narrative, '旧现场');
});
