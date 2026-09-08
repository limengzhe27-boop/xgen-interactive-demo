import test from 'node:test';
import assert from 'node:assert/strict';
import {speechSegments} from '../lib/speech-sequence.ts';
import {SPEECH_MAX_CHARS} from '../lib/media-policy.ts';
test('narrative and all three speakers are read in display order',()=>{
 const lines=[{characterId:'a',text:'第一句。还有第二句。'},{characterId:'b',text:'老板回答。'},{characterId:'c',text:'看客插话。'}];
 const result=speechSegments('旁白。',lines);
 assert.deepEqual(result.map(s=>s.text),['旁白。',...lines.map(l=>l.text)]);
 assert.deepEqual(result.map(s=>s.speaker),['narrator','a','b','c']);
});
test('long passages are lossless and bounded, never cut to the first sentence',()=>{
 const text=('很长的故事😀。').repeat(600);
 const result=speechSegments(text,[]);
 assert.equal(result.map(s=>s.text).join(''),text);
 assert.ok(result.every(s=>s.text.length<=SPEECH_MAX_CHARS));
 assert.deepEqual(speechSegments('',[]),[]);
 assert.deepEqual(speechSegments('',[],'旧存档对白。'),[{text:'旧存档对白。',speaker:'narrator'}]);
});
