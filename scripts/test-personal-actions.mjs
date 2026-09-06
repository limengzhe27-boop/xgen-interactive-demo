import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorldSelection, restoreRecommendations, recommendationReply, guardPersonalAction } from '../lib/personal-recommendations.ts';
const worlds = [{ id: 'a', title: '合成世界甲' }, { id: 'b', title: '合成世界乙' }];
const recommendations = worlds.map(w => ({ worldId: w.id, reason: '合成推荐理由', matchedMemoryIds: [] }));

void test('explicit first/second selection uses displayed order, not catalogue order', () => {
  for (const text of ['第一个', '第一个吧', '我选第一个', '打开第一个', '那就选第一本', '1', '进入第一个世界']) {
    assert.deepEqual(resolveWorldSelection(text, recommendations, [...worlds].reverse()), { kind: 'open', worldId: 'a' });
  }
  assert.deepEqual(resolveWorldSelection('第二个', recommendations, worlds), { kind: 'open', worldId: 'b' });
  assert.deepEqual(resolveWorldSelection('打开《合成世界乙》', recommendations, worlds), { kind: 'open', worldId: 'b' });
});
void test('questions, negation, comparisons and unrelated numbered messages never use the fast path', () => {
  for (const text of ['不选第一个', '第一个怎么样', '第一个？', '第一个和第二个有什么区别', '今天完成了第一个任务', '先聊聊', '我不想打开合成世界甲']) {
    assert.equal(resolveWorldSelection(text, recommendations, worlds).kind, 'chat', text);
  }
});
void test('missing, ambiguous, out-of-range and withdrawn recommendations ask instead of guessing', () => {
  assert.equal(resolveWorldSelection('第一个', [], worlds).kind, 'clarify');
  assert.equal(resolveWorldSelection('第三个', recommendations, worlds).kind, 'clarify');
  assert.equal(resolveWorldSelection('打开这个', recommendations, worlds).kind, 'clarify');
  assert.equal(resolveWorldSelection('第一个', recommendations, worlds.slice(1)).kind, 'clarify');
  assert.deepEqual(resolveWorldSelection('第二个', recommendations, worlds.slice(1)), { kind: 'open', worldId: 'b' });
  assert.deepEqual(resolveWorldSelection('打开它', recommendations.slice(0, 1), worlds), { kind: 'open', worldId: 'a' });
});
void test('recommendation context survives JSON roundtrip without reordering or malformed data', () => {
  assert.deepEqual(restoreRecommendations(JSON.parse(JSON.stringify(recommendations))), recommendations);
  assert.deepEqual(restoreRecommendations(undefined), []);
  assert.deepEqual(restoreRecommendations([{ worldId: 'a' }]), []);
  assert.deepEqual(restoreRecommendations([recommendations[0], recommendations[0]]), []);
  const text = recommendationReply('合成解释', recommendations, worlds);
  assert.ok(text.indexOf('1.《合成世界甲》') < text.indexOf('2.《合成世界乙》'));
});
void test('only valid open-world actions may run and explicit negation suppresses navigation', () => {
  const output = { reply: '已进入游戏', recommendations: [], memoryCandidates: [], action: { type: 'open-world', worldId: 'a' } };
  assert.equal(guardPersonalAction(output, '带我去那个甲世界', ['a']).action.type, 'open-world');
  assert.throws(() => guardPersonalAction(output, '带我去', ['b']), /action_outside_catalogue/);
  for (const text of ['不想进入第一个', '先别打开', '介绍一下第一个', '第一个怎么样？']) assert.equal(guardPersonalAction(output, text, ['a']).action.type, 'none');
  assert.ok(!guardPersonalAction({ ...output, action: { type: 'none' } }, '你好', ['a']).reply.includes('已进入'));
});
