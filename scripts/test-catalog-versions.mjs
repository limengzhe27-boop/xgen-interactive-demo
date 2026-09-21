import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogVersions } from '../lib/catalog-versions.ts';

test('published version replaces matching stale local entry without duplicate', () => {
  const result = catalogVersions([], [{ id: 'public-1', synopsis: '' }], [{ id: 'public-1', synopsis: '公开简介' }]);
  assert.deepEqual(result, [{ id: 'public-1', synopsis: '公开简介' }]);
});
test('separate draft and offline local versions remain available', () => {
  const local = [{ id: 'draft-1', synopsis: '尚未发布的修改' }, { id: 'offline', synopsis: '保留' }];
  assert.equal(catalogVersions([], local, []).length, 2);
  assert.equal(catalogVersions([], local, [{ id: 'public-1', synopsis: '公开版' }]).length, 3);
});
