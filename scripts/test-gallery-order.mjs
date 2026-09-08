import test from 'node:test';
import assert from 'node:assert/strict';
import {mixGallery} from '../lib/gallery-order.ts';
test('mixed gallery preserves all cards, is stable and separates related worlds',()=>{
 const input=Array.from({length:8},(_,w)=>Array.from({length:4},(_,r)=>({id:`${w}:${r}`,world:`${w}`}))).flat();
 const mix=items=>mixGallery(items,x=>x.id,x=>x.world);
 const output=mix(input);
 assert.equal(new Set(output.map(x=>x.id)).size,input.length);
 assert.deepEqual(output,mix([...input].reverse()));
 for(let i=0;i<16;i++)assert.equal(new Set(output.slice(i,i+5).map(x=>x.world)).size,5);
 assert.equal(mix([...input,{id:'new:1',world:'new'}]).length,input.length+1);
 assert.deepEqual(mix([]),[]);
 assert.equal(mix(input.filter(x=>x.world==='0')).length,4);
});
