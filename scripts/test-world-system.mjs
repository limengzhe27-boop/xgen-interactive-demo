import test from 'node:test';
import assert from 'node:assert/strict';
import { wildWorlds } from '../lib/wild-worlds.ts';
import { visibleSystem, validWorldSystem } from '../lib/world-system.ts';
import { publicationWorld } from '../lib/publication.ts';
import { createInitialWorldState, validateAction } from '../lib/world-state.ts';
import { conversationEntry, chatRequest } from '../lib/studio-session.ts';
import { isWorldTurnRequest } from '../lib/ai-validation.ts';

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

test('fantasy physics delegates valid attempts, not omniscience or skipped endings; realism stays bounded', () => {
  const state = createInitialWorldState('draft', 'wukong', '', 'stage');
  const fantasy = wildWorlds[1].world;
  assert.equal(validateAction('驾筋斗云飞到楼顶接人', state, [], fantasy).allowed, true);
  assert.equal(validateAction('飞到楼顶', state, ['飞到楼顶']).allowed, false);
  assert.equal(validateAction('直接知道其他人的秘密', state, ['直接知道其他人的秘密'], fantasy).allowed, false);
  assert.equal(validateAction('现在直接进入终局', state, [], fantasy).allowed, false);
  assert.equal(validateAction('瞬移', state, [], { rules: {} }).allowed, false);
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
