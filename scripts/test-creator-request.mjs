import test from 'node:test';
import assert from 'node:assert/strict';
import { CreatorRequest } from '../lib/creator-request.ts';

test('leaving cancels the old draft and permits immediate reentry', () => {
  const gate = new CreatorRequest();
  const a = gate.start();
  gate.cancel();
  assert.equal(a.aborted, true);
  const b = gate.start();
  assert.equal(gate.current(a), false);
  assert.equal(gate.current(b), true);
});
test('late success, failure and finally cannot commit into a newer draft', async () => {
  const gate = new CreatorRequest();
  const a = gate.start();
  const b = gate.start();
  let busy = true, text = 'B';
  await Promise.resolve();
  if (gate.current(a)) text = 'A';
  if (gate.current(a)) busy = false;
  assert.equal(text, 'B');
  assert.equal(busy, true);
  if (gate.current(b)) busy = false;
  assert.equal(busy, false);
  gate.cancel(); gate.cancel();
  assert.equal(gate.current(b), false);
});
