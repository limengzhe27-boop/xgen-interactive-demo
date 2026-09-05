// Run only with explicit permission to send these two fictional worlds to DeepSeek.
import assert from 'node:assert/strict';
import { workplaceWorld, inheritanceWorld, getRoleOpening } from '../lib/studio-worlds.ts';
import { conversationEntry, chatRequest } from '../lib/studio-session.ts';
import { createInitialWorldState } from '../lib/world-state.ts';
const origin = process.env.DEMO_BASE_URL || 'http://127.0.0.1:3000';
const entries = [workplaceWorld, inheritanceWorld];
async function post(operation, input) {
  const response = await fetch(`${origin}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, input }), signal: AbortSignal.timeout(90000) });
  const body = await response.json();
  assert.equal(response.status, 200, `${operation}: ${JSON.stringify(body)}`);
  assert.equal(response.headers.get('x-ai-provider'), 'deepseek');
  return body;
}
const traces = [];
for (const original of entries) {
  for (const scenario of [{ mode: 'explore', index: 0 }, { mode: 'explore', index: 2 }, { mode: 'chat', index: 0 }]) {
    const player = original.world.characters[scenario.index];
    const target = original.world.characters[1];
    const entry = scenario.mode === 'chat' ? conversationEntry(original, player.id, target.id) : original;
    const role = entry.world.characters.find((item) => item.id === player.id);
    const location = entry.world.locations.find((place) => place.id === role.startLocationId);
    const session = { id: 'synthetic-eval', entry, playerRoleId: role.id, targetCharacterId: target.id, turns: [], savedAt: 0,
      narrative: scenario.mode === 'chat' ? entry.world.openingScene.narrative : getRoleOpening(entry, role.id),
      state: createInitialWorldState('draft', role.id, role.secrets[0], location.name, {
        timeSetting: entry.world.timeSetting, coreEvent: entry.world.coreEvent, roleKnowledge: [...role.privateKnowledge, ...role.secrets],
        characterIds: entry.world.characters.map((item) => item.id), openingLocationId: location.id,
        characterLocations: Object.fromEntries(entry.world.characters.map((item) => [item.id, item.startLocationId])),
      }) };
    const action = scenario.mode === 'chat' ? '我不会现在签字。请你直接说明，最希望我答应的条件是什么？' : '我留在当前地点，观察眼前的情况与手边可以查看的材料，不替其他人做决定。';
    const input = chatRequest(session, action);
    if (scenario.mode === 'explore') delete input.interaction;
    const output = await post('advance-world', input);
    assert.equal(output.actionDecision.allowed, true);
    assert.ok(output.narrative.length >= 160, 'short narrative');
    assert.ok(output.nextChoices.every((choice) => choice.label.startsWith(role.name)), 'wrong choice identity');
    assert.ok(output.dialogue.every((line) => line.visibleToRoleIds.includes(role.id)), 'invisible dialogue');
    assert.equal(output.ending.reached, false, 'premature ending');
    if (scenario.mode === 'chat') assert.ok(output.dialogue.some((line) => line.characterId === target.id), 'target omitted');
    traces.push({ world: entry.id, mode: scenario.mode, player: role.id, narrativeLength: output.narrative.length });
  }
  const recommendation = await post('personal-agent', { contractVersion: '2026-09-04.v2', userMessage: original === workplaceWorld ? '我想体验被轻视后在职场翻身拿回话语权，帮我选个本子。' : '我想体验在豪门遗产争夺中获得自己的财富和家族席位。', currentMemories: [], recentExperiences: [],
    availableWorldIds: entries.map((entry) => entry.id), availableWorlds: entries.map((entry) => ({ id: entry.id, title: entry.title, genre: entry.genre, premise: entry.premise, surpriseLevel: entry.world.surpriseLevel })) });
  assert.equal(recommendation.recommendations[0].worldId, original.id);
  console.log(`${original.id}: exploration, offscreen role, chat and recommendation passed`);
}
console.log(JSON.stringify({ origin, traces }, null, 2));
