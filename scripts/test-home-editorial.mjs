import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_EDITORIAL, CHARACTER_INVITATIONS, featureHomeItems, editorialCopy } from '../lib/home-editorial.ts';
import { creativeGuidance } from '../lib/creative-guidance.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';
void test('reviewed invitations target real roles without changing first eight or character data', () => {
  const snapshot = JSON.stringify(studioWorlds);
  assert.equal(Object.keys(CHARACTER_INVITATIONS).length, 3);
  for (const key of Object.keys(CHARACTER_INVITATIONS)) {
    const [, id, role] = key.split(':');
    assert.ok(studioWorlds.find(w => w.id === id)?.world.characters.some(r => r.id === role));
    const copy = editorialCopy(key);
    assert.ok(copy.tagline.length > 10 && copy.tagline.length <= 50);
    assert.equal(copy.title, undefined);
    assert.ok(!HOME_EDITORIAL.some(e => e.key === key));
  }
  assert.equal(JSON.stringify(studioWorlds), snapshot);
});
void test('all selected cards exist in the real catalogue', () => {
  for (const { key } of HOME_EDITORIAL) {
    const [, id, role] = key.split(':');
    const world = studioWorlds.find(w => w.id === id);
    assert.ok(world, key);
    if (role) assert.ok(world.world.characters.some(r => r.id === role), key);
  }
});
void test('eight distinct-world picks preserve tail and avoid duplicates', () => {
  const keys = HOME_EDITORIAL.map(x => x.key);
  assert.equal(keys.length, 8);
  assert.equal(new Set(keys.map(x => x.split(':')[1])).size, 8);
  assert.equal(keys.filter(x => x.startsWith('character:')).length, 2);
  const input = ['new-world', ...keys.toReversed(), 'another'];
  assert.deepEqual(featureHomeItems(input, x => x), [...keys, 'new-world', 'another']);
  assert.deepEqual(input, ['new-world', ...keys.toReversed(), 'another']);
  assert.deepEqual(featureHomeItems(['new-world', keys[2]], x => x), [keys[2], 'new-world']);
});
void test('character names are not marketing titles and ordinary chat gets no title rules', () => {
  assert.equal(editorialCopy('character:libai-moon-debt:r1').title, undefined);
  assert.equal(editorialCopy('unknown'), undefined);
  for (const op of ['co-create-world', 'generate-world']) assert.ok(creativeGuidance(op).includes('【标题与入口】'));
  for (const op of ['advance-world', 'personal-agent', 'adapt-persona']) assert.ok(!creativeGuidance(op).includes('【标题与入口】'));
});
