// Opt-in, three synthetic text turns only. No uploads, account saves or media calls.
import { mkdir, writeFile } from 'node:fs/promises';
import { studioWorlds, getRoleOpening } from '../lib/studio-worlds.ts';
import { AI_CONTRACT_VERSION } from '../lib/ai-contracts.ts';
import { createInitialWorldState, selectRoleGoal } from '../lib/world-state.ts';
if (process.env.XGEN_RUN_LIVE_EVAL !== '1') throw new Error('Set XGEN_RUN_LIVE_EVAL=1 to run real text requests.');
const base = process.env.XGEN_EVAL_BASE_URL || 'https://xgen-interactive-demo.vercel.app';
const cases = [
  ['spider-under-table', '沿现有丝线试探通往墙角的路线，用腿感知松动处，先判断能否带卵囊通过，不冒险跳跃。'],
  ['peach-source', '我向老人回答：外面如今不是秦朝，秦以后经历了汉、魏晋。我想知道，你们为什么会不知道外面的朝代变化？'],
  ['ximen-red-ledger', '我先不接钥匙，问吴月娘为什么说我比她更该看东厢的东西，同时看西门庆会不会插话。'],
];
const results = [];
await mkdir('work/world-samples-live', { recursive: true });
for (const [id, action] of cases) {
  const entry = studioWorlds.find(w => w.id === id);
  const role = entry.world.characters[0];
  const state = createInitialWorldState('draft', role.id, '', entry.world.locations.find(l => l.id === role.startLocationId).name, {
    timeSetting: entry.world.timeSetting, coreEvent: entry.world.coreEvent, activeGoalId: selectRoleGoal(entry.world, role.id)?.id,
    roleKnowledge: [...role.privateKnowledge, ...role.secrets], characterIds: entry.world.characters.map(c => c.id),
    openingLocationId: role.startLocationId, characterLocations: Object.fromEntries(entry.world.characters.map(c => [c.id, c.startLocationId])),
  });
  const input = { contractVersion: AI_CONTRACT_VERSION, world: entry.world, selectedRoleId: role.id,
    userAction: `${role.name}：${action}`, state, recentTurns: [],
    currentScene: { id: 'sample-opening', title: entry.title, narrative: getRoleOpening(entry, role.id), choices: [] } };
  try {
    const response = await fetch(`${base}/api/ai`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base, 'x-xgen-account': 'guest' },
      body: JSON.stringify({ operation: 'advance-world', input }), signal: AbortSignal.timeout(115000) });
    const output = await response.json();
    const issues = [];
    if (!response.ok) issues.push(`http-${response.status}:${output.error}`);
    else {
      if (!output.actionDecision.allowed) issues.push('ordinary-action-rejected');
      if (id === 'spider-under-table' && output.dialogue.length) issues.push('invented-dialogue');
      if (output.ending.reached) issues.push('premature-ending');
    }
    results.push({ id, input, status: response.status, output, issues });
    console.log(JSON.stringify({ id, status: response.status, output, issues }));
  } catch (error) { results.push({ id, input, issues: [error.message] }); }
  await writeFile('work/world-samples-live/latest.json', JSON.stringify({ base, testedAt: new Date().toISOString(), results }, null, 2));
}
if (results.some(r => r.issues.length)) process.exitCode = 1;
