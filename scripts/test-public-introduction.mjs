import test from 'node:test';
import assert from 'node:assert/strict';
import { publicSynopsis, publicRoleIntroduction } from '../lib/public-introduction.ts';
test('public copy wins; explicit blank does not leak fallback story', () => {
  for (const resolve of [publicSynopsis, publicRoleIntroduction]) {
    assert.equal(resolve(' 公开介绍 ', '旧文本'), '公开介绍');
    assert.equal(resolve('', '内部剧情'), '');
    assert.equal(resolve('   ', '内部剧情'), '');
    assert.equal(resolve(undefined, '历史公开介绍'), '历史公开介绍');
  }
});
