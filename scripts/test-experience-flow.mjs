import test from 'node:test';
import assert from 'node:assert/strict';
import { currentPlayableTask, taskDisplayStatus } from '../lib/experience-flow.ts';

const task = (id, kind = 'main', prerequisiteTaskIds = []) => ({ id, title: id, kind, prerequisiteTaskIds });
test('current objective prefers available main tasks and never skips prerequisites', () => {
  const tasks = [task('final', 'main', ['first']), task('side', 'side'), task('first')];
  assert.equal(currentPlayableTask(tasks, [], []).id, 'first');
  assert.equal(currentPlayableTask(tasks, ['first'], []).id, 'final');
  assert.equal(currentPlayableTask(tasks, ['first', 'final'], []).id, 'side');
  assert.equal(currentPlayableTask(tasks, ['first', 'final', 'side'], []), undefined);
});
test('failed tasks and blocked descendants cannot be the next suggested objective', () => {
  const tasks = [task('first'), task('final', 'main', ['first']), task('side', 'side')];
  assert.equal(currentPlayableTask(tasks, [], ['first']).id, 'side');
  assert.equal(taskDisplayStatus(tasks[0], [], ['first']), '未达成');
  assert.equal(taskDisplayStatus(tasks[1], [], ['first']), '前置未达成');
  assert.equal(taskDisplayStatus(tasks[1], [], []), '待前置完成');
});
test('progress display preserves original data and accepts cross-role prerequisite facts', () => {
  const tasks = [task('mine', 'main', ['shared'])];
  const before = JSON.stringify(tasks);
  assert.equal(currentPlayableTask(tasks, ['shared'], []).id, 'mine');
  assert.equal(JSON.stringify(tasks), before);
  assert.equal(currentPlayableTask([], [], []), undefined);
});
