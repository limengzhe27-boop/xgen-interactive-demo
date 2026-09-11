import test from 'node:test';
import assert from 'node:assert/strict';
import { reusePublicationArt } from '../lib/reuse-publication-art.ts';

test('updated publication reuses old cast art without generating and keeps new cast missing',async()=>{
 const published={id:'same',cover:'/cover.webp',portraits:{a:'/a.webp'},world:{characters:[{id:'a',name:'甲',imagePrompt:'蓝衣'}]}};
 const local={...published,cover:'',portraits:{},world:{...published.world,characters:[...published.world.characters,{id:'b',name:'乙',imagePrompt:'白衣'}]}};
 const result=reusePublicationArt(local,published);
 assert.equal(result.portraits.a,'/a.webp');assert.equal(result.portraits.b,'');assert.equal(result.cover,'/cover.webp');
 assert.equal(local.cover,'');
 const full=reusePublicationArt({...local,world:published.world},published);
 await preparePublicationImages(full,'fixture',()=>{},async()=>{throw Error('must not regenerate');});
});
test('reuse does not overwrite custom pictures or copy a different character',()=>{
 const published={cover:'/cover.webp',portraits:{a:'/a.webp'},world:{characters:[{id:'a',name:'甲',imagePrompt:'蓝衣'}]}};
 const own={...published,portraits:{a:'/manual.webp'}};
 assert.equal(reusePublicationArt(own,published).portraits.a,'/manual.webp');
 assert.equal(reusePublicationArt({...own,portraits:{},world:{characters:[{id:'a',name:'乙',imagePrompt:'白衣'}]}},published).portraits.a,'');
});
import {preparePublicationImages} from '../lib/publication-images.ts';
import {publicationArt,PUBLICATION_PLACEHOLDER,hasPublicationImage} from '../lib/publication-art.ts';
test('legacy borrowed art is visibly missing and remains eligible for future generation',()=>{
 const old={cover:'/assets/library-v2/storm-manor-cover.webp',portraits:{a:'/assets/library-v2/storm-manor-cover.webp',b:'/saved/b'}};
 const clean=publicationArt(old);
 assert.equal(clean.cover,PUBLICATION_PLACEHOLDER);assert.equal(clean.portraits.a,PUBLICATION_PLACEHOLDER);
 assert.equal(clean.portraits.b,'/saved/b');assert.equal(hasPublicationImage(clean.cover),false);
 assert.notEqual(old.cover,PUBLICATION_PLACEHOLDER);
});
const entry={id:'test',title:'测试',cover:'',portraits:{a:'/existing.webp'},world:{characters:[{id:'a',name:'甲',identity:'访客',imagePrompt:'蓝衣'},{id:'b',name:'乙',identity:'访客',imagePrompt:'白衣'}],openingScene:{narrative:'两人在门口相遇',presentCharacterIds:['a','b']}}};
test('publish prepares missing images only and reuses results',async()=>{
 const calls=[];const generate=async input=>{calls.push(input);return {persistent:true,assetUrl:'/saved/'+input.sceneId};};
 const result=await preparePublicationImages(entry,'fixture',()=>{},generate);
 assert.equal(calls.length,2);assert.equal(result.portraits.a,'/existing.webp');assert.ok(result.cover);
 await preparePublicationImages(result,'fixture',()=>{},generate);assert.equal(calls.length,2);
 assert.equal(entry.cover,'');assert.equal(entry.portraits.b,undefined);
});
test('a failed cover preserves the portrait for retry and does not finish publication',async()=>{
 let partial=entry,calls=0;
 await assert.rejects(preparePublicationImages(entry,'fixture',next=>partial=next,async input=>{calls++;if(input.purpose==='scene')throw Error('offline');return {persistent:true,assetUrl:'/saved/b'};}));
 assert.equal(partial.portraits.b,'/saved/b');assert.equal(partial.cover,'');
 await preparePublicationImages(partial,'fixture',()=>{},async input=>{assert.equal(input.purpose,'scene');return {persistent:true,assetUrl:'/saved/cover'};});
 assert.equal(calls,2);
});
