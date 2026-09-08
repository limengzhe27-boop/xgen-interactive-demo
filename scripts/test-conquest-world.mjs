import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { conquestWorld as entry, conquestArtPaths } from '../lib/conquest-world.ts';
import { studioWorlds, getRoleOpening } from '../lib/studio-worlds.ts';
import { publicationWorld } from '../lib/publication.ts';
import { directConversationEntry } from '../lib/studio-session.ts';

test('conquest has four playable perspectives without replacing the existing parody', () => {
  assert.ok(studioWorlds.some(world=>world.id===entry.id));
  assert.ok(studioWorlds.some(w=>w.title.includes('生死簿')));
  assert.deepEqual(publicationWorld(structuredClone(entry.world)),entry.world);
  assert.deepEqual(entry.world.characters.map(r=>r.id),['liu','vendor','companion','witness']);
  assert.equal(entry.world.system,undefined);
  assert.equal(entry.world.surpriseLevel,1);
  assert.equal(entry.world.entryPolicy.allowPersona,false);
  for(const role of entry.world.characters){
    const main=entry.world.tasks.filter(t=>t.kind==='main'&&t.assignedRoleIds.includes(role.id));
    assert.equal(main.length,2);
    assert.deepEqual(main[1].prerequisiteTaskIds,[main[0].id]);
    assert.equal(entry.roleChoices[role.id].length,3);
    assert.ok(getRoleOpening(entry,role.id).includes(role.goal));
    const chat=directConversationEntry(entry,role.id);
    assert.ok(chat.world.openingScene.presentCharacterIds.includes(role.id));
  }
  assert.ok(!getRoleOpening(entry,'witness').includes('称重器具有影响读数的吸铁石'));
  assert.match(entry.artNote,/非官方/);
  assert.match(entry.artNote,/互动扩展/);
});

test('conquest cover and all four portraits are dedicated reusable raster files',async()=>{
  assert.equal(conquestArtPaths.size,5);
  for(const path of conquestArtPaths){
    const meta=await sharp(fileURLToPath(new URL('../public'+path,import.meta.url))).metadata();
    assert.equal(meta.format,'webp');
    assert.ok(meta.width>=512&&meta.height>=512);
  }
});
