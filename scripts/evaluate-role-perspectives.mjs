import { makeEndingFixture } from './ending-fixture.mjs';
import { createInitialWorldState, commitTurn, selectRoleGoal } from '../lib/world-state.ts';

const base = process.env.XGEN_EVAL_BASE_URL || 'http://localhost:3000';
async function run(roleId) {
  const input = makeEndingFixture();
  input.world.goals = [
    { id: 'chen-goal', scope: 'role', roleId: 'chen', title: '确认防汛联络分工', description: '联系楼上值班员', requiredTaskIds: ['contact'] },
    { id: 'xu-goal', scope: 'role', roleId: 'xu', title: '保存台账', description: '把台账装箱搬到楼上', requiredTaskIds: ['box', 'pack', 'move'] },
  ];
  input.world.tasks.push({ id: 'contact', title: '确认联络分工', description: '询问楼上值班员由谁负责通知居民', kind: 'main', assignedRoleIds: ['chen'], prerequisiteTaskIds: [], successCondition: '已获得明确联络分工', difficulty: '实际询问' });
  input.world.characters[0].privateKnowledge = ['备用钥匙暗号青石73'];
  input.world.characters[0].secrets = ['青石73'];
  input.world.characters[1].goal = '确认防汛联络分工';
  input.selectedRoleId = roleId;
  const role = input.world.characters.find((character) => character.id === roleId);
  input.state = createInitialWorldState('draft', roleId, '', 'archive', {
    timeSetting: input.world.timeSetting, coreEvent: input.world.coreEvent,
    activeGoalId: selectRoleGoal(input.world, roleId).id, roleKnowledge: [...role.privateKnowledge, ...role.secrets],
    characterIds: ['xu', 'chen'], openingLocationId: 'archive',
  });
  const issues = []; const turns = [];
  for (let index = 0; index < 2; index++) {
    input.userAction = `${role.name}留在当前地点，${index === 0 ? '观察身边物品，向在场同事询问眼下各自的分工' : '询问对方刚才的分工是否需要自己配合，先听回应，不替对方做决定'}。`;
    const response = await fetch(`${base}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'advance-world', input }), signal: AbortSignal.timeout(70000) });
    const output = await response.json();
    if (!response.ok) { issues.push(`turn ${index + 1}: ${response.status} ${output.error}`); break; }
    if (!output.actionDecision.allowed) issues.push('ordinary inquiry rejected');
    if (!output.nextChoices.length || output.nextChoices.some((choice) => !choice.label.startsWith(role.name))) issues.push('choices not in selected perspective');
    const otherTaskIds = input.world.tasks.filter((task) => !task.assignedRoleIds.includes(roleId)).map((task) => task.id);
    if (output.goalProgress.activeTaskIds.some((id) => otherTaskIds.includes(id))) issues.push('other role tasks exposed as player tasks');
    const visible = JSON.stringify([output.narrative, output.dialogue, output.nextChoices, output.goalProgress]);
    if (visible.includes(roleId === 'xu' ? '紫槐51' : '青石73')) issues.push('other role secret disclosed');
    turns.push({ turn: index + 1, provider: response.headers.get('x-ai-provider'), chars: output.narrative.length, choices: output.nextChoices.map((choice) => choice.label), activeTasks: output.goalProgress.activeTaskIds });
    if (output.actionDecision.allowed) input.state = commitTurn(input.state, { action: input.userAction, result: output.narrative, clue: '', nextLocation: output.statePatch.locationId || input.state.location, relationshipDelta: 0, ...output.statePatch });
    input.recentTurns = input.state.eventLedger.map((event) => ({ action: event.action, result: event.result }));
    input.currentScene = { ...input.currentScene, narrative: output.narrative, choices: output.nextChoices };
  }
  return { roleId, goal: input.state.activeGoalId, issues, turns };
}
const results = await Promise.all(['xu', 'chen'].map(run));
console.log(JSON.stringify({ base, results }, null, 2));
if (results.some((result) => result.issues.length)) process.exitCode = 1;
