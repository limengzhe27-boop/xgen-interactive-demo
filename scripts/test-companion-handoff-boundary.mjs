import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCompanionInput, restoreCompanionContext } from '../lib/companion-context.ts';
test('handoff excludes memories by default and retains only selected messages', () => {
  const selected = [{ role: 'user', content: '只带入这条虚构设定' }];
  assert.deepEqual(makeCompanionInput(restoreCompanionContext({ conversation: selected }), ['私人信息']), {
    confirmedMemories: [], conversation: selected,
  });
});
test('removed memories and cleared context cannot reappear in next model request', () => {
  const context = restoreCompanionContext({ useConfirmedMemories: true, conversation: [] });
  assert.deepEqual(makeCompanionInput(context, []).confirmedMemories, []);
  assert.deepEqual(makeCompanionInput(restoreCompanionContext(undefined), ['保留在个人侧']), { confirmedMemories: [], conversation: [] });
});
