import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreUserProfile, profileMemories, emptyProfile } from '../lib/user-profile.ts';
import { localChineseVoices, voiceIndex, speechChunks } from '../lib/local-speech.ts';
test('legacy saves do not infer a real profile from fictional identity', () => {
  assert.deepEqual(restoreUserProfile(undefined), emptyProfile);
  assert.deepEqual(restoreUserProfile({ name:'皇帝',personality:'冷酷',secrets:['secret'] }), emptyProfile);
  assert.equal(restoreUserProfile({ introduction:'a'.repeat(800) }).introduction.length,600);
  assert.deepEqual(profileMemories(emptyProfile),[]);
  assert.match(profileMemories({ ...emptyProfile, preferences:'喜欢喜剧' })[0],/用户当前填写/);
});
test('speech never falls back to remote or non-Chinese voices', () => {
  const voices=[{localService:false,lang:'zh-CN',voiceURI:'remote'},{localService:true,lang:'en-US',voiceURI:'en'},{localService:true,lang:'zh-CN',voiceURI:'zh'}];
  assert.deepEqual(localChineseVoices(voices).map(v=>v.voiceURI),['zh']);
  assert.deepEqual(localChineseVoices(voices.slice(0,2)),[]);
  assert.equal(voiceIndex('world:role',3),voiceIndex('world:role',3));
  assert.equal(voiceIndex('anything',0),0);
});
test('speech chunks preserve long prose', () => {
  const text='你好。'+ '世界'.repeat(200)+'！再见';
  assert.equal(speechChunks(text).join(''),text);
  assert.ok(speechChunks(text).every(s=>s.length<=141));
});
