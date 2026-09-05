import assert from 'node:assert/strict';
import { contractWorld, getRoleOpening } from '../lib/studio-worlds.ts';
import { conversationEntry, chatRequest } from '../lib/studio-session.ts';
import { createInitialWorldState, commitTurn } from '../lib/world-state.ts';
const origin = process.env.DEMO_BASE_URL || 'http://127.0.0.1:3000';
async function post(operation, input) {
  const response = await fetch(`${origin}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, input }), signal: AbortSignal.timeout(90000) });
  const body = await response.json();
  assert.equal(response.status, 200, `${operation}:${input.selectedRoleId ?? 'personal'} ${JSON.stringify(body)}`);
  assert.equal(response.headers.get('x-ai-provider'), 'deepseek');
  return body;
}
function initial(entry, playerRoleId, targetCharacterId) {
  const player = entry.world.characters.find((role) => role.id === playerRoleId);
  const location = entry.world.locations.find((place) => place.id === player.startLocationId);
  return { id: `eval-${playerRoleId}-${targetCharacterId}`, entry, playerRoleId, targetCharacterId,
    narrative: entry.world.openingScene.narrative, turns: [], savedAt: 0,
    state: createInitialWorldState('draft', player.id, player.secrets[0], location.name, { timeSetting: entry.world.timeSetting, coreEvent: entry.world.coreEvent,
      characterIds: entry.world.characters.map((role) => role.id), roleKnowledge: [...player.privateKnowledge, ...player.secrets], openingLocationId: location.id,
      characterLocations: Object.fromEntries(entry.world.characters.map((role) => [role.id, role.startLocationId])) }) };
}
const traces = await Promise.all([
  ...contractWorld.world.characters.map((role) => ({ mode: 'explore', player: role.id, target: role.id === 'su' ? 'gu' : 'su', actions: ['我留在当前地点，观察眼前的情况，不替任何人做决定。'] })),
  { mode: 'chat', player: 'su', target: 'gu', actions: ['你为什么想让我留下？请直接告诉我。', '我想保留自己的工作室，也不想因为家族利益而续约。你怎么看？'] },
  { mode: 'chat', player: 'gu', target: 'su', actions: ['我不希望协议替我们决定关系。你最在意的是什么？', '我愿意独自承担商业后果，你可以拒绝我。我先听听你的想法。'] },
].filter((scenario) => !process.env.EVAL_SCENARIO || `${scenario.mode}:${scenario.player}` === process.env.EVAL_SCENARIO).map(async (scenario) => {
  const entry = scenario.mode === 'chat' ? conversationEntry(contractWorld, scenario.player, scenario.target) : contractWorld;
  let session = initial(entry, scenario.player, scenario.target);
  if (scenario.mode === 'explore') session.narrative = getRoleOpening(entry, scenario.player);
  const lengths = [];
  for (const action of scenario.actions) {
    const input = chatRequest(session, action);
    if (scenario.mode === 'explore') delete input.interaction;
    const output = await post('advance-world', input);
    assert.equal(output.actionDecision.allowed, true);
    assert.ok(output.narrative.length >= 160, 'unexpectedly short narrative');
    assert.ok(output.nextChoices.every((choice) => choice.label.startsWith(entry.world.characters.find((role) => role.id === scenario.player).name)), 'wrong choice perspective');
    assert.ok(output.dialogue.every((line) => line.visibleToRoleIds.includes(scenario.player)), 'invisible dialogue');
    if (scenario.mode === 'chat') assert.ok(output.dialogue.some((line) => line.characterId === scenario.target), `target did not respond: ${JSON.stringify({ scenario, dialogue: output.dialogue, narrative: output.narrative })}`);
    if (scenario.player === 'shen' && scenario.mode === 'explore') assert.ok(!output.narrative.includes('已拒绝董事会'), 'private information leak');
    const patch = output.statePatch;
    session = { ...session, narrative: output.narrative, turns: [...session.turns, { action, response: output }], state: commitTurn(session.state, { ...patch, action, result: output.narrative, clue: '', nextLocation: entry.world.locations.find((place) => place.id === patch.locationId)?.name || session.state.location, relationshipDelta: 0 }) };
    lengths.push(output.narrative.length);
  }
  return { mode: scenario.mode, player: scenario.player, target: scenario.target, turns: lengths.length, narrativeLengths: lengths };
}));
console.log(JSON.stringify({ origin, traces }, null, 2));
const bad = chatRequest(initial(contractWorld, 'su', 'su'), '你好');
const rejected = await fetch(`${origin}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'advance-world', input: bad }) });
assert.equal(rejected.status, 400);
const personal = await post('personal-agent', { contractVersion: '2026-09-04.v2', userMessage: '我想体验成年人的豪门契约恋爱，别给我复杂解谜。', currentMemories: [], recentExperiences: [], availableWorldIds: ['contract-expiry', 'storm-manor'], availableWorlds: [{ id: 'contract-expiry', title: contractWorld.title, genre: contractWorld.genre, premise: contractWorld.premise, surpriseLevel: 2 }, { id: 'storm-manor', title: '暴雨山庄', genre: '悬疑', premise: '调查失踪的继承人', surpriseLevel: 2 }] });
assert.equal(personal.recommendations[0].worldId, 'contract-expiry');
console.log('Invalid identity rejected (400); personal Agent recommended contract-expiry.');
