import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendationTurnIndex, recommendationIntro, recommendationReply, resolveWorldSelection } from '../lib/personal-recommendations.ts';

const worlds = [{ id: 'first', title: '第一本' }, { id: 'second', title: '第二本' }];
const recommendations = worlds.map((world) => ({ worldId: world.id, reason: '合成测试理由', matchedMemoryIds: [] }));
const reply = recommendationReply('为你找到这两本。', recommendations, worlds);
test('recommendation cards remain beside the original reply after ordinary conversation', () => {
  const conversation = [{ role: 'assistant', content: reply }, { role: 'user', content: '先聊一会儿' }, { role: 'assistant', content: '我听着。' }];
  assert.equal(recommendationTurnIndex(conversation), 0);
  assert.equal(recommendationIntro(reply), '为你找到这两本。');
  assert.deepEqual(resolveWorldSelection('第一个', recommendations, worlds), { kind: 'open', worldId: 'first' });
});
test('latest canonical reply wins; quoted user text and truncated history do not invent anchors', () => {
  assert.equal(recommendationTurnIndex([{ role: 'user', content: reply }]), -1);
  assert.equal(recommendationTurnIndex([{ role: 'assistant', content: '普通回复' }]), -1);
  assert.equal(recommendationTurnIndex([{ role: 'assistant', content: reply }, { role: 'assistant', content: reply }]), 1);
  assert.equal(recommendationIntro('普通回复'), '普通回复');
});
test('unavailable first world does not renumber or redirect to the second world', () => {
  assert.equal(resolveWorldSelection('第一个', recommendations, worlds.slice(1)).kind, 'clarify');
  assert.deepEqual(resolveWorldSelection('第二个', recommendations, worlds.slice(1)), { kind: 'open', worldId: 'second' });
});
