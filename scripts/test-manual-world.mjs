import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';

test('manual creation uses its own brief, not the legacy lighthouse story', async () => {
  const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const materialize = source.slice(source.indexOf('function materializeCreatorWorld'), source.indexOf('function createWorldFromManualStory'));
  assert.match(materialize, /coreGoal: creatorBrief.coreGoal.trim\(\)/);
  assert.match(materialize, /successCondition: creatorBrief.successCondition.trim\(\)/);
  const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['makePlayableDraftRoles', 'makeEditableOutline', 'tasksFromStory', 'briefTasksToWorldTasks', 'normalizeCreatorBrief', 'buildWorldDefinition', 'buildCreatorWorld'];
  const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(ast)).join('\n');
  const js = ts.transpileModule(`const normalizeSurpriseLevel=n=>Math.min(4,Math.max(1,n)); ${functions}; export {buildCreatorWorld};`, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { buildCreatorWorld } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  const world = buildCreatorWorld('雨夜书店', '寻找一本误放的旧书', ['林舟','周岚'].map(name => ({name,identity:'成年店员',personality:'冷静',relationship:'同事',appearance:''})), [], 2, {coreGoal:'共同找到旧书并归还',successCondition:'旧书已归还',failureCondition:'',complexityLevel:1,tasks:[],difficulties:[],scheduledEvents:[]});
  assert.ok(world.characters.every(c => c.goal === '共同找到旧书并归还'));
  assert.equal(world.openingScene.choices[0].label, '先观察当前现场');
  assert.doesNotMatch(JSON.stringify(world), /灯塔|雾潮|航海日志|凌晨三点|明天的内容/);
});
