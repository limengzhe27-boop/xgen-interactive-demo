import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { memeWorlds, memeArtPaths } from '../lib/meme-worlds.ts';
import { studioWorlds, getRoleOpening } from '../lib/studio-worlds.ts';
import { publicationWorld } from '../lib/publication.ts';
import { visibleSystem } from '../lib/world-system.ts';

test('new parody worlds lead the catalogue with distinct role goals and reusable art', async () => {
  assert.deepEqual(studioWorlds.filter(w=>memeWorlds.some(m=>m.id===w.id)).map(w=>w.id),memeWorlds.map(w=>w.id));
  assert.equal(memeArtPaths.size,8);
  for(const entry of memeWorlds){
    assert.deepEqual(publicationWorld(structuredClone(entry.world)),entry.world);
    assert.equal(entry.world.characters.length,3);
    for(const role of entry.world.characters){
      const tasks=entry.world.tasks.filter(t=>t.assignedRoleIds.includes(role.id));
      assert.equal(tasks.length,3);
      assert.ok(entry.world.goals.find(g=>g.roleId===role.id).requiredTaskIds.every(id=>tasks.some(t=>t.id===id)));
      assert.equal(entry.roleChoices[role.id].length,3);
      assert.ok(getRoleOpening(entry,role.id).includes(role.goal));
    }
    for(const asset of [entry.cover,...Object.values(entry.portraits)]){
      const file=new URL('../public'+asset,import.meta.url);
      assert.ok((await stat(file)).size>1000);
      const meta=await sharp(fileURLToPath(file)).metadata();
      assert.equal(meta.format,'webp');
      assert.ok(meta.width>=512&&meta.height>=512);
    }
  }
});
test('match has no external system and private melon HUD does not leak into other openings',()=>{
  const [match,melon]=memeWorlds;
  assert.equal(match.world.system,undefined);
  assert.ok(visibleSystem(melon.world,'qiang',[]));
  for(const id of ['judge','courier']){
    assert.equal(visibleSystem(melon.world,id,[]),null);
    assert.ok(!getRoleOpening(melon,id).includes('关联：你的父亲'));
    assert.ok(!getRoleOpening(melon,id).includes('开场剩余两次'));
  }
  assert.ok(getRoleOpening(melon,'qiang').includes('关联：你的父亲'));
  assert.equal(memeArtPaths.has('/assets/library-v3/../private.webp'),false);
});
