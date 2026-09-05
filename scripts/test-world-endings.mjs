import test from 'node:test';
import assert from 'node:assert/strict';
import { enforceWorldTurnGuardrails as guard } from '../lib/world-agent-guardrails.ts';
import { commitTurn } from '../lib/world-state.ts';
import { makeEndingFixture } from './ending-fixture.mjs';

function response(patch = {}, ending = {}) {
  return { actionDecision: { allowed: true }, narrative: '真实模型返回的剧情', dialogue: [], nextChoices: [],
    statePatch: { committedFacts: [], ...patch }, image: { required: false, reason: 'reuse', sceneId: 'now' },
    goalProgress: { activeTaskIds: [], completedTaskIds: [], summary: '' }, ending: { reached: false, canContinue: true, ...ending } };
}
test('success requires all tasks and persists a fact from an earlier turn', () => {
  const input = makeEndingFixture();
  input.state = commitTurn(input.state, { action: '准备', result: '核对完成', clue: '', nextLocation: 'upstairs', relationshipDelta: 0,
    completeTaskIds: ['box', 'pack'], committedFacts: ['台账已搬到楼上', '另一条已验证事实'], addClues: ['线索一', '线索二'] });
  const result = guard(input, response({ completeTaskIds: ['move'] }));
  assert.equal(result.ending.endingId, 'saved');
  assert.equal(result.ending.outcome, 'success');
  assert.ok(input.state.committedFacts.includes('另一条已验证事实'));
  assert.ok(input.state.clues.includes('线索二'));
});
test('failure does not require successful completion of main tasks', () => {
  const input = makeEndingFixture(); input.state.completedTaskIds = ['box'];
  const result = guard(input, response({ failTaskIds: ['pack'], committedFacts: ['三本台账已泡毁'] }));
  assert.equal(result.ending.endingId, 'lost'); assert.equal(result.ending.outcome, 'failure');
});
test('empty ending conditions cannot end a world', () => {
  const input = makeEndingFixture(); input.world.endingConditions = [{ id: 'empty', requiredTaskIds: [], requiredFacts: [] }];
  assert.equal(guard(input, response()).ending.reached, false);
});
test('invalid completion, simultaneous fail and complete, and premature endings reject the whole turn', () => {
  const input = makeEndingFixture();
  assert.throws(() => guard(input, response({ completeTaskIds: ['move'] })), /invalid_task/);
  assert.throws(() => guard(input, response({ completeTaskIds: ['box'], failTaskIds: ['box'] })), /invalid_task/);
  assert.throws(() => guard(input, response({}, { reached: true, endingId: 'saved' })), /premature/);
});
test('continuation preserves history and does not redisplay the same ending', () => {
  const input = makeEndingFixture();
  input.state = commitTurn(input.state, { action: '搬运', result: '台账安全', clue: '', nextLocation: 'upstairs', relationshipDelta: 0,
    completeTaskIds: ['box', 'pack', 'move'], committedFacts: ['台账已搬到楼上'], reachedEndingId: 'saved' });
  const result = guard(input, response({ committedFacts: ['陈舟开始擦干地板'] }, { reached: true, endingId: 'saved' }));
  assert.equal(result.ending.reached, false);
  assert.equal(input.state.turn, 1); assert.equal(input.state.location, 'upstairs');
  assert.deepEqual(input.state.reachedEndingIds, ['saved']);
});
test('guard does not pad prose or invent NPC state; invisible dialogue is withheld', () => {
  const input = makeEndingFixture(); const out = response();
  out.dialogue = [{ characterId: 'chen', text: '秘密', visibleToRoleIds: ['chen'] }];
  const result = guard(input, out);
  assert.equal(result.narrative, out.narrative); assert.deepEqual(result.dialogue, []);
  assert.equal(result.statePatch.characterUpdates, undefined);
});
test('model rejection reason cannot leak secrets', () => {
  const input = makeEndingFixture(); const out = response();
  out.actionDecision = { allowed: false, reason: '不能知道紫槐51' };
  assert.ok(!JSON.stringify(guard(input, out)).includes('紫槐51'));
});
test('world clock advances without clamping at minute 59', () => {
  const input = makeEndingFixture(); input.state.clock = '23:59';
  const next = commitTurn(input.state, { action: '观察', result: '观察', clue: '', nextLocation: 'archive', relationshipDelta: 0 });
  assert.equal(next.clock, '00:04');
});
