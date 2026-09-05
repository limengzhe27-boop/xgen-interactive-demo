import { makeEndingFixture } from './ending-fixture.mjs';
import { createInitialWorldState, commitTurn, selectRoleGoal } from '../lib/world-state.ts';
import { preserveCreatorFramework } from '../lib/creator-framework.ts';
import { narrativeOverlap } from '../lib/world-agent-guardrails.ts';

const baseUrl = process.env.XGEN_EVAL_BASE_URL || 'http://localhost:3000';
function fixture(roleId) {
  const input = makeEndingFixture();
  const world = input.world;
  world.id = 'courtyard-market'; world.title = '小院第一次开市';
  world.premise = '林晚想把家里小院变成周末市集，周岚想先把借来的器具归还邻居，再决定是否支持女儿。陈禾愿意协助双方。物品和工具均在场，不得临时增加审批、资金或锁具障碍。';
  world.coreEvent = '市集筹备与归还借物是两条独立目标线，不要求同时完成才能迎来某个角色的结局。';
  world.locations = [{ id: 'yard', name: '小院', description: '纸笔、空折叠桌、两箱手作商品、借物清单和带标签的器具都在院里，所有任务可在院内进行。', connectedLocationIds: ['door'] },
    { id: 'door', name: '院门', description: '邻居唐叔站在敞开的院门边，愿意接回自家器具。', connectedLocationIds: ['yard'] }];
  world.characters = [
    { id: 'lin', name: '林晚', identity: '成年手作创作者', persona: '认真，想靠自己办成市集', publicBackground: '周岚的女儿', privateKnowledge: ['私人日记标记银杏29'], secrets: ['银杏29'], goal: '办成第一场小院市集', startLocationId: 'yard', imagePrompt: '二十六岁黑色短发女子，蓝色围裙' },
    { id: 'zhou', name: '周岚', identity: '成年院主', persona: '务实，对借物有责任心', publicBackground: '林晚的母亲', privateKnowledge: ['私人存折标记木棉68'], secrets: ['木棉68'], goal: '将借物原样归还唐叔', startLocationId: 'yard', imagePrompt: '五十五岁盘发女子，棕色针织衫' },
    { id: 'chen', name: '陈禾', identity: '成年邻居', persona: '配合明确请求，不擅自替别人做决定', publicBackground: '帮忙筹备', privateKnowledge: [], secrets: [], goal: '协助筹备市集', startLocationId: 'yard', imagePrompt: '三十岁戴眼镜男子，灰色夹克' },
  ];
  world.relationships = [{ fromCharacterId: 'lin', toCharacterId: 'zhou', publicLabel: '母女，对市集经营意见不同', initialTrust: 50 }];
  const task = (id, title, assignedRoleIds, prerequisiteTaskIds, successCondition, kind = 'main') => ({ id, title, description: title, assignedRoleIds, prerequisiteTaskIds, successCondition, kind, difficulty: '必须真实执行，不能宣告完成' });
  world.tasks = [
    task('count', '清点两箱商品', ['lin'], [], '两箱商品已逐件清点'),
    task('price', '写好价目表', ['lin'], ['count'], '价目表已写好放在桌边'),
    task('table', '展开并擦净折叠桌', ['lin'], ['count'], '折叠桌已展开擦净'),
    task('display', '陈列商品', ['lin'], ['price', 'table'], '两箱商品已摆上桌面并放好价目表'),
    task('open', '宣布开市', ['lin'], ['display'], '林晚已面向院门宣布开市'),
    task('photo', '拍下筹备照片', ['lin'], ['count'], '用自带手机拍下院内筹备照片', 'side'),
    task('check', '核对借物清单', ['zhou'], [], '带标签器具与清单已逐件核对'),
    task('return', '把借物交还唐叔', ['zhou'], ['check'], '唐叔已接回全部借物并确认数量'),
  ];
  world.goals = [
    { id: 'return-goal', title: '归还借物', description: '还清借物', scope: 'role', roleId: 'zhou', requiredTaskIds: ['check', 'return'] },
    { id: 'market-goal', title: '办成市集', description: '准备并开市', scope: 'role', roleId: 'lin', requiredTaskIds: ['count', 'price', 'table', 'display', 'open'] },
  ];
  world.endingConditions = [
    { id: 'returned', outcome: 'success', applicableRoleIds: ['zhou'], description: '借物已归还', requiredTaskIds: ['check', 'return'], requiredFacts: [] },
    { id: 'opened', outcome: 'success', applicableRoleIds: ['lin'], description: '小院正式开市', requiredTaskIds: ['count', 'price', 'table', 'display', 'open'], requiredFacts: [] },
    { id: 'chen-arrived', outcome: 'success', applicableRoleIds: ['chen'], description: '陈禾抵达约定地点', requiredTaskIds: [], requiredFacts: ['陈禾已经到达小院'] },
  ];
  world.rules = [{ id: 'causal', kind: 'physical', immutable: true, description: '遵守现实物理。已放好的物品不会无故归位。未选中的角色可以自行推进自己的目标，但只能完成前置已满足的任务。每轮不得替体验者追加未要求的动作或完成未授权任务。重复观察应描述当前结果，不能重演已完成动作。' }];
  world.difficultyConstraints = []; world.scheduledEvents = [];
  world.openingScene = { locationId: 'yard', narrative: world.premise, presentCharacterIds: ['lin', 'zhou', 'chen'], choices: [] };
  // Exercise the same loss-prone projection used between the simple editor and publish.
  const edited = structuredClone(world);
  edited.tasks.forEach((task) => { task.assignedRoleIds = ['lin', 'zhou', 'chen']; });
  edited.goals = [{ ...world.goals[0], scope: 'world', requiredTaskIds: edited.tasks.map((task) => task.id) }];
  edited.endingConditions = [world.endingConditions[0]];
  input.world = preserveCreatorFramework(world, edited);
  input.selectedRoleId = roleId;
  const role = world.characters.find((character) => character.id === roleId);
  input.state = createInitialWorldState('draft', roleId, '', 'yard', { timeSetting: '09:00', coreEvent: world.coreEvent,
    activeGoalId: selectRoleGoal(input.world, roleId).id, roleKnowledge: [...role.privateKnowledge, ...role.secrets], characterIds: world.characters.map((character) => character.id), openingLocationId: 'yard' });
  input.state.committedFacts = ['陈禾已经到达小院']; // NPC's eligible ending must not end either player's run.
  input.currentScene = { id: 'yard-opening', title: '市集筹备', narrative: world.premise, choices: [] };
  return input;
}
const actions = {
  count: '林晚留在当前地点，打开两箱手作商品，逐件清点并把数量写在纸上。',
  price: '林晚留在当前地点，根据刚才的清点结果，用桌边纸笔逐类写好合理价格，把价目表放在桌边。',
  table: '林晚留在当前地点，展开折叠桌，确认桌脚稳固，并用桌边抹布擦净桌面。',
  display: '林晚留在当前地点，将两箱手作商品逐件摆到已经擦净的桌面上，把写好的价目表立在旁边。',
  open: '林晚留在当前地点，面向敞开的院门大声宣布小院市集现在开市，请邻居们进来看看。',
  photo: '林晚留在当前地点，用自己随身的手机拍一张筹备现场照片。',
  check: '周岚留在当前地点，对照桌上的借物清单，逐件核对全部带标签器具的数量和外观。',
  return: '周岚留在当前地点，请院门边的唐叔走进来，将全部已核对器具递给他，请他逐件确认接收数量。',
};
async function run(roleId, order) {
  const input = fixture(roleId); const turns = []; const issues = []; const warnings = [];
  const expected = roleId === 'lin' ? 'opened' : 'returned';
  for (let turn = 0; turn < 10; turn++) {
    const ended = input.state.reachedEndingIds.includes(expected);
    const id = order.find((taskId) => !input.state.completedTaskIds.includes(taskId));
    const name = input.world.characters.find((character) => character.id === roleId).name;
    input.userAction = ended || !id ? `${name}留在当前地点，${['听听陈禾对刚才结果的看法，只听不作承诺', '观察院门边现在有什么动静，不重复整理已完成的物品', '向在场家人询问对今天小院活动的感受'][turn % 3]}。` : actions[id];
    try {
      const startedAt = Date.now();
      const response = await fetch(`${baseUrl}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'advance-world', input }), signal: AbortSignal.timeout(70000) });
      const out = await response.json();
      if (!response.ok) throw Error(`${response.status}:${out.error}`);
      if (!out.actionDecision.allowed) issues.push(`turn ${turn + 1}: legitimate action rejected`);
      if (out.ending.reached && out.ending.endingId !== expected) issues.push(`turn ${turn + 1}: other role ending`);
      if (ended && out.ending.reached) issues.push(`turn ${turn + 1}: repeated ending`);
      if (input.recentTurns.some((previous) => narrativeOverlap(previous.result, out.narrative) >= 0.72)) issues.push('repeated narrative');
      const visible = JSON.stringify([out.narrative, out.dialogue, out.nextChoices]);
      if (visible.includes(roleId === 'lin' ? '木棉68' : '银杏29')) issues.push('other role secret');
      if (out.narrative.length < 300 || out.narrative.length > 750) warnings.push(`turn ${turn + 1}: prose ${out.narrative.length}`);
      turns.push({ turn: turn + 1, action: input.userAction, ms: Date.now() - startedAt, provider: response.headers.get('x-ai-provider'), chars: out.narrative.length, completed: out.statePatch.completeTaskIds, ending: out.ending.endingId, narrative: out.narrative });
      if (out.actionDecision.allowed) input.state = commitTurn(input.state, { action: input.userAction, result: out.narrative, clue: '', nextLocation: out.statePatch.locationId || input.state.location, relationshipDelta: 0, ...out.statePatch, reachedEndingId: out.ending.reached ? out.ending.endingId : undefined });
      input.recentTurns = input.state.eventLedger.slice(-4).map((event) => ({ action: event.action, result: event.result }));
      input.currentScene = { id: out.image.sceneId, title: '小院', narrative: out.narrative, choices: out.nextChoices };
      console.log(`${roleId} turn ${turn + 1}: completed=${input.state.completedTaskIds.join(',')} ending=${out.ending.endingId || '-'}`);
    } catch (error) { issues.push(`turn ${turn + 1}: ${error.message}`); break; }
  }
  if (!input.state.reachedEndingIds.includes(expected)) issues.push(`missing ${expected}`);
  return { roleId, issues, warnings, turns };
}
const routes = [
  ['lin', ['count', 'table', 'photo', 'price', 'display', 'open']],
  ['zhou', ['check', 'return']],
].filter(([roleId]) => !process.env.XGEN_EVAL_ROLE || roleId === process.env.XGEN_EVAL_ROLE);
const results = await Promise.all(routes.map(([roleId, order]) => run(roleId, order)));
console.log(JSON.stringify({ baseUrl, results: results.map((result) => ({ ...result, turns: result.turns.map((turn) => ({ ...turn, narrative: turn.narrative.slice(0, 100) })) })) }, null, 2));
if (results.some((result) => result.issues.length)) process.exitCode = 1;
