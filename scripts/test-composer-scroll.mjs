import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceComposerScroll as step } from '../lib/composer-scroll.ts';
const start = { y: 100, travel: 0, hidden: false };
test('down hides and up reveals after deliberate movement', () => {
  const hidden = step(start, 130);
  assert.equal(hidden.hidden, true);
  assert.equal(step(hidden, 110).hidden, false);
});
test('small movements accumulate without flicker', () => {
  let state = start;
  for (const y of [104, 108, 112]) state = step(state, y);
  assert.equal(state.hidden, false);
  state = step(state, 116);
  assert.equal(state.hidden, true);
  assert.equal(step(state, 115).hidden, true);
});
test('focused input and top of page remain visible', () => {
  const hidden = step(start, 130);
  assert.equal(step(hidden, 500, true).hidden, false);
  assert.equal(step(hidden, 0).hidden, false);
  assert.equal(step(hidden, -20).y, 0);
});
