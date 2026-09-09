import test from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile } from 'node:fs/promises';
import { firstPersonWorld } from '../lib/first-person-world.ts';
import { studioWorlds, getRoleOpening } from '../lib/studio-worlds.ts';
import { ascensionPrologue, ascensionNativePrologue, yogaComparisonPrologue, yogaPrologue, yogaAudioPrologue, worldPrologue, prologueDuration } from '../lib/world-prologue.ts';

test('first-person pilot has one fixed player, another active NPC and an open choice',()=>{
 assert.equal(firstPersonWorld.fixedRoleId,'shen');
 assert.equal(firstPersonWorld.world.characters.length,2);
 assert.equal(firstPersonWorld.world.entryPolicy.allowPersona,false);
 assert.equal(studioWorlds.filter(w=>w.id===firstPersonWorld.id).length,1);
 assert.equal(worldPrologue(firstPersonWorld.id,'',''),ascensionNativePrologue);
 assert.match(getRoleOpening(firstPersonWorld,'shen'),/左腕.*金链/);
 assert.match(getRoleOpening(firstPersonWorld,'shen'),/没有接牌，没有签契/);
 assert.match(firstPersonWorld.world.rules.find(r=>r.id==='first-person').description,/不代写我的回答与决定/);
 assert.match(firstPersonWorld.world.rules.find(r=>r.id==='physical').description,/一次护身剑气/);
 assert.equal(firstPersonWorld.roleChoices.shen.length,3);
});
test('sample videos stay independent; approved voiced yoga is the world default',async()=>{
 assert.equal(worldPrologue('yoga-lotus-boundary','',''),yogaAudioPrologue);
 assert.equal(prologueDuration(worldPrologue('yoga-lotus-boundary','','')),30);
 assert.equal(worldPrologue('yoga-lotus-boundary','','').hasAudio,true);
 assert.deepEqual([ascensionPrologue,yogaPrologue,yogaComparisonPrologue].map(prologueDuration),[20,20,14]);
 assert.equal(new Set([ascensionPrologue.video,yogaPrologue.video,yogaComparisonPrologue.video]).size,3);
 for(const p of [ascensionPrologue,yogaComparisonPrologue]) {
   const file=new URL('../public'+p.video,import.meta.url);
   assert.equal((await readFile(file)).subarray(4,8).toString(),'ftyp');
   assert.ok((await stat(file)).size<8000000);
   for(const shot of p.shots) assert.ok((await stat(new URL('../public'+shot.poster,import.meta.url))).size>0);
 }
 for(const asset of [firstPersonWorld.cover,firstPersonWorld.openingImage,...Object.values(firstPersonWorld.portraits)]) assert.ok((await stat(new URL('../public'+asset,import.meta.url))).size>0);
});
