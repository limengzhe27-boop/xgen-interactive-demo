import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';

test('manual creation uses its own brief, not the legacy lighthouse story', async () => {
  const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const materialize = source.slice(source.indexOf('function materializeCreatorWorld'), source.indexOf('function createWorldFromManualStory'));
  assert.match(materialize, /coreGoal: creatorBrief.coreGoal.trim\(\)/);
  assert.doesNotMatch(materialize, /tasks: briefFromOutline/);
  const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['makePlayableDraftRoles', 'makeEditableOutline', 'tasksFromStory', 'briefTasksToWorldTasks', 'normalizeCreatorBrief', 'buildWorldDefinition', 'buildCreatorWorld'];
  const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(ast)).join('\n');
  const imports = [
    ['migrateCreatorDirections','creator-directions.ts'],
    ['validDiscoveryGenre','discovery-category.ts'],
    ['isCreatorStoryGraph, creatorStoryIssues','creator-story-graph.ts'],
  ].map(([names,file])=>`import {${names}} from ${JSON.stringify(new URL('../lib/'+file,import.meta.url).href)};`).join('\n');
  const js = ts.transpileModule(`${imports}\nconst normalizeSurpriseLevel=n=>Math.min(4,Math.max(1,n)); ${functions}; export {buildCreatorWorld};`, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { buildCreatorWorld } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  const world = buildCreatorWorld('雨夜书店', '寻找一本误放的旧书', ['林舟','周岚'].map(name => ({name,identity:'成年店员',personality:'冷静',relationship:'同事',appearance:''})), [], 2, {coreGoal:'共同找到旧书并归还',preferredDirection:'旧书已归还',alternativeDirection:'',complexityLevel:1,tasks:[],difficulties:[],scheduledEvents:[]});
  assert.ok(world.characters.every(c => c.goal === '共同找到旧书并归还'));
  assert.equal(world.openingScene.choices[0].label, '先观察当前现场');
  assert.doesNotMatch(JSON.stringify(world), /灯塔|雾潮|航海日志|凌晨三点|明天的内容/);
  const roleWorld = buildCreatorWorld('两个目标', '对立的继承人', ['林舟','周岚'].map((name, index) => ({name, identity:'成年人', personality:'冷静', relationship:'对手', appearance:'', goal: index === 0 ? '拿回继承权' : '保住自己的公司'})), [], 2, { coreGoal:'家产分配',preferredDirection:'争夺结束',alternativeDirection:'',complexityLevel:2,difficulties:[],scheduledEvents:[], tasks: [
    {id:'a',title:'核验遗嘱',description:'核验',kind:'main',assignedRoleIds:['draft-role-0'],prerequisiteTaskIds:[],successCondition:'核验完成',difficulty:'假证人'},
    {id:'b',title:'赢得股东支持',description:'协商',kind:'main',assignedRoleIds:['draft-role-1'],prerequisiteTaskIds:[],successCondition:'表决通过',difficulty:'反对者'},
    {id:'c',title:'探望旧友',description:'拜访',kind:'side',assignedRoleIds:['draft-role-0'],prerequisiteTaskIds:[],successCondition:'已拜访',difficulty:'交通'},
  ] });
  assert.equal(roleWorld.characters[0].goal, '拿回继承权');
  assert.equal(roleWorld.characters[1].goal, '保住自己的公司');
  assert.deepEqual(roleWorld.goals.find(goal => goal.roleId === 'draft-role-0').requiredTaskIds, ['a']);
  assert.deepEqual(roleWorld.goals.find(goal => goal.roleId === 'draft-role-1').requiredTaskIds, ['b']);
  assert.ok(roleWorld.endingConditions.every(ending => ending.outcome === undefined));
  assert.deepEqual(roleWorld.endingConditions, []);
  assert.deepEqual(world.tasks, []);
  assert.deepEqual(world.endingConditions, []);
  assert.deepEqual(roleWorld.tasks.find(task => task.id === 'c').assignedRoleIds, ['draft-role-0']);
});
