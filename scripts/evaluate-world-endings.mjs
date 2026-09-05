import { makeEndingFixture } from './ending-fixture.mjs';
import { commitTurn } from '../lib/world-state.ts';

const base = process.env.XGEN_EVAL_BASE_URL || 'http://localhost:3000';
async function advance(input) {
  let error;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(`${base}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'advance-world', input }), signal: AbortSignal.timeout(70000) });
      const data = await r.json();
      if (!r.ok) throw Error(`${r.status}:${data.error}`);
      return data;
    } catch (e) { error = e; }
  }
  throw error;
}
async function run(route) {
  const input = makeEndingFixture(); const turns = []; const issues = []; const warnings = [];
  const actions = route === 'cooperate'
    ? ['许宁请陈舟把角落未锁的防水箱递过来，并接在手中。', '许宁请陈舟核对三本台账，一起放进箱里并扣好盖子。', '许宁与陈舟抬着装有三本台账的箱子走到楼上值班室，放到干燥桌上。']
    : ['许宁走到角落，把未上锁的防水箱拿到桌边。', '许宁逐本核对桌上三本台账，把三本全部放进防水箱并扣好盖子。', '许宁抱起装有三本台账的箱子沿楼梯走到楼上值班室，把箱子放到干燥桌上。'];
  for (let turn = 0; turn < 8; turn++) {
    const completed = input.state.completedTaskIds;
    const ended = input.state.reachedEndingIds.length > 0;
    input.userAction = ended
      ? `许宁留在当前地点，${turn % 2 ? '向陈舟询问接下来的防汛安排并提出帮忙' : '观察当前环境并整理手边的物品'}，承接已经发生的结局继续生活。`
      : route === 'failure' && completed.includes('box')
        ? '许宁打开门边积水桶，将桌上唯一的三本台账全部放进水中，亲眼看着纸页浸透、墨迹融散，放弃救台账。'
        : actions[!completed.includes('box') ? 0 : !completed.includes('pack') ? 1 : 2];
    try {
      const out = await advance(input);
      const currentLocation = input.world.locations.find((place) => place.id === input.state.location || place.name === input.state.location);
      if (ended && out.statePatch.locationId && ![input.state.location, currentLocation?.id, currentLocation?.name].includes(out.statePatch.locationId)) issues.push(`turn ${turn + 1}: player moved despite staying put`);
      if (!out.actionDecision.allowed) issues.push(`turn ${turn + 1}: legitimate action rejected`);
      if (out.actionDecision.allowed) {
        input.state = commitTurn(input.state, { action: input.userAction, result: out.narrative, clue: '', nextLocation: out.statePatch.locationId || input.state.location, relationshipDelta: 0,
          ...out.statePatch, reachedEndingId: out.ending.reached ? out.ending.endingId : undefined });
      }
      if (ended && out.ending.reached) issues.push(`turn ${turn + 1}: repeated ending`);
      if (!out.narrative || out.narrative.length < 300) warnings.push(`turn ${turn + 1}: short prose ${out.narrative.length}`);
      if (out.narrative.length > 750) warnings.push(`turn ${turn + 1}: long prose ${out.narrative.length}`);
      if (!Object.keys(out.statePatch.characterUpdates ?? {}).includes('chen')) warnings.push(`turn ${turn + 1}: missing NPC update`);
      const visible = JSON.stringify({ narrative: out.narrative, dialogue: out.dialogue, choices: out.nextChoices, reason: out.actionDecision });
      if (visible.includes('紫槐51')) issues.push(`turn ${turn + 1}: private fact disclosed`);
      if (ended && (!input.state.reachedEndingIds.length || (route !== 'failure' && !input.state.completedTaskIds.includes('move')))) issues.push('continuation reset history');
      turns.push({ turn: turn + 1, action: input.userAction, narrative: out.narrative, completed: input.state.completedTaskIds, failed: input.state.failedTaskIds, ending: out.ending, facts: out.statePatch.committedFacts });
      input.recentTurns = input.state.eventLedger.slice(-4).map((e) => ({ action: e.action, result: e.result }));
      input.currentScene = { id: out.image.sceneId, title: '防汛现场', narrative: out.narrative, choices: out.nextChoices };
      process.stdout.write(`${route} turn ${turn + 1}: completed=${input.state.completedTaskIds.join(',')} ending=${out.ending.endingId || '-'}\n`);
    } catch (e) { issues.push(`turn ${turn + 1}: ${e.message}`); break; }
  }
  const expectedEnding = route === 'failure' ? 'lost' : 'saved';
  if (!input.state.reachedEndingIds.includes(expectedEnding)) issues.push(`did not reach ${expectedEnding}`);
  if (!turns.some((t, i) => i > 0 && turns.slice(0, i).some((prev) => prev.ending.reached) && !t.ending.reached)) issues.push('no successful post-ending action');
  return { route, issues, warnings, turns };
}
const routes = process.env.XGEN_EVAL_ROUTE ? [process.env.XGEN_EVAL_ROUTE] : ['solo', 'cooperate', 'failure'];
const results = await Promise.all(routes.map(run));
console.log(JSON.stringify({ base, results: results.map((r) => ({ ...r, turns: r.turns.map((t) => ({ ...t, narrative: t.narrative.slice(0, 90), narrativeLength: t.narrative.length })) })) }, null, 2));
if (results.some((r) => r.issues.length)) process.exitCode = 1;
