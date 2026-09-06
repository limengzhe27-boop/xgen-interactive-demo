import test from 'node:test';
import assert from 'node:assert/strict';
import { creatorChanges, applyCreatorChange } from '../lib/creator-changes.ts';
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
test('creator tasks reject invalid ownership, cycles and prerequisites a selected role cannot perform', () => {
  assert.deepEqual(creatorTaskIssues([task('a', ['draft-role-0']), task('b', ['draft-role-0'], ['a']), task('c', ['draft-role-1'])], 2), []);
  assert.ok(creatorTaskIssues([task('a', ['draft-role-0']), task('b', ['draft-role-1'], ['a'])], 2).some((error) => error.includes('无法完成前置')));
  assert.ok(creatorTaskIssues([task('a', [], ['b']), task('b', [], ['a'])], 2).some((error) => error.includes('循环')));
  assert.ok(creatorTaskIssues([task('a', ['missing'])], 2).length);
  assert.ok(creatorTaskIssues([task('a', [], ['missing'])], 2).length);
  assert.ok(creatorTaskIssues([task('a', []), task('a', [])], 2).length);
  assert.deepEqual(creatorTaskIssues([task('a', undefined), task('b', [], ['a'])], 2), []);
});
