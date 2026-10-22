import test from 'node:test';
import assert from 'node:assert/strict';
import { wildWorlds } from '../lib/wild-worlds.ts';
import { visibleSystem, validWorldSystem } from '../lib/world-system.ts';
import { publicationWorld } from '../lib/publication.ts';
import { createInitialWorldState, validateAction } from '../lib/world-state.ts';
import { conversationEntry, chatRequest } from '../lib/studio-session.ts';
import { isWorldTurnRequest } from '../lib/ai-validation.ts';
import { enforceWorldTurnGuardrails } from '../lib/world-agent-guardrails.ts';

test('four fantasy worlds provide 13 distinct playable roles and preserve system metadata on publication', () => {
  assert.equal(wildWorlds.length, 4);
  assert.equal(wildWorlds.flatMap(w => w.world.characters).length, 13);
  for (const entry of wildWorlds) {
    assert.equal(entry.featured, true);
    assert.deepEqual(publicationWorld(JSON.parse(JSON.stringify(entry.world))), entry.world);
    for (const role of entry.world.characters) {
      assert.ok(entry.world.tasks.filter(t => t.assignedRoleIds.includes(role.id) && t.kind === 'main').length >= 3);
      assert.equal(entry.roleChoices[role.id].length, 3);
    }
  }
});

test('each system exposes only the selected role; task-gated rewards survive state serialization', () => {
  for (const { world } of wildWorlds) for (const role of world.characters) {
    const before = visibleSystem(world, role.id, []);
    assert.equal(before.entries.filter(e => e.unlocked).length, 1);
    const reward = before.entries.find(e => !e.unlocked);
    assert.ok(reward);
    assert.equal(reward.action, '');
    assert.equal(reward.description, '完成关联任务后显示系统内容。');
    const definition = world.system.entries.find(e => e.id === reward.id);
    const completed = JSON.parse(JSON.stringify(definition.requiredTaskIds));
    const after = visibleSystem(world, role.id, completed);
    assert.equal(after.entries.find(e => e.id === reward.id).unlocked, true);
    assert.ok(after.entries.find(e => e.id === reward.id).action);
    for (const other of world.characters.filter(r => r.id !== role.id)) {
      assert.ok(!visibleSystem(world, other.id, completed).entries.some(e => e.id === reward.id));
    }
    assert.equal(visibleSystem(world, 'unknown', completed), null);
  }
});

test('all non-empty replies enter the world turn; the agent adjudicates outcomes under world rules', () => {
  const state = createInitialWorldState('draft', 'wukong', '', 'stage');
  const fantasy = wildWorlds[1].world;
  for (const reply of ['?', '嗯', '继续', '直接知道其他人的秘密', '现在直接进入终局', '瞬移', '飞到楼顶']) {
    assert.equal(validateAction(reply, state, [], fantasy).allowed, true, reply);
  }
  assert.equal(validateAction('驾筋斗云飞到楼顶接人', state, [], fantasy).allowed, true);
});

test('world and character turns accept a reply even if the model marks it as rejected', () => {
  const entry = wildWorlds[1];
  const player = entry.world.characters[0];
  const target = entry.world.characters[1];
  const state = createInitialWorldState('draft', player.id, '', target.startLocationId);
  state.characterStates[target.id] = { locationId: target.startLocationId };
  const input = {
    contractVersion: '2026-09-04.v2', world: entry.world, selectedRoleId: player.id,
    interaction: { mode: 'character-chat', targetCharacterId: target.id }, userAction: '?', state,
    recentTurns: [], currentScene: { id: 'chat-test', title: entry.title, narrative: '', speakerCharacterId: target.id, choices: [] },
  };
  const output = {
    actionDecision: { allowed: false, reason: '行动太模糊' }, narrative: '',
    dialogue: [{ characterId: target.id, text: '我在听。', visibleToRoleIds: [player.id] }],
    statePatch: { committedFacts: [] }, nextChoices: [],
    image: { required: false, reason: 'reuse', sceneId: 'chat-test' },
    goalProgress: { activeTaskIds: [], completedTaskIds: [], summary: '' },
    ending: { reached: false, canContinue: true },
  };
  assert.equal(enforceWorldTurnGuardrails(input, output).actionDecision.allowed, true);
  assert.equal(enforceWorldTurnGuardrails({ ...input, interaction: undefined }, output).actionDecision.allowed, true);
});

test('malformed and unknown-reference system data is rejected before model invocation', () => {
  const source = wildWorlds[1];
  const entry = conversationEntry(source, 'wukong', 'tony');
  const state = createInitialWorldState('draft', 'wukong', '', 'stage');
  const request = chatRequest({ id:'test',entry,playerRoleId:'wukong',targetCharacterId:'tony',state,narrative:'合成测试',turns:[],savedAt:0 }, '一起救人');
  assert.equal(isWorldTurnRequest(request), true);
  for (const invalid of [null, {}, { ...entry.world.system, entries:[null] }, { ...entry.world.system, entries:[{...entry.world.system.entries[0],requiredTaskIds:['missing']}] }]) {
    assert.equal(validWorldSystem(invalid, ['wukong'], []), false);
    assert.equal(isWorldTurnRequest({...request,world:{...request.world,system:invalid}}), false);
    assert.throws(() => publicationWorld({...entry.world,system:invalid}));
  }
});
