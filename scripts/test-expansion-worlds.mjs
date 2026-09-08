import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { expansionWorlds, expansionSeeds } from '../lib/expansion-worlds.ts';
import { studioWorlds, getRoleOpening } from '../lib/studio-worlds.ts';
import { publicationWorld } from '../lib/publication.ts';
import { visibleSystem } from '../lib/world-system.ts';
import { galleryTarget, captureGalleryPosition, restoreGalleryPosition } from '../lib/gallery-memory.ts';

void test('27 new worlds join the existing catalogue without replacing any existing world', () => {
  assert.equal(expansionWorlds.length, 27);
  assert.equal(studioWorlds.length, 47);
  assert.equal(new Set(studioWorlds.map(w => w.id)).size, studioWorlds.length);
  for (const id of ['yoga-lotus-boundary','conquest-watermelon','ascension-work-number','peach-garden-delivery','monkey-pirate-avengers']) assert.ok(studioWorlds.some(w=>w.id===id));
});
for (const entry of expansionWorlds) {
  void test(`${entry.id}: valid playable goals, no broken tasks or missing entry locations`, () => {
    assert.deepEqual(publicationWorld(structuredClone(entry.world)), entry.world);
    assert.ok(entry.world.openingScene.narrative.length > 80);
    assert.equal(entry.world.openingScene.choices.length, 3);
    assert.ok(entry.artNote.length > 20);
    for (const role of entry.world.characters) {
      assert.equal(entry.roleChoices[role.id].length, 3);
      assert.ok(getRoleOpening(entry, role.id).includes(role.goal));
      const tasks=entry.world.tasks.filter(t=>t.assignedRoleIds.includes(role.id));
      assert.ok(tasks.length>=3);
      assert.equal(new Set(tasks.map(t=>t.successCondition)).size,tasks.length);
      assert.ok(tasks.every(t=>t.prerequisiteTaskIds.every(id=>entry.world.tasks.some(p=>p.id===id))));
    }
    if(entry.fixedRoleId) {
      assert.equal(entry.fixedRoleId,'r1');
      assert.equal(entry.world.entryPolicy.allowPersona,false);
      assert.match(entry.world.rules.find(r=>r.id==='first-person').description,/不代写我的回答与决定/);
    }
    if(entry.world.system) {
      assert.ok(visibleSystem(entry.world,'r1',[]));
      for(const role of entry.world.characters.slice(1)) assert.equal(visibleSystem(entry.world,role.id,[]),null);
      assert.equal(visibleSystem(entry.world,'r1',[]).entries[1].unlocked,false);
      assert.equal(visibleSystem(entry.world,'r1',['r1-main-1']).entries[1].unlocked,true);
    }
  });
  void test(`${entry.id}: installed cover and every role have real image files`, async () => {
    for (const path of new Set([entry.cover,...Object.values(entry.portraits)])) {
      const url=new URL('../public'+path,import.meta.url);
      assert.ok((await stat(url)).size>8000);
      const meta=await sharp(fileURLToPath(url)).metadata();
      assert.equal(meta.format,'webp'); assert.ok(meta.width>=500 && meta.height>=500);
    }
  });
}
void test('education checks transfer; different ethical choices are not auto-failure',()=>{
  for(const seed of expansionSeeds.filter(s=>s.learning)) {
    const w=expansionWorlds.find(w=>w.id===seed.id).world;
    assert.ok(w.tasks.some(t=>t.id==='r1-transfer'));
    assert.equal(w.goals.find(g=>g.roleId==='r1').requiredTaskIds.filter(id=>id==='r1-transfer').length,1);
    assert.ok(w.endingConditions.find(e=>e.outcome==='success'&&e.applicableRoleIds.includes('r1')).requiredTaskIds.includes('r1-transfer'));
    assert.match(w.rules.find(r=>r.id==='learning-evidence').description,/事实判断必须有证据/);
  }
  const spider=expansionWorlds.find(w=>w.id==='spider-under-table');
  assert.equal(spider.world.characters.length,1);
  assert.ok(!spider.world.rules.some(r=>r.id==='agency'));
  assert.match(spider.world.rules.find(r=>r.id==='physical').description,/不长人手/);
  assert.equal(expansionWorlds.find(w=>w.id==='pilgrimage-five-secrets').world.characters.length,5);
});
void test('gallery remembers actual card offset, falls back to scrollY, clamps negative positions',()=>{
  assert.equal(galleryTarget({y:1400}),1400);
  assert.equal(galleryTarget({y:1400,offset:80},300,1000),1220);
  assert.equal(galleryTarget({y:0,offset:100},30,0),0);
  let restored;
  const card={dataset:{galleryId:'world:jingke-map'},getBoundingClientRect:()=>({top:60,bottom:560})};
  const old={document:globalThis.document,window:globalThis.window,innerHeight:globalThis.innerHeight};
  try {
    // oxlint-disable-next-line typescript/no-deprecated -- minimal synthetic Document fixture, not a DOM API invocation
    globalThis.document={querySelectorAll:()=>[card]}; globalThis.innerHeight=800;
    globalThis.window={scrollY:1600,scrollTo:input=>{restored=input;}};
    const pos=captureGalleryPosition(); assert.deepEqual(pos,{y:1600,anchor:'world:jingke-map',offset:60});
    card.getBoundingClientRect=()=>({top:1460,bottom:1960}); globalThis.window.scrollY=0;
    restoreGalleryPosition(pos); assert.deepEqual(restored,{top:1400,behavior:'instant'});
  } finally { for(const [key,val] of Object.entries(old)) {if(val===undefined)delete globalThis[key];else globalThis[key]=val;} }
});
