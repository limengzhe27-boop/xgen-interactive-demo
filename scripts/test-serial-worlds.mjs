// Original catalogue fixtures only. These tests make no model or image requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { serialWorlds } from '../lib/serial-worlds.ts';
import { studioWorlds, getRoleOpening } from '../lib/studio-worlds.ts';
import { publicationWorld } from '../lib/publication.ts';
import { conversationEntry, chatRequest } from '../lib/studio-session.ts';
import { createInitialWorldState, selectRoleGoal } from '../lib/world-state.ts';
import { enforceWorldTurnGuardrails } from '../lib/world-agent-guardrails.ts';
import { resolveWorldSelection, knownRecommendations } from '../lib/personal-recommendations.ts';

test('eight original genres and 24 playable adult roles enter the real catalogue without replacing old IDs', () => {
  assert.equal(serialWorlds.length, 8);
  assert.equal(new Set(serialWorlds.map(w => w.genre)).size, 8);
  assert.equal(serialWorlds.flatMap(w => w.world.characters).length, 24);
  for (const entry of serialWorlds) {
    assert.ok(studioWorlds.some(w => w.id === entry.id && w.title === entry.title));
    assert.deepEqual(publicationWorld(JSON.parse(JSON.stringify(entry.world))), entry.world);
    for (const role of entry.world.characters) {
      assert.ok(Number(role.identity.match(/^([0-9]+) 岁/)?.[1]) >= 18);
      const tasks = entry.world.tasks.filter(t => t.assignedRoleIds.includes(role.id));
      assert.equal(tasks.filter(t => t.kind === 'main').length, 2);
      assert.equal(tasks.filter(t => t.kind === 'side').length, 1);
      assert.equal(entry.roleChoices[role.id].length, 3);
      assert.ok(getRoleOpening(entry, role.id).includes('你的目标：' + role.goal));
      const goal = selectRoleGoal(entry.world, role.id);
      assert.equal(goal.roleId, role.id);
      assert.ok(goal.requiredTaskIds.every(id => tasks.some(t => t.id === id && t.kind === 'main')));
    }
  }
  for (const id of ['contract-expiry', 'client-comeback']) assert.ok(studioWorlds.some(w => w.id === id));
});

test('new role perspectives isolate offscreen scenes and do not expose other roles private facts', () => {
  for (const entry of serialWorlds) for (const role of entry.world.characters) {
    const opening = getRoleOpening(entry, role.id);
    assert.ok(entry.roleOpenings[role.id].includes('你是' + role.name));
    if (role.startLocationId !== entry.world.openingScene.locationId) assert.ok(!opening.includes(entry.world.openingScene.narrative));
    for (const other of entry.world.characters.filter(r => r.id !== role.id)) {
      for (const secret of [...other.secrets, ...other.privateKnowledge]) assert.ok(!opening.includes(secret), `${entry.id}/${role.id} leaked ${other.id}`);
      assert.ok(entry.roleChoices[role.id].every(choice => !choice.startsWith(other.name)), 'choices must not act as another character');
    }
  }
});

test('every new role can open an isolated character chat; skipping their main prerequisites is rejected', () => {
  for (const source of serialWorlds) for (const player of source.world.characters) {
    const original = JSON.stringify(source);
    const target = source.world.characters.find(r => r.id !== player.id);
    const entry = conversationEntry(source, player.id, target.id);
    const state = createInitialWorldState('draft', player.id, player.secrets[0], target.startLocationId, {
      timeSetting: entry.world.timeSetting, coreEvent: entry.world.coreEvent, roleKnowledge: [...player.privateKnowledge, ...player.secrets],
      characterIds: entry.world.characters.map(r => r.id), openingLocationId: target.startLocationId,
      characterLocations: Object.fromEntries(entry.world.characters.map(r => [r.id, r.startLocationId])),
    });
    const request = chatRequest({ id: 'synthetic', entry, playerRoleId: player.id, targetCharacterId: target.id, state, narrative: entry.world.openingScene.narrative, turns: [], savedAt: 0 }, '我想听听你的条件。');
    assert.equal(request.selectedRoleId, player.id);
    assert.equal(request.interaction.targetCharacterId, target.id);
    const response = { actionDecision: { allowed: true }, narrative: '对方没有替你作决定。',
      dialogue: [{ characterId: target.id, text: '先把条件说清楚。', visibleToRoleIds: [player.id] }], nextChoices: [],
      statePatch: { committedFacts: [] }, image: { required: false, reason: 'reuse', sceneId: 'opening' },
      goalProgress: { activeTaskIds: [], completedTaskIds: [], summary: '' }, ending: { reached: false, canContinue: true } };
    assert.doesNotThrow(() => enforceWorldTurnGuardrails(request, structuredClone(response)));
    response.statePatch.completeTaskIds = [`${player.id}-main-2`];
    assert.throws(() => enforceWorldTurnGuardrails(request, response), /invalid_task/);
    assert.equal(JSON.stringify(source), original);
  }
});

test('new recommendations resolve displayed ordinal to an actual world, without another model call', () => {
  for (const entry of serialWorlds) {
    const rows = knownRecommendations([{ worldId: entry.id, reason: entry.genre, matchedMemoryIds: [] }], studioWorlds.map(w => w.id));
    assert.equal(rows.length, 1);
    assert.deepEqual(resolveWorldSelection('第一个', rows, studioWorlds), { kind: 'open', worldId: entry.id });
    assert.deepEqual(resolveWorldSelection('进入《' + entry.title + '》', [], studioWorlds), { kind: 'open', worldId: entry.id });
  }
});

test('all pack art reuses existing local assets and published images with an explicit reference note', () => {
  for (const entry of serialWorlds) {
    assert.ok(entry.artNote.includes('参考图'));
    for (const path of [entry.cover, ...Object.values(entry.portraits)]) assert.ok(existsSync(new URL('../public' + path, import.meta.url)), path);
    const publicEntry = studioWorlds.find(w => w.id === entry.id);
    for (const url of [publicEntry.cover, ...Object.values(publicEntry.portraits)]) {
      if (url.startsWith('/assets/')) assert.ok(existsSync(new URL('../public' + url, import.meta.url)));
      else assert.match(url, /^https:\/\/rrgyjvkkgcurtatidyuc\.supabase\.co\/storage\/v1\/object\/public\/world-public\//);
    }
  }
});
