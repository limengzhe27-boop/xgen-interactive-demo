import test from 'node:test';
import assert from 'node:assert/strict';
import { turnMemoryText, commitTurn } from '../lib/world-state.ts';
import { chatRequest } from '../lib/studio-session.ts';
import { enforceWorldTurnGuardrails, makeRejectedWorldTurn } from '../lib/world-agent-guardrails.ts';
import { makeEndingFixture } from './ending-fixture.mjs';

const fixture = () => {
  const input = makeEndingFixture();
  input.state.characterStates = { xu: { locationId: 'archive' }, chen: { locationId: 'archive' } };
  return input;
};
const responseFor = input => ({ ...makeRejectedWorldTurn(input, { allowed: false }),
  actionDecision: { allowed: true }, narrative: '陈舟把箱子放在桌边。',
  dialogue: [
    { characterId: 'chen', text: '我答应留在这里等你，先检查左边的箱扣。', visibleToRoleIds: ['xu'] },
    { characterId: 'chen', text: '私下暗号紫槐51。', visibleToRoleIds: ['chen'] },
    { characterId: 'unknown', text: '不存在的角色', visibleToRoleIds: ['xu'] },
  ],
});
test('continuation remembers heard dialogue and speaker, excluding hidden and invalid speakers', () => {
  const input = fixture(); const response = responseFor(input);
  const memory = turnMemoryText(response, input.world, 'xu');
  assert.ok(memory.includes('陈舟：我答应留在这里等你'));
  assert.ok(memory.includes(response.narrative));
  assert.ok(!memory.includes('紫槐51') && !memory.includes('不存在'));
  const request = chatRequest({ entry: { world: input.world }, playerRoleId: 'xu', targetCharacterId: 'chen',
    state: input.state, narrative: response.narrative, turns: [{ action: '请等我', response }] }, '你刚才答应什么？');
  assert.equal(request.recentTurns[0].result, memory);
});
test('NPC relationship changes stay separate and survive save/resume, including old saves', () => {
  const input = fixture();
  const next = commitTurn(input.state, { action: '帮忙', result: '完成', clue: '', nextLocation: 'archive',
    relationshipDelta: 0, relationshipDeltas: { chen: 3, xu: -1, missing: 9, world: 5 } });
  assert.deepEqual(next.relationshipChanges, { chen: 3, xu: -1 });
  assert.equal(next.relationshipTrust, input.state.relationshipTrust);
  const restored = JSON.parse(JSON.stringify(next));
  const again = commitTurn(restored, { action: '争执', result: '不再信任', clue: '', nextLocation: 'archive',
    relationshipDelta: 0, relationshipDeltas: { chen: -2, xu: NaN, missing: Infinity } });
  assert.deepEqual(again.relationshipChanges, { chen: 1, xu: -1 });
  assert.equal(input.state.relationshipChanges, undefined);
});
test('chat retains exact first user message beyond recent window and across serialization', () => {
  const input = fixture();
  const session = { entry: { world: input.world }, playerRoleId: 'xu', targetCharacterId: 'chen',
    state: input.state, narrative: '', greeting: { text: '这是角色的招呼', scene: '档案室' },
    turns: Array.from({ length: 18 }, (_, i) => ({ action: i ? `后续消息${i}` : '你谁', response: responseFor(input) })) };
  const request = chatRequest(JSON.parse(JSON.stringify(session)), '我给你发送的第一句话是什么');
  assert.equal(request.conversationMemory.firstUserMessage, '你谁');
  assert.equal(request.conversationMemory.greeting, '这是角色的招呼');
  assert.equal(request.conversationMemory.totalTurns, 18);
  assert.equal(request.recentTurns.length, 12);
  assert.equal(request.recentTurns.at(-1).action, '后续消息17');
  assert.ok(!JSON.stringify(request.recentTurns).includes('紫槐51'));
  const fresh = chatRequest({ ...session, turns: [], greeting: undefined }, '你好');
  assert.equal(fresh.conversationMemory.firstUserMessage, null);
  assert.equal(fresh.conversationMemory.greeting, null);
});
test('relationship patch drops invented ids, self and nonfinite values and bounds each turn', () => {
  const input = fixture(); const response = responseFor(input);
  response.statePatch.relationshipDeltas = { chen: 900, xu: 8, nonexistent: 3, world: NaN };
  const guarded = enforceWorldTurnGuardrails(input, response);
  assert.deepEqual(guarded.statePatch.relationshipDeltas, { chen: 10 });
  const rejected = enforceWorldTurnGuardrails(input, { ...response, actionDecision: { allowed: false } });
  assert.equal(rejected.statePatch.relationshipDeltas, undefined);
});
test('relationship changes are bounded cumulatively, not an automatic relationship or ending', () => {
  const input = fixture(); input.state.relationshipChanges = { chen: 99 };
  const next = commitTurn(input.state, { action: '帮忙', result: '完成', clue: '', nextLocation: 'archive',
    relationshipDelta: 0, relationshipDeltas: { chen: 10000 } });
  assert.equal(next.relationshipChanges.chen, 100);
  assert.deepEqual(next.knownSecrets, []);
  assert.deepEqual(next.completedTaskIds, []);
  assert.deepEqual(next.reachedEndingIds, []);
});
