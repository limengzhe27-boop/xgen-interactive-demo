import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationWorld } from '../lib/publication.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';

test('built-in worlds pass publication validation without losing story definitions', () => {
  for (const entry of studioWorlds) assert.deepEqual(publicationWorld(entry.world), entry.world);
});
test('published characters retain the authored encounter but no extra encounter fields', () => {
  const world = structuredClone(studioWorlds[0].world);
  world.characters[0].chatOpening = { scene: '雨声敲着窗，角色收起桌上的书。', text: '先避一避雨吧。', internal: 'not public' };
  assert.deepEqual(publicationWorld(world).characters[0].chatOpening,
    { scene: '雨声敲着窗，角色收起桌上的书。', text: '先避一避雨吧。' });
});
test('publication whitelists nested fields, excluding personal memories and conversations', () => {
  const world = structuredClone(studioWorlds[0].world);
  world.agentMemories = ['private']; world.creatorMessages = [{ content: 'private' }];
  world.characters[0].accountEmail = 'private@example.test';
  const result = publicationWorld(world);
  assert.equal('agentMemories' in result, false); assert.equal('creatorMessages' in result, false);
  assert.equal('accountEmail' in result.characters[0], false);
});
test('broken references, cycles, invalid identities and excessive content cannot publish', () => {
  for (const change of [
    w => w.characters[0].startLocationId = 'missing',
    w => w.tasks[0].prerequisiteTaskIds = [w.tasks[0].id],
    w => w.tasks[0].assignedRoleIds = ['missing'],
    w => w.characters[1].id = w.characters[0].id,
    w => w.title = 'x'.repeat(121),
    w => w.characters[0].persona = 'x'.repeat(10001),
  ]) { const world = structuredClone(studioWorlds[0].world); change(world); assert.throws(() => publicationWorld(world)); }
});
