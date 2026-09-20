import test from 'node:test';
import assert from 'node:assert/strict';
import { chatRecordSubtitle } from '../lib/chat-record-label.ts';

test('neutral or missing chat identities do not render you are you or undefined', () => {
  for (const name of ['你', ' 你 ', '', undefined]) {
    assert.equal(chatRecordSubtitle(name, '临月酒楼'), '自由对话 · 临月酒楼');
  }
});
test('authored identity is retained without altering session data', () => {
  assert.equal(chatRecordSubtitle('唐僧', '西行'), '扮演：唐僧 · 西行');
  assert.equal(chatRecordSubtitle('你', ''), '自由对话');
});
