import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { yogaPrologue, yogaAudioPrologue, worldPrologue, prologueDuration, prologueShotAt } from '../lib/world-prologue.ts';
import { yogaWorld } from '../lib/yoga-world.ts';
import { getRoleOpening } from '../lib/studio-worlds.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';

test('emperor approved opening is playable native audio and hands off to three fixed-role actions',async()=>{
 const prologue=worldPrologue('emperor-last-decree','','');
 assert.equal(prologue.video,'/assets/prologues/emperor-native-v1/preview.mp4');
 assert.equal(prologue.audioOrigin,'native');assert.equal(prologueDuration(prologue),15);
 const bytes=await readFile(new URL('../public'+prologue.video,import.meta.url));
 assert.equal(bytes.subarray(4,8).toString(),'ftyp');assert.ok(bytes.includes(Buffer.from('soun')));
 const entry=studioWorlds.find(w=>w.id==='emperor-last-decree');assert.ok(entry.fixedRoleId);
 assert.equal(entry.roleChoices[entry.fixedRoleId].length,3);
 assert.match(getRoleOpening(entry,entry.fixedRoleId),/诏书没签|落款处却空着/);
});

test('formal cultivation uses the latest native video, and both real entry points use VideoExplorer',async()=>{
 const current=worldPrologue('ascension-work-number','','');
 assert.match(current.video,/ascension-native-v3/);
 assert.equal(current.audioOrigin,'native');assert.equal(prologueDuration(current),15);
 const home=await readFile(new URL('../app/page.tsx',import.meta.url),'utf8');
 assert.match(home,/view === 'prologue' && activeLibrary && !preferText/);
 assert.match(home,/onBack=\{returnToCatalog\}/);
 const preview=await readFile(new URL('../app/prologue-comparison/ascension-native/page.tsx',import.meta.url),'utf8');
 assert.match(preview,/<VideoExplorer entry=\{entry\}/);
});

test('public prologue is 20 seconds, stops before decisions, and does not disclose private outcomes',()=>{
 assert.equal(prologueDuration(yogaPrologue),20);
 assert.deepEqual([0,4.9,5,10,15,20].map(t=>prologueShotAt(yogaPrologue,t)),[0,0,1,2,3,3]);
 const text=yogaPrologue.shots.map(s=>s.caption).join('');
 for(const secret of ['186000','六万元','十八万','离婚协商','情绪依赖','批量','20条']) assert.ok(!text.includes(secret));
 assert.match(yogaPrologue.handoff,/尚未发生/);
 assert.equal(worldPrologue('other','公开简介','/cover.webp').video,undefined);
 assert.equal(worldPrologue('other','公开简介','/cover.webp').shots[0].caption,'公开简介');
});
test('30-second comparison has a real audio track and preserves the original', async()=>{
 assert.equal(prologueDuration(yogaAudioPrologue),30);
 assert.equal(yogaAudioPrologue.hasAudio,true);
 assert.equal(yogaAudioPrologue.captionsEmbedded,true);
 assert.notEqual(yogaAudioPrologue.video,yogaPrologue.video);
 assert.deepEqual([0,5,10,20,25,30].map(t=>prologueShotAt(yogaAudioPrologue,t)),[0,1,2,3,4,4]);
 const bytes=await readFile(new URL('../public'+yogaAudioPrologue.video,import.meta.url));
 assert.equal(bytes.subarray(4,8).toString(),'ftyp');
 // Inspect track metadata rather than treating a file extension as proof of sound.
 const moov=bytes.indexOf(Buffer.from('moov'));
 assert.ok(moov>0);
 const size=bytes.readUInt32BE(moov-4), metadata=bytes.subarray(moov,moov+size-4);
 assert.ok(metadata.includes(Buffer.from('soun')));
 assert.ok(metadata.includes(Buffer.from('mp4a')));
 assert.ok(bytes.length<12000000);
 assert.ok((await stat(new URL('../public'+yogaAudioPrologue.shots[0].poster,import.meta.url))).size>0);
});
test('role handoff is brief, preserves location and does not replay the entire prologue',()=>{
 const lin=getRoleOpening(yogaWorld,'lin');assert.ok(lin.length<500);assert.match(lin,/你已经穿好衣服/);
 assert.match(getRoleOpening(yogaWorld,'zhou'),/你在家中餐厅/);
 assert.ok(!getRoleOpening(yogaWorld,'zhou').includes('186000'));
 assert.match(getRoleOpening(yogaWorld,'wang'),/你在前台/);
});
test('shared prologue is a real small MP4 asset, not a temporary model URL',async()=>{
 const path=new URL('../public'+yogaPrologue.video,import.meta.url);
 assert.ok((await stat(path)).size<6000000);
 assert.equal((await readFile(path)).subarray(4,8).toString(),'ftyp');
 for(const shot of yogaPrologue.shots) assert.ok((await stat(new URL('../public'+shot.poster,import.meta.url))).size>0);
});

test('after class multi-role prologues are playable native audio with narrative hooks and valid posters',async()=>{
 const { rolePrologue, afterClassZhouPrologue, afterClassShenPrologue, afterClassLinPrologue } = await import('../lib/world-prologue.ts');
 const { AFTER_CLASS_ID } = await import('../lib/after-class-entry.ts');

 const roles = [
   { id: 'draft-role-0', prologue: afterClassZhouPrologue, name: '周野' },
   { id: 'draft-role-1', prologue: afterClassShenPrologue, name: '沈知夏' },
   { id: 'draft-role-2', prologue: afterClassLinPrologue, name: '林小满' },
 ];

 for (const { id, prologue, name } of roles) {
   const bound = rolePrologue(AFTER_CLASS_ID, id, '', '');
   assert.equal(bound.video, prologue.video, `role ${name} video mismatch`);
   assert.equal(bound.audioOrigin, 'native');
   assert.equal(bound.hasAudio, true);
   assert.equal(prologueDuration(bound), 15);
   assert.ok(bound.handoff.length > 10, `role ${name} handoff hook missing`);

   const bytes = await readFile(new URL('../public' + bound.video, import.meta.url));
   assert.equal(bytes.subarray(4, 8).toString(), 'ftyp');
   assert.ok(bytes.includes(Buffer.from('soun')), `role ${name} missing native sound atom`);
   assert.ok(bytes.includes(Buffer.from('mp4a')), `role ${name} missing AAC audio codec`);

   const posterStat = await stat(new URL('../public' + bound.shots[0].poster, import.meta.url));
   assert.ok(posterStat.size > 1000, `role ${name} poster too small or missing`);
 }
});

