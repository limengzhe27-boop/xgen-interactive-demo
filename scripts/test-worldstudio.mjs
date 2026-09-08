import test from 'node:test';
import assert from 'node:assert/strict';
import { contractWorld, studioWorlds, getRoleOpening } from '../lib/studio-worlds.ts';
import { upsertById, conversationEntry, directConversationEntry, chatRequest } from '../lib/studio-session.ts';
import { createInitialWorldState } from '../lib/world-state.ts';
import { enforceWorldTurnGuardrails } from '../lib/world-agent-guardrails.ts';

test('direct chat creates a neutral participant without changing the world or inheriting secrets', () => {
  const before = JSON.stringify(contractWorld);
  const chat = directConversationEntry(contractWorld, 'gu');
  const visitor = chat.world.characters.at(-1);
  assert.equal(visitor.name, '你');
  assert.deepEqual(visitor.secrets, []);
  assert.deepEqual(visitor.privateKnowledge, []);
  assert.equal(chat.world.relationships.some(r => r.fromCharacterId === visitor.id || r.toCharacterId === visitor.id), false);
  assert.deepEqual(chat.world.openingScene.presentCharacterIds, [visitor.id, 'gu']);
  assert.equal(JSON.stringify(contractWorld), before);
  assert.throws(() => directConversationEntry(contractWorld, 'missing'));
});

test('conversation and exploration definitions are isolated; player and target cannot coincide', () => {
  const before = JSON.stringify(contractWorld);
  const chat = conversationEntry(contractWorld, 'su', 'shen');
  assert.equal(chat.world.openingScene.locationId, 'study');
  assert.equal(chat.world.characters.find((role) => role.id === 'su').startLocationId, 'study');
  assert.equal(JSON.stringify(contractWorld), before);
  assert.throws(() => conversationEntry(contractWorld, 'gu', 'gu'), /identity/);
  assert.throws(() => conversationEntry(contractWorld, 'nobody', 'gu'), /identity/);
});
test('offscreen role starts in their own place without receiving the global opening', () => {
  const text = getRoleOpening(contractWorld, 'shen');
  assert.ok(text.includes('你是沈知衡'));
  assert.ok(!text.includes('顾言舟站在离门几步远'));
  assert.ok(!text.includes('你已拒绝董事会'));
});
test('every playable role has scoped goals, prerequisites and reachable nonempty endings', () => {
  for (const entry of studioWorlds) {
  const world = entry.world;
  for (const role of world.characters.filter(role => !entry.fixedRoleId || role.id === entry.fixedRoleId)) {
    const goal = world.goals.find((goal) => goal.roleId === role.id);
    assert.ok(goal.requiredTaskIds.length >= 2);
    assert.ok(goal.requiredTaskIds.every((id) => world.tasks.some((task) => task.id === id && task.assignedRoleIds.includes(role.id))));
    const ending = world.endingConditions.find((ending) => ending.outcome === 'success' && ending.applicableRoleIds.includes(role.id));
    assert.deepEqual(ending.requiredTaskIds, goal.requiredTaskIds);
  }
  }
});

test('worlds have reachable goals; multi-character worlds also support direct conversation', () => {
  assert.equal(new Set(studioWorlds.map((world) => world.id)).size, studioWorlds.length);
  assert.ok(studioWorlds.length >= 17);
  for (const entry of studioWorlds) {
    const world = entry.world;
    const locations = new Set(world.locations.map((place) => place.id));
    assert.equal(world.id, entry.id);
    for (const place of world.locations) assert.ok(place.connectedLocationIds.every((id) => locations.has(id)));
    for (const role of world.characters) {
      assert.ok(locations.has(role.startLocationId));
      assert.ok(entry.portraits[role.id]);
      assert.ok(getRoleOpening(entry, role.id).includes(role.goal));
      const target = world.characters.find((other) => other.id !== role.id);
      if (target) {
        const chat = conversationEntry(entry, role.id, target.id);
        assert.equal(chat.world.characters.find((candidate) => candidate.id === role.id).startLocationId, target.startLocationId);
      } else {
        assert.equal(entry.fixedRoleId, role.id, 'a solo world must expose its fixed first-person entry');
      }
      const tasks = world.tasks.filter((task) => task.assignedRoleIds.includes(role.id));
      const visited = new Set();
      for (const task of tasks) {
        assert.ok(task.prerequisiteTaskIds.every((id) => visited.has(id)), 'tasks must be reachable in order');
        assert.ok(task.successCondition && task.difficulty);
        visited.add(task.id);
      }
    }
  }
});
test('multiple worlds and role sessions survive updates and JSON roundtrip', () => {
  const first = { id: 'explore-su-1', worldId: 'contract-expiry', roleId: 'su', turn: 1 };
  const second = { id: 'chat-gu-1', worldId: 'contract-expiry', roleId: 'gu', turn: 2 };
  let runs = upsertById([first], second);
  runs = upsertById(runs, { ...first, turn: 3 });
  runs = JSON.parse(JSON.stringify(runs));
  assert.equal(runs.length, 2); assert.equal(runs.find((run) => run.id === second.id).turn, 2);
  const docs = upsertById([{ id: 'world-A', text: '我的手写剧情' }], { id: 'world-B', text: '第二个世界' });
  assert.equal(docs.find((doc) => doc.id === 'world-A').text, '我的手写剧情');
});
test('chat request keeps identity, recent context and world state distinct', () => {
  const entry = conversationEntry(contractWorld, 'su', 'gu');
  const player = entry.world.characters[0];
  const state = createInitialWorldState('draft', 'su', player.secrets[0], '顶层公寓客厅', { timeSetting: entry.world.timeSetting, coreEvent: entry.world.coreEvent, characterIds: entry.world.characters.map((role) => role.id), openingLocationId: 'lounge', roleKnowledge: player.privateKnowledge });
  const session = { id: 'test', entry, playerRoleId: 'su', targetCharacterId: 'gu', state, narrative: entry.world.openingScene.narrative, turns: [], savedAt: 0 };
  const request = chatRequest(session, '你为什么想让我留下？');
  assert.equal(request.selectedRoleId, 'su'); assert.equal(request.interaction.targetCharacterId, 'gu');
  assert.deepEqual(request.recentTurns, []); assert.equal(session.turns.length, 0);
  const premature = { actionDecision: { allowed: true }, narrative: '未经过沟通就完成了所有安排。', dialogue: [], nextChoices: [], statePatch: { committedFacts: [], completeTaskIds: ['su-decide'] }, image: { required: false, reason: 'reuse', sceneId: 'chat' }, goalProgress: { activeTaskIds: [], completedTaskIds: [], summary: '' }, ending: { reached: false, canContinue: true } };
  assert.throws(() => enforceWorldTurnGuardrails(request, premature), /invalid_task/);
});

test('an in-person character chat cannot silently omit its target response', () => {
  const entry = conversationEntry(contractWorld, 'su', 'gu');
  const state = createInitialWorldState('draft', 'su', '', '顶层公寓客厅', { timeSetting: entry.world.timeSetting, coreEvent: entry.world.coreEvent,
    characterIds: ['su', 'gu', 'shen'], openingLocationId: 'lounge', characterLocations: { su: 'lounge', gu: 'lounge', shen: 'study' } });
  const input = chatRequest({ id: 'test', entry, playerRoleId: 'su', targetCharacterId: 'gu', state, narrative: entry.world.openingScene.narrative, turns: [], savedAt: 0 }, '你想说什么？');
  const out = { actionDecision: { allowed: true }, narrative: '窗外仍然下着雨。', dialogue: [], nextChoices: [], statePatch: { committedFacts: [] }, image: { required: false, reason: 'reuse', sceneId: 'now' }, goalProgress: { activeTaskIds: [], completedTaskIds: [], summary: '' }, ending: { reached: false, canContinue: true } };
  assert.throws(() => enforceWorldTurnGuardrails(input, out), /chat_target_missing/);
  out.dialogue.push({ characterId: 'gu', text: '我想听听你的决定。', visibleToRoleIds: ['su'] });
  assert.doesNotThrow(() => enforceWorldTurnGuardrails(input, out));
  input.state.characterStates.gu.locationId = 'terrace'; out.dialogue = [];
  assert.doesNotThrow(() => enforceWorldTurnGuardrails(input, out));
});
