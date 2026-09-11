import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileLocalArt,catalogueIdentity} from '../lib/catalog-art.ts';
test('local legacy art follows same public work without overwriting custom art or saves',()=>{
 const local={id:'local',title:'same',premise:'same',world:{characters:[{id:'a',name:'A',imagePrompt:'blue'}]},cover:'/assets/storm-manor.webp',portraits:{}};
 const pub={...local,id:'community-a',cover:'/new-cover.webp',portraits:{a:'/new-a.webp'}};
 const next=reconcileLocalArt(local,[pub]);
 assert.equal(next.id,'local');assert.equal(next.cover,pub.cover);assert.equal(next.portraits.a,pub.portraits.a);
 assert.notEqual(local.cover,next.cover);assert.equal(next.world,local.world);
 assert.equal(catalogueIdentity(local),catalogueIdentity(pub));
 assert.equal(reconcileLocalArt({...local,cover:'/custom.webp'},[pub]).cover,'/custom.webp');
 assert.equal(reconcileLocalArt({...local,premise:'different'},[pub]).cover,local.cover);
});
