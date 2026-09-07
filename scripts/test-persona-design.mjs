import test from 'node:test';
import assert from 'node:assert/strict';
import { readPersonaDraft, readPersonaDesignInput, readPersonaDesignReply } from '../lib/persona-design.ts';
const draft = { name: '游侠', identity: '虚构成年人', personality: '好奇', appearance: '银色短发', abilities: '解读机关' };
test('persona design whitelists fictional fields and cannot carry ownership, portraits, or memories', () => {
  const input = readPersonaDesignInput({ contractVersion: 'test', message: '改成黑发', draft: { ...draft, ownerId: 'other', portraitUrl: 'https://tracking.invalid' }, conversation: [{ role: 'user', content: '虚构测试', secret: 'discard' }], currentMemories: ['private'], world: { secret: 'private' } });
  assert.deepEqual(input, { contractVersion: 'test', message: '改成黑发', draft, conversation: [{ role: 'user', content: '虚构测试' }] });
  assert.deepEqual(readPersonaDesignReply({ reply: '待确认', proposal: { ...draft, ownerId: 'other' }, action: 'save' }), { reply: '待确认', proposal: draft });
});
test('malformed and oversized persona requests and outputs are rejected', () => {
  const input = { contractVersion: 'test', message: '测试', draft, conversation: [] };
  for (const change of [{ message: ' ' }, { message: 'a'.repeat(2001) }, { draft: {} }, { conversation: Array(7).fill({ role: 'user', content: 'x' }) }, { conversation: [{ role: 'system', content: 'x' }] }]) assert.equal(readPersonaDesignInput({ ...input, ...change }), null);
  assert.equal(readPersonaDraft({ ...draft, name: 'a'.repeat(41) }), null);
  assert.equal(readPersonaDesignReply({ reply: '', proposal: draft }), null);
  assert.equal(readPersonaDesignReply({ reply: '有效回复', proposal: { ...draft, abilities: [] } }), null);
});
