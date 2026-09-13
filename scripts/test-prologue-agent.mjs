import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPrologueAgentInput, readPrologueAgentReply, prologueAgentInstructions } from '../lib/prologue-agent.ts';
const plan=JSON.parse(readFileSync(new URL('../docs/prologue-first-person.example.json',import.meta.url),'utf8'));
const direction=JSON.parse(readFileSync(new URL('../docs/prologue-first-person.direction.json',import.meta.url),'utf8'));
const brief=()=>({title:'固定身份修仙',publicStory:'未签契约的修士来到门前。',openingState:'人仍站门外，断剑未毁。',constraints:'不能接牌或跨门。',characters:plan.characters,perspective:'first-person',povCharacterId:plan.story.povCharacterId});
void test('production brief strips private world and memory data',()=>{
 const input=readPrologueAgentInput({...brief(),memories:['private'],world:{secrets:['private']},characters:plan.characters.map(c=>({...c,secrets:['private']}))});
 assert.ok(input);assert.ok(!JSON.stringify(input).includes('private'));
 assert.equal(readPrologueAgentInput({...brief(),povCharacterId:'unknown'}),null);
 assert.equal(readPrologueAgentInput({...brief(),characters:[null]}),null);
});
void test('native planning is a checked plan, not a generated video',()=>{
 const input=readPrologueAgentInput(brief()),p=structuredClone(plan);p.audio.mode='native';
 const result=readPrologueAgentReply({plan:p,direction},input);
 assert.ok(result);assert.equal(result.videoGenerated,false);assert.equal(result.autoPublishAllowed,false);
 assert.equal(result.compiled.postDubbingAllowed,false);
 assert.match(result.compiled.shots[0].nativeTextToVideoPrompt,/0—/);
 for(const mutate of [v=>v.audio.mode='post',v=>v.characters[0].appearance='另一个人',v=>v.story.perspective='external']){
  const bad=structuredClone(p);mutate(bad);assert.equal(readPrologueAgentReply({plan:bad,direction},input),null);
 }
});
void test('missing dramatic material requests revision',()=>{
 assert.deepEqual(readPrologueAgentReply({needsRevision:true,reason:'缺少已确认冲突'},readPrologueAgentInput(brief())),{needsRevision:true,reason:'缺少已确认冲突'});
 assert.match(prologueAgentInstructions,/原生音画同步/);assert.match(prologueAgentInstructions,/不能自动发布/);
});
void test('spider revision sends all context and choice cues to native generation',()=>{
 const p=JSON.parse(readFileSync(new URL('../docs/spider-v2-prologue.plan.json',import.meta.url),'utf8'));
 const d=JSON.parse(readFileSync(new URL('../docs/spider-v2-prologue.direction.json',import.meta.url),'utf8'));
 const input=readPrologueAgentInput({title:p.title,publicStory:p.story.throughline,openingState:p.shots[0].startState,constraints:'不替玩家选择',characters:p.characters,perspective:p.story.perspective,povCharacterId:p.story.povCharacterId});
 const result=readPrologueAgentReply({plan:p,direction:d},input);
 assert.ok(result);
 for(const cue of p.audio.cues)assert.ok(result.compiled.shots[0].nativeTextToVideoPrompt.includes(cue.text));
 assert.equal(result.autoPublishAllowed,false);
});
