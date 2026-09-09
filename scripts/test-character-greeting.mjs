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
