import test from 'node:test';
import assert from 'node:assert/strict';
import { enforceWorldTurnGuardrails as guard, narrativeOverlap } from '../lib/world-agent-guardrails.ts';
import { commitTurn, createInitialWorldState, selectRoleGoal } from '../lib/world-state.ts';
import { makeContentImageKey } from '../lib/image-cache.ts';
import { preserveCreatorFramework } from '../lib/creator-framework.ts';
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
test('explicitly staying in place cannot commit a player move', () => {
  const input = makeEndingFixture(); input.userAction = '许宁留在当前地点，询问下一步安排';
  assert.throws(() => guard(input, response({ locationId: 'upstairs' })), /unauthorized_player_movement/);
  assert.doesNotThrow(() => guard(input, response({ locationId: '档案室' })));
});

test('near-identical long narration is rejected, but short recaps and different feedback are allowed', () => {
  const input = makeEndingFixture();
  const previous = Array.from({ length: 30 }, (_, i) => `许宁核对第${i}份防汛记录，陈舟说明这份记录的保管地点。`).join('');
  input.recentTurns = [{ action: '整理', result: previous }];
  const out = response(); out.narrative = previous.replaceAll('许宁', '你');
  assert.ok(narrativeOverlap(previous, out.narrative) >= 0.72);
  assert.throws(() => guard(input, out), /repeated_narrative/);
  out.narrative = '陈舟提醒你，刚才已经把文件整理完了，现在还没有新的防汛通知。';
  assert.doesNotThrow(() => guard(input, out));
  out.narrative = Array.from({ length: 30 }, (_, i) => `楼上第${i}排窗框正在渗水，走廊的居民递来一只空盆接住雨滴。`).join('');
  assert.doesNotThrow(() => guard(input, out));
});

test('selected role receives their goal and tasks rather than the first role goal', () => {
  const input = makeEndingFixture();
  input.world.goals = [
    { id: 'chen-goal', scope: 'role', roleId: 'chen', title: '陈舟的计划', requiredTaskIds: ['chen-only'] },
    { id: 'xu-goal', scope: 'role', roleId: 'xu', title: '许宁的计划', requiredTaskIds: ['box'] },
  ];
  input.world.tasks.push({ ...input.world.tasks[0], id: 'chen-only', assignedRoleIds: ['chen'] });
  assert.equal(selectRoleGoal(input.world, 'xu').id, 'xu-goal');
  assert.ok(!guard(input, response()).goalProgress.activeTaskIds.includes('chen-only'));
  input.selectedRoleId = 'chen';
  assert.equal(selectRoleGoal(input.world, 'chen').id, 'chen-goal');
  assert.ok(guard(input, response()).goalProgress.activeTaskIds.includes('chen-only'));
  input.world.goals = [input.world.goals[0]];
  assert.notEqual(selectRoleGoal(input.world, 'xu')?.id, 'chen-goal');
});

test('new runs isolate role knowledge and preserve offscreen NPC starting locations', () => {
  const options = { timeSetting: '09:00', coreEvent: '防汛', characterIds: ['xu', 'chen'], openingLocationId: 'archive',
    characterLocations: { xu: 'archive', chen: 'upstairs' } };
  const xu = createInitialWorldState('draft', 'xu', '', 'archive', { ...options, roleKnowledge: ['自己的经历', '自己的秘密'] });
  const chen = createInitialWorldState('draft', 'chen', '', 'upstairs', { ...options, roleKnowledge: ['陈舟的秘密'] });
  assert.deepEqual(xu.knownSecrets, ['自己的经历', '自己的秘密']);
  assert.deepEqual(chen.knownSecrets, ['陈舟的秘密']);
  assert.equal(xu.characterStates.chen.locationId, 'upstairs');
  assert.equal(chen.turn, 0); assert.deepEqual(chen.completedTaskIds, []);
});

test('image cache separates worlds, changed scenes, selected roles and edited appearances', () => {
  const key = (world, role, prompt) => makeContentImageKey('scene', world, role, 'scene-1', prompt);
  assert.equal(key('家庭故事', 'role-0', '厨房'), key('家庭故事', 'role-0', '厨房'));
  assert.notEqual(key('家庭故事', 'role-0', '厨房'), key('宫廷故事', 'role-0', '厨房'));
  assert.notEqual(key('家庭故事', 'role-0', '厨房'), key('家庭故事', 'role-0', '院子'));
  assert.notEqual(key('家庭故事', 'role-0', '厨房'), key('家庭故事', 'role-1', '厨房'));
  assert.notEqual(makeContentImageKey('portrait', '王爱莲', '年轻女子'), makeContentImageKey('portrait', '王爱莲', '老年女子'));
});

test('NPC-specific ending cannot end the selected player run, but a shared ending can', () => {
  const input = makeEndingFixture();
  input.world.endingConditions = [{ id: 'chen-done', applicableRoleIds: ['chen'], description: '陈舟完成联络', requiredTaskIds: [], requiredFacts: ['联络完成'] }];
  const out = response({ committedFacts: ['联络完成'] });
  assert.equal(guard(input, out).ending.reached, false);
  assert.throws(() => guard(input, { ...out, ending: { reached: true, endingId: 'chen-done', canContinue: true } }), /premature_ending/);
  input.selectedRoleId = 'chen';
  assert.equal(guard(input, out).ending.endingId, 'chen-done');
  input.selectedRoleId = 'xu'; delete input.world.endingConditions[0].applicableRoleIds;
  assert.equal(guard(input, out).ending.endingId, 'chen-done');
});

test('publishing and republishing preserves separate goals, task ownership and scoped endings', () => {
  const { world: base } = makeEndingFixture();
  base.goals = [{ id: 'xu-goal', scope: 'role', roleId: 'xu', title: '保存台账', requiredTaskIds: ['box', 'pack', 'move'] },
    { id: 'chen-goal', scope: 'role', roleId: 'chen', title: '联络', requiredTaskIds: ['contact'] }];
  base.tasks.push({ ...base.tasks[0], id: 'contact', title: '联络', assignedRoleIds: ['chen'] });
  base.endingConditions[0].applicableRoleIds = ['xu'];
  base.endingConditions.push({ id: 'chen-ending', applicableRoleIds: ['chen'], description: '已联络', requiredTaskIds: ['contact'], requiredFacts: [] });
  const edited = structuredClone(base);
  edited.goals = [{ id: 'flattened', title: '保存台账', scope: 'world', requiredTaskIds: edited.tasks.map((task) => task.id) }];
  edited.tasks = edited.tasks.map((task) => ({ ...task, assignedRoleIds: ['xu', 'chen'] }));
  edited.tasks[0].title = '手动修改后的取箱任务';
  edited.endingConditions = [base.endingConditions[0], base.endingConditions[1]];
  const world = preserveCreatorFramework(base, edited);
  assert.equal(world.goals.length, 2);
  assert.equal(world.tasks[0].title, '手动修改后的取箱任务');
  assert.deepEqual(world.tasks.at(-1).assignedRoleIds, ['chen']);
  assert.deepEqual(world.endingConditions.find((ending) => ending.id === 'chen-ending').applicableRoleIds, ['chen']);
  assert.deepEqual(preserveCreatorFramework(world, edited), world);
});

test('manually changed end condition keeps scope and requires the new condition as a fact', () => {
  const { world: base } = makeEndingFixture();
  base.endingConditions[0].applicableRoleIds = ['xu'];
  const edited = structuredClone(base); edited.endingConditions[0].description = '台账归档并完成交接';
  const merged = preserveCreatorFramework(base, edited);
  assert.deepEqual(merged.endingConditions[0].applicableRoleIds, ['xu']);
  assert.deepEqual(merged.endingConditions[0].requiredFacts, ['台账归档并完成交接']);
  assert.deepEqual(merged.tasks[1].prerequisiteTaskIds, ['box']);
});

test('selected character is not a separate person listening to the player', () => {
  const input = makeEndingFixture(); const out = response();
  out.narrative = '许宁听到你的话，点头表示理解。';
  assert.throws(() => guard(input, out), /player_perspective_drift/);
  out.narrative = '陈舟听到你的话，点头表示理解。';
  assert.doesNotThrow(() => guard(input, out));
});
