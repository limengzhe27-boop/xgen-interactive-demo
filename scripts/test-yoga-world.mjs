import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {yogaWorld as entry,yogaArtPaths} from '../lib/yoga-world.ts';
import {studioWorlds,getRoleOpening} from '../lib/studio-worlds.ts';
import {publicationWorld} from '../lib/publication.ts';
import {directConversationEntry} from '../lib/studio-session.ts';

test('yoga world is discoverable, valid and has four adult role-specific task lines',()=>{
  assert.ok(studioWorlds.some(world=>world.id===entry.id));
  assert.deepEqual(publicationWorld(structuredClone(entry.world)),entry.world);
  assert.deepEqual(entry.world.characters.map(r=>r.id),['lin','lu','zhou','wang']);
  assert.deepEqual(entry.world.openingScene.presentCharacterIds,['lin']);
  for(const role of entry.world.characters){
    const main=entry.world.tasks.filter(t=>t.kind==='main'&&t.assignedRoleIds.includes(role.id));
    assert.ok(main.length>=2);
    main.forEach((t,i)=>assert.deepEqual(t.prerequisiteTaskIds,i?[main[i-1].id]:[]));
    assert.ok(entry.world.tasks.some(t=>t.kind==='side'&&t.assignedRoleIds.includes(role.id)));
    assert.equal(entry.roleChoices[role.id].length,3);
    assert.ok(directConversationEntry(entry,role.id).world.openingScene.presentCharacterIds.includes(role.id));
  }
});

test('yoga opening preserves unknown facts, locations and non-forced outcomes',()=>{
  const husband=getRoleOpening(entry,'zhou');
  assert.ok(!husband.includes('十八万六千'));
  assert.ok(!husband.includes('课后的亲密越界已经发生'));
  assert.match(husband,/你在家中餐厅/);
  assert.ok(!getRoleOpening(entry,'wang').includes('106000'));
  assert.ok(!entry.world.openingScene.narrative.includes('一批同款手链'));
  assert.match(entry.world.rules.find(r=>r.id==='melodrama').description,/后续揭穿、退款、离职和离婚都不是既定事实/);
  assert.match(entry.world.rules.find(r=>r.id==='yoga-ledger').description,/186000/);
  assert.equal(106000+60000+20000,146000+40000);
  assert.ok(entry.world.scheduledEvents.every(e=>/实际/.test(e.trigger)));
});

test('yoga has five dedicated reusable WebP assets',async()=>{
  assert.equal(yogaArtPaths.size,5);
  for(const path of yogaArtPaths){
    const meta=await sharp(fileURLToPath(new URL('../public'+path,import.meta.url))).metadata();
    assert.equal(meta.format,'webp');assert.ok(meta.width>=512&&meta.height>=512);
  }
});
