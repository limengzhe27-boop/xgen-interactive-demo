import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreCompanionContext, makeCompanionInput } from '../lib/companion-context.ts';
import { guardPersonalAction } from '../lib/personal-recommendations.ts';
import { publicationWorld } from '../lib/publication.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';

test('old drafts default to no personal context; malformed roles and extra fields are discarded', () => {
  assert.deepEqual(restoreCompanionContext(undefined), { useConfirmedMemories: false, conversation: [] });
  const context = restoreCompanionContext({ useConfirmedMemories: 'true', privateKey: 'synthetic', conversation: [{ role: 'system', content: 'bad' }, { role: 'user', content: '合成想法', extra: true }] });
  assert.deepEqual(context, { useConfirmedMemories: false, conversation: [{ role: 'user', content: '合成想法' }] });
});
test('context is bounded and JSON persistence preserves explicit opt-in', () => {
  const value = { useConfirmedMemories: true, conversation: Array.from({ length: 50 }, () => ({ role: 'user', content: 'x'.repeat(4000) })) };
  const context = restoreCompanionContext(JSON.parse(JSON.stringify(value)));
  assert.equal(context.conversation.length, 8); assert.equal(context.conversation[0].content.length, 2000);
  assert.equal(context.useConfirmedMemories, true);
});
test('memories are read live from the current account and never copied into draft context', () => {
  const context = { useConfirmedMemories: true, conversation: [] };
  assert.deepEqual(makeCompanionInput(context, ['A偏好']).confirmedMemories, ['A偏好']);
  assert.deepEqual(makeCompanionInput(context, []).confirmedMemories, []);
  assert.deepEqual(makeCompanionInput({ ...context, useConfirmedMemories: false }, ['不应发送']).confirmedMemories, []);
  assert.deepEqual(makeCompanionInput(restoreCompanionContext(undefined), ['B偏好']).confirmedMemories, []);
  assert.equal('confirmedMemories' in context, false);
});
test('creation action is a confirmation request, never an automatic publish or overwrite', () => {
  const output = { reply: '已创作', memoryCandidates: [], recommendations: [], action: { type: 'create-world', seed: '虚构故事' } };
  assert.equal(guardPersonalAction(output, '开始创作这个世界', []).action.type, 'create-world');
  assert.match(guardPersonalAction(output, '开始创作这个世界', []).reply, /确认/);
  for (const text of ['先不要创作', '可以创作吗？', '先聊一下']) assert.equal(guardPersonalAction(output, text, []).action.type, 'none');
});
test('private companion data cannot hitchhike into published world fields at any level', () => {
  const world = structuredClone(studioWorlds[0].world);
  world.companionContext = { useConfirmedMemories: true, conversation: [{ role: 'user', content: '私有合成文本' }] };
  world.characters[0].companionContext = world.companionContext;
  world.activeCreation = { conversation: ['私有合成文本'] };
  assert.equal(JSON.stringify(publicationWorld(world)).includes('私有合成文本'), false);
});
