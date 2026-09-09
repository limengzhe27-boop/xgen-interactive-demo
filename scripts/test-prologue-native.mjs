import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileNativeDirectedPrologue} from '../lib/prologue-direction.ts';
const read=name=>JSON.parse(readFileSync(new URL('../docs/'+name,import.meta.url),'utf8'));
const setup=()=>({p:read('prologue-first-person.example.json'),d:read('prologue-first-person.direction.json')});
test('native production rejects historical post plans without mutating them',()=>{
 const {p,d}=setup(),before=structuredClone({p,d});
 assert.throws(()=>compileNativeDirectedPrologue(p,d),/NATIVE_AUDIO/);
 assert.deepEqual({p,d},before);
});
test('native prompt includes every full spoken line and action sound with local timing',()=>{
 const {p,d}=setup();p.audio.mode='native';
 const r=compileNativeDirectedPrologue(p,d);
 assert.equal(r.submissionAuthorized,false);assert.equal(r.modelCapabilityVerified,false);
 assert.equal(r.postDubbingAllowed,false);
 for(const s of r.shots){
  for(const c of s.spokenCues){assert.ok(s.nativeTextToVideoPrompt.includes(c.text));assert.ok(s.nativeImageToVideoPrompt.includes(c.delivery));}
  for(const c of s.sound)assert.ok(s.nativeTextToVideoPrompt.includes(c.description));
 }
 assert.match(r.shots[1].nativeTextToVideoPrompt,/0.30—3.80秒/);
});
test('native independent segment rejects a sentence straddling two requests',()=>{
 const {p,d}=setup();p.audio.mode='native';p.audio.cues[1].end=6.1;
 assert.throws(()=>compileNativeDirectedPrologue(p,d),/跨独立生成片段/);
});
