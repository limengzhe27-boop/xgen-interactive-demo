// Opt-in: up to six real text requests, no media generation or account writes.
// Raw synthetic results stay in ignored work/, never in the public catalogue.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { studioWorlds, getRoleOpening } from '../lib/studio-worlds.ts';
import { AI_CONTRACT_VERSION } from '../lib/ai-contracts.ts';
import { makePersonaAdaptationRequest, readPersonaAdaptationSuggestion } from '../lib/persona-adaptation.ts';
import { joinWorldAsPersona, VISITOR_ID, validPersonaAdmission } from '../lib/player-persona.ts';
import { createInitialWorldState, commitTurn, selectRoleGoal, turnMemoryText } from '../lib/world-state.ts';

if (process.env.XGEN_RUN_LIVE_EVAL !== '1') throw new Error('Set XGEN_RUN_LIVE_EVAL=1 to authorize real text requests.');
const base = process.env.XGEN_EVAL_BASE_URL || 'https://xgen-interactive-demo.vercel.app';
const report = { base, startedAt: new Date().toISOString(), calls: [], issues: [] };
const directory = 'work/persona-live';
await mkdir(directory, { recursive: true });
const replay = process.env.XGEN_EVAL_RESUME === '1'
  ? JSON.parse(await readFile(`${directory}/latest.json`, 'utf8')).calls : [];
async function checkpoint() {
  await writeFile(`${directory}/latest.json`, JSON.stringify(report, null, 2));
}
async function call(operation, input) {
  const cached = replay.shift();
  if (cached?.status === 200) {
    assert.equal(cached.operation, operation);
    assert.equal(cached.action, input.userAction);
    report.calls.push({ ...cached, replayed: true });
    return cached.output;
  }
  report.lastInput = { operation, input };
  await checkpoint();
  const response = await fetch(`${base}/api/ai`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base, 'x-xgen-account': 'guest' },
    body: JSON.stringify({ operation, input }), signal: AbortSignal.timeout(115000) });
  const output = await response.json();
  report.calls.push({ operation, action: input.userAction, status: response.status,
    provider: response.headers.get('x-ai-provider'), output });
  await checkpoint();
  console.log(JSON.stringify({ operation, status: response.status, turn: input.state?.turn, output }));
  assert.ok(response.ok, `${operation}: ${response.status} ${output.error}`);
  return output;
}
try {
  const source = structuredClone(studioWorlds.find(w => w.id === 'contract-expiry'));
  source.world.entryPolicy = { allowPersona: true, allowedRoleIds: [], abilityMode: 'agent-judge', abilities: [] };
  const persona = { version: 1, ownerId: 'synthetic-evaluation', name: '许岚', identity: '路过的旅行者',
    personality: '冷静好奇，但不替别人做决定', appearance: '蓝色外套', abilities: '希望读心、敏锐观察', updatedAt: 1 };
  const adaptationInput = makePersonaAdaptationRequest(source, VISITOR_ID, persona, '根据这个世界判断，不能带入的能力明确拒绝。');
  const adaptation = readPersonaAdaptationSuggestion(await call('adapt-persona', adaptationInput), adaptationInput);
  assert.ok(adaptation);
  let entry = joinWorldAsPersona(source, persona, adaptation.grantedAbilities);
  assert.deepEqual(entry.world.characters.slice(0, -1), source.world.characters);
  const role = entry.world.characters.find(c => c.id === VISITOR_ID);
  let state = createInitialWorldState('draft', role.id, '', entry.world.locations.find(l => l.id === role.startLocationId).name, {
    timeSetting: entry.world.timeSetting, coreEvent: entry.world.coreEvent,
    activeGoalId: selectRoleGoal(entry.world, role.id).id, roleKnowledge: [],
    characterIds: entry.world.characters.map(c => c.id), openingLocationId: role.startLocationId,
    characterLocations: Object.fromEntries(entry.world.characters.map(c => [c.id, c.startLocationId])),
  });
  let currentScene = { id: 'visitor-start', title: entry.title, narrative: getRoleOpening(entry, VISITOR_ID), choices: [] };
  const actions = [
    '许岚留在门外，轻轻敲门，自我介绍叫许岚，问里面是否有人方便说话。我不偷听、不进入。',
    '许岚仍在门外，对愿意回应的人说：我只是路过，看到你们好像在搬行李。请问发生了什么？如果不方便说，我不会追问。',
    '许岚不移动，询问刚才回应我的人希望我怎样帮忙，先听对方说完，不替他做决定。',
    '许岚尝试用自己想象中的读心能力感应刚才那个人最不愿说的秘密，不接触任何文件。',
    '许岚仍在原地，说：我不猜你的心思，我们接着刚才实际谈过的安排说。我之前介绍过的名字是什么？你需要我帮的具体事情是什么？',
  ];
  for (let index = 0; index < actions.length; index++) {
    if (index === 4) {
      const restored = JSON.parse(JSON.stringify({ entry, state, currentScene }));
      assert.ok(validPersonaAdmission(restored.entry.world, VISITOR_ID));
      assert.deepEqual(restored.entry.world.entryAdmission.grantedAbilities, adaptation.grantedAbilities);
      ({ entry, state, currentScene } = restored);
      report.serializedResumeVerified = true;
    }
    const output = await call('advance-world', { contractVersion: AI_CONTRACT_VERSION, world: entry.world,
      selectedRoleId: VISITOR_ID, userAction: actions[index], state, currentScene,
      recentTurns: state.eventLedger.filter(e => e.status === 'committed').slice(-4).map(e => ({ action: e.action, result: e.result })) });
    if (!output.actionDecision.allowed) {
      if (index !== 3) report.issues.push(`ordinary-action-rejected:${index + 1}`);
      continue;
    }
    if (output.ending.reached) report.issues.push(`visitor-ended-on-contact:${index + 1}`);
    if (output.nextChoices.some(c => !c.label.startsWith(persona.name))) report.issues.push(`perspective:${index + 1}`);
    if (output.statePatch.addKnownSecrets?.length && index === 3) report.issues.push('mind-reading-granted');
    const nextLocation = entry.world.locations.find(l => l.id === output.statePatch.locationId)?.name || state.location;
    if (nextLocation !== state.location) report.issues.push(`unauthorized-move:${index + 1}`);
    state = commitTurn(state, { action: actions[index], result: turnMemoryText(output, entry.world, VISITOR_ID),
      clue: output.statePatch.addClues?.[0] || '', nextLocation,
      relationshipDelta: output.statePatch.relationshipDeltas?.world || 0, ...output.statePatch });
    currentScene = { id: `visitor-${state.turn}`, title: entry.title, narrative: output.narrative, choices: output.nextChoices };
  }
  report.finalState = state;
  await checkpoint();
  console.log(JSON.stringify({ issues: report.issues, report: `${directory}/latest.json` }));
  if (report.issues.length) process.exitCode = 1;
} catch (error) {
  report.issues.push(error.message);
  await checkpoint();
  throw error;
}
