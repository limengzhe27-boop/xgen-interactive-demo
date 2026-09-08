import test from 'node:test';
import assert from 'node:assert/strict';
import { creatorChanges, applyCreatorChange, ensureCreatorRoleIds, identifyProposedRoles } from '../lib/creator-changes.ts';
import { creatorTaskIssues } from '../lib/creator-task-graph.ts';

test('creator proposals and undo are section-scoped and do not overwrite intervening manual edits', () => {
  const before = { title: '原名', premise: '原背景' };
  const [change] = creatorChanges(before, { title: '建议名称' }, { title: '世界名称' });
  const applied = applyCreatorChange({ ...before, premise: '我修改的背景' }, change);
  assert.deepEqual(applied, { title: '建议名称', premise: '我修改的背景' });
  assert.equal(applyCreatorChange({ ...before, title: '手写名称' }, change), null);
  assert.deepEqual(applyCreatorChange(applied, change, true), { title: '原名', premise: '我修改的背景' });
  assert.equal(applyCreatorChange({ ...applied, title: '采纳后手写' }, change, true), null);
  assert.deepEqual(creatorChanges(before, before, { title: '名称' }), []);
});

const task = (id, owner, parents = []) => ({ id, title: id, kind: 'main', description: '方向', successCondition: '获得证据', difficulty: '对手阻挠', assignedRoleIds: owner, prerequisiteTaskIds: parents });
const role = (name) => ({ name, identity: '成年人', personality: '理性', relationship: '合作', appearance: '短发', goal: '寻找证据' });
const castState = () => ({ title: '原名', castAndTasks: { roles: ensureCreatorRoleIds([role('苏晚'), role('顾言舟')]), tasks: [task('a', ['draft-role-0'])] } });
const changesBetween = (before, after) => creatorChanges(before, after, { title: '世界名称', castAndTasks: '角色任务' });

test('role goals apply and undo without replacing other role fields, tasks or other characters', () => {
  const before = castState(); const after = structuredClone(before);
  after.castAndTasks.roles[0].goal = '赢回署名'; after.castAndTasks.roles[1].goal = '赢得信任';
  after.castAndTasks.roles[0].personality = '更加果断';
  const changes = changesBetween(before, after);
  assert.equal(changes.length, 3);
  const goal = changes.find((change) => change.label === '苏晚 · 目标');
  const manual = structuredClone(before); manual.castAndTasks.roles[0].appearance = '手写新外观';
  const applied = applyCreatorChange(manual, goal);
  assert.equal(applied.castAndTasks.roles[0].goal, '赢回署名');
  assert.equal(applied.castAndTasks.roles[0].appearance, '手写新外观');
  assert.deepEqual(applied.castAndTasks.roles[1], before.castAndTasks.roles[1]);
  assert.deepEqual(applied.castAndTasks.tasks, before.castAndTasks.tasks);
  assert.deepEqual(applyCreatorChange(applied, goal, true), manual);
  applied.castAndTasks.roles[0].goal = '采纳后的手动目标';
  assert.equal(applyCreatorChange(applied, goal, true), null);
});

test('private editor identities survive save/rename and old suggestions never target replacement characters', () => {
  const before = castState(); const after = structuredClone(before); after.castAndTasks.roles[1].goal = '新目标';
  const [change] = changesBetween(before, after);
  const shifted = structuredClone(before); shifted.castAndTasks.roles.shift();
  assert.equal(applyCreatorChange(shifted, change).castAndTasks.roles[0].goal, '新目标');
  shifted.castAndTasks.roles = ensureCreatorRoleIds([role('新角色')]);
  assert.equal(applyCreatorChange(shifted, change), null);
  assert.deepEqual(ensureCreatorRoleIds(JSON.parse(JSON.stringify(before.castAndTasks.roles))), before.castAndTasks.roles);
  const renamed = identifyProposedRoles(before.castAndTasks.roles, [role('苏晚的新名字'), role('顾言舟')]);
  assert.deepEqual(renamed.map((r) => r.editorId), before.castAndTasks.roles.map((r) => r.editorId));
});

test('new, removed and reordered cast uses explicit grouped confirmation; duplicate identity cannot slip through', () => {
  const before = castState(); const after = structuredClone(before);
  after.castAndTasks.roles = identifyProposedRoles(before.castAndTasks.roles, [role('顾言舟'), role('新角色'), role('苏晚')]);
  assert.equal(after.castAndTasks.roles[0].editorId, before.castAndTasks.roles[1].editorId);
  const [change] = changesBetween(before, after); assert.equal(change.key, 'castAndTasks');
  const manual = structuredClone(before); manual.castAndTasks.roles[0].goal = '手动目标';
  assert.equal(applyCreatorChange(manual, change), null);
  const duplicates = ensureCreatorRoleIds([{ ...role('甲'), editorId:'same' }, { ...role('乙'), editorId:'same' }]);
  assert.notEqual(duplicates[0].editorId, duplicates[1].editorId);
});

test('tasks are independently applied by ID and deletion undo restores task order', () => {
  const before = castState(); before.castAndTasks.tasks.push(task('b', ['draft-role-1']));
  const after = structuredClone(before); after.castAndTasks.tasks[0].title = '新任务名'; after.castAndTasks.tasks[1].difficulty = '新困难';
  const changes = changesBetween(before, after); assert.equal(changes.length, 2);
  const manual = structuredClone(before); manual.castAndTasks.tasks[1].description = '手动内容';
  const applied = applyCreatorChange(manual, changes.find((c) => c.target.id === 'a'));
  assert.equal(applied.castAndTasks.tasks[0].title, '新任务名');
  assert.equal(applied.castAndTasks.tasks[1].description, '手动内容');
  assert.equal(applyCreatorChange(manual, changes.find((c) => c.target.id === 'b')), null);
  const deleted = structuredClone(before); deleted.castAndTasks.tasks.shift();
  const [removal] = changesBetween(before, deleted);
  assert.deepEqual(applyCreatorChange(applyCreatorChange(before, removal), removal, true), before);
  const reordered = structuredClone(before); reordered.castAndTasks.roles.reverse();
  assert.equal(applyCreatorChange(reordered, changes[0]), null);
});

test('dependent tasks require prerequisites first and undo cannot safely remove an in-use prerequisite', () => {
  const before = castState(); before.castAndTasks.tasks = [];
  const after = structuredClone(before); after.castAndTasks.tasks = [task('a', ['draft-role-0']), task('b', ['draft-role-0'], ['a'])];
  const changes = changesBetween(before, after); const a = changes.find(c => c.target.id === 'a'); const b = changes.find(c => c.target.id === 'b');
  assert.ok(creatorTaskIssues(applyCreatorChange(before, b).castAndTasks.tasks, 2).length);
  const applied = applyCreatorChange(applyCreatorChange(before, a), b);
  assert.deepEqual(creatorTaskIssues(applied.castAndTasks.tasks, 2), []);
  assert.ok(creatorTaskIssues(applyCreatorChange(applied, a, true).castAndTasks.tasks, 2).length);
  assert.deepEqual(applyCreatorChange(applyCreatorChange(applied, b, true), a, true), before);
});
test('creator tasks allow cross-role dependencies but reject invalid owners and cycles', () => {
  assert.deepEqual(creatorTaskIssues([task('a', ['draft-role-0']), task('b', ['draft-role-0'], ['a']), task('c', ['draft-role-1'])], 2), []);
  assert.deepEqual(creatorTaskIssues([task('a', ['draft-role-0']), task('b', ['draft-role-1'], ['a'])], 2), []);
  assert.ok(creatorTaskIssues([task('a', [], ['b']), task('b', [], ['a'])], 2).some((error) => error.includes('循环')));
  assert.ok(creatorTaskIssues([task('a', ['missing'])], 2).length);
  assert.ok(creatorTaskIssues([task('a', [], ['missing'])], 2).length);
  assert.ok(creatorTaskIssues([task('a', []), task('a', [])], 2).length);
  assert.deepEqual(creatorTaskIssues([task('a', undefined), task('b', [], ['a'])], 2), []);
});
