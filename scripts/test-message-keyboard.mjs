import test from 'node:test';
import assert from 'node:assert/strict';
import { sendOnEnter } from '../lib/message-keyboard.ts';

function run(overrides = {}, composing = false) {
  let sent = 0, prevented = 0;
  sendOnEnter({ key: 'Enter', shiftKey: false, repeat: false, defaultPrevented: false,
    nativeEvent: {}, currentTarget: { value: '你好', disabled: false },
    preventDefault: () => prevented++, ...overrides }, () => sent++, composing);
  return { sent, prevented };
}
void test('Enter sends once and prevents newline; Shift+Enter keeps native newline', () => {
  assert.deepEqual(run(), { sent: 1, prevented: 1 });
  assert.deepEqual(run({ shiftKey: true }), { sent: 0, prevented: 0 });
  assert.deepEqual(run({ key: 'a' }), { sent: 0, prevented: 0 });
});
void test('IME candidate confirmation never sends, including Safari 229 and composition tracking', () => {
  assert.deepEqual(run({ nativeEvent: { isComposing: true } }), { sent: 0, prevented: 0 });
  assert.deepEqual(run({ nativeEvent: { keyCode: 229 } }), { sent: 0, prevented: 0 });
  assert.deepEqual(run({}, true), { sent: 0, prevented: 0 });
});
void test('blank, disabled, held and already-handled Enter do not send', () => {
  for (const overrides of [{ currentTarget: { value: ' \n ', disabled: false } },
    { currentTarget: { value: 'hello', disabled: true } }, { repeat: true }]) {
    assert.deepEqual(run(overrides), { sent: 0, prevented: 1 });
  }
  assert.deepEqual(run({ defaultPrevented: true }), { sent: 0, prevented: 0 });
});
