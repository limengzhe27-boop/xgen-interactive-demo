import test from 'node:test';
import assert from 'node:assert/strict';
import { characterGreeting } from '../lib/character-greeting.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';
test('every catalogue role has an immediate nonempty greeting without private fields', () => {
  for (const entry of studioWorlds) for (const role of entry.world.characters) {
    const greeting = characterGreeting(entry,role.id);
    assert.ok(greeting.text.length > 10);
    assert.ok(greeting.scene.includes(role.name));
    const changed = {...entry,world:{...entry.world,characters:entry.world.characters.map(r=>({...r,secrets:['SECRET_TEST'],privateKnowledge:['PRIVATE_TEST']}))}};
    assert.deepEqual(characterGreeting(changed,role.id),greeting);
    assert.deepEqual(JSON.parse(JSON.stringify({greeting})).greeting,greeting);
  }
});
test('missing target rejected', () => assert.throws(()=>characterGreeting(studioWorlds[0],'missing')));
test('Li Bai encounter belongs to his actual world and does not leak his secret poem', () => {
  const entry = studioWorlds.find(world => world.id === 'libai-moon-debt');
  const greeting = characterGreeting(entry, 'r1');
  assert.match(greeting.scene, /临月酒楼/);
  assert.match(greeting.scene, /笔|诗笺/);
  assert.doesNotMatch(greeting.scene, /瀑布|讽刺/);
  assert.doesNotMatch(greeting.text, /在下李白|你想聊什么/);
});
test('newly authored encounter survives serialization and overrides generic fallback', () => {
  const entry = structuredClone(studioWorlds[0]);
  const role = entry.world.characters[0];
  role.chatOpening = { scene: `${role.name}在窗边收起湿伞，雨声敲着玻璃。`, text: '外面的雨还没停吧？先在这里歇一会儿。' };
  assert.deepEqual(characterGreeting(JSON.parse(JSON.stringify(entry)), role.id), role.chatOpening);
});
