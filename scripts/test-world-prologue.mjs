import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { yogaPrologue, worldPrologue, prologueDuration, prologueShotAt } from '../lib/world-prologue.ts';
import { yogaWorld } from '../lib/yoga-world.ts';
import { getRoleOpening } from '../lib/studio-worlds.ts';

test('public prologue is 20 seconds, stops before decisions, and does not disclose private outcomes',()=>{
 assert.equal(prologueDuration(yogaPrologue),20);
 assert.deepEqual([0,4.9,5,10,15,20].map(t=>prologueShotAt(yogaPrologue,t)),[0,0,1,2,3,3]);
 const text=yogaPrologue.shots.map(s=>s.caption).join('');
 for(const secret of ['186000','六万元','十八万','离婚协商','情绪依赖','批量','20条']) assert.ok(!text.includes(secret));
 assert.match(yogaPrologue.handoff,/尚未发生/);
 assert.equal(worldPrologue('other','公开简介','/cover.webp').video,undefined);
 assert.equal(worldPrologue('other','公开简介','/cover.webp').shots[0].caption,'公开简介');
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
