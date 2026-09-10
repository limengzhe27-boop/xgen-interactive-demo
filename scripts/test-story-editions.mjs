import test from 'node:test';
import assert from 'node:assert/strict';
import { studioWorlds } from '../lib/studio-worlds.ts';
import { recordStoryEdition, readStoryEditions, assertEditionHistory, editionLabel } from '../lib/story-editions.ts';
import { appendStory } from '../lib/story-continuation.ts';
import { storyUpgrade } from '../lib/story-upgrade.ts';
import { readCloudSnapshot } from '../lib/cloud-workspace.ts';
const entry=()=>structuredClone(studioWorlds[0]);
test('new saves are numbered, repeated saves do not duplicate, prior snapshots are detached',()=>{
 const source=entry(),first=recordStoryEdition([],source,undefined,100);
 assert.equal(first.history.length,1);assert.equal(first.entry.edition.number,1);
 assert.equal(recordStoryEdition(first.history,source,first.entry,200).history.length,1);
 source.world.characters[0].persona='新设定';
 const second=recordStoryEdition(first.history,source,first.entry,300);
 assert.equal(second.history.length,2);assert.equal(second.entry.edition.number,2);
 assert.notEqual(first.history[0].entry.world.characters[0].persona,'新设定');
 second.entry.world.characters[0].persona='外部修改';assert.equal(second.history[1].entry.world.characters[0].persona,'新设定');
});
test('legacy baseline is retained without invented timestamp and private fields are excluded',()=>{
 const old=entry(),next=entry();next.world.characters[0].persona='修改';next.privateChat='不进入版本记录';
 const saved=recordStoryEdition([],next,old,200);
 assert.equal(saved.history.length,2);assert.equal(saved.history[0].savedAt,undefined);assert.equal(saved.history[1].savedAt,200);
 assert.ok(!JSON.stringify(saved).includes('不进入版本记录'));
});
test('refresh and private cloud backup preserve edition IDs; stale or rewritten histories are rejected',()=>{
 const first=recordStoryEdition([],entry());const next=entry();next.title+='新';const second=recordStoryEdition(first.history,next);
 const restored=readStoryEditions(JSON.parse(JSON.stringify(second.history)),next.id);
 assert.deepEqual(restored,second.history);assert.doesNotThrow(()=>assertEditionHistory(first.history,restored));
 assert.throws(()=>assertEditionHistory(restored,first.history));
 const rewritten=structuredClone(restored);rewritten[0].entry.title='伪改历史';assert.throws(()=>assertEditionHistory(restored,rewritten));
 const data={worldTitle:next.title,worldSeed:next.premise,draftRoles:[],releaseHistory:restored};
 const cloud=readCloudSnapshot({version:1,demo:JSON.stringify({...data,memories:[]}),studio:JSON.stringify({version:1,runs:[],chats:[],draftId:next.id,documents:[{id:next.id,data}]}),images:{}});
 assert.equal(JSON.parse(cloud.studio).documents[0].data.releaseHistory[1].id,restored[1].id);
 assert.throws(()=>readStoryEditions(restored,'other-world'));
});
test('edition metadata does not block compatible story attachment',()=>{
 const first=recordStoryEdition([],entry()),proposal=structuredClone(first.entry.world);
 proposal.tasks.push({...proposal.tasks[0],id:'sequel',prerequisiteTaskIds:[]});
 const second=recordStoryEdition(first.history,{...first.entry,world:appendStory(first.entry.world,proposal)});
 assert.ok(storyUpgrade(first.entry,second.entry));assert.equal(editionLabel(second.entry),'保存版 2');
});
