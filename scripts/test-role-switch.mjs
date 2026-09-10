import test from 'node:test';
import assert from 'node:assert/strict';
import { switchRole } from '../lib/role-switch.ts';
import { createInitialWorldState, commitTurn } from '../lib/world-state.ts';
const world={characters:[{id:'a',name:'甲',startLocationId:'hall',privateKnowledge:['甲的秘密'],secrets:[]},{id:'b',name:'乙',startLocationId:'hall',privateKnowledge:['乙的秘密'],secrets:[]}],locations:[{id:'hall',name:'大厅'},{id:'yard',name:'庭院'}],goals:[]};
const initial=()=>({...createInitialWorldState('draft','a','甲的秘密','大厅'),turn:4,clock:'23:55',inventory:['甲的钥匙'],clues:['甲的线索'],completedTaskIds:['done'],committedFacts:['门已打开'],characterStates:{a:{locationId:'hall'},b:{locationId:'yard'}},eventLedger:[{id:'old',turn:4,action:'甲问话',result:'甲听到的秘密',location:'大厅',status:'committed'}]});
test('switch preserves time and shared progress, uses current NPC location',()=>{
 const s=initial(),next=switchRole(world,s,'a','b').state;
 assert.equal(next.turn,4);assert.equal(next.clock,'23:55');assert.equal(next.location,'庭院');
 assert.deepEqual(next.completedTaskIds,s.completedTaskIds);assert.deepEqual(next.committedFacts,s.committedFacts);
 assert.deepEqual(next.inventory,[]);assert.deepEqual(next.clues,[]);assert.deepEqual(next.eventLedger,[]);assert.deepEqual(next.knownSecrets,['乙的秘密']);
 assert.equal(s.rolePerspectives,undefined);
});
test('returning after another turn and refresh restores only own possessions and memories',()=>{
 let s=switchRole(world,initial(),'a','b').state;
 s=commitTurn(s,{action:'乙捡信',result:'乙看到了信',clue:'乙的线索',nextLocation:'庭院',relationshipDelta:0,addInventory:['乙的信']});
 s=JSON.parse(JSON.stringify(s));
 const back=switchRole(world,s,'b','a').state;
 assert.equal(back.turn,5);assert.deepEqual(back.inventory,['甲的钥匙']);assert.equal(back.eventLedger[0].action,'甲问话');
 const again=switchRole(world,back,'a','b').state;
 assert.deepEqual(again.inventory,['乙的信']);assert.equal(again.eventLedger.at(-1).action,'乙捡信');
});
test('switch never jumps to a late entry or grants future knowledge',()=>{
 const w=structuredClone(world);w.characters[1].entry={storyAnchor:'later',completedTaskIds:['future'],worldFacts:['将来事件'],knownFacts:['未来情报'],scene:'未来现场'};
 const changed=switchRole(w,initial(),'a','b');
 assert.deepEqual(changed.state.knownSecrets,[]);assert.deepEqual(changed.state.completedTaskIds,['done']);assert.ok(!changed.narrative.includes('未来'));
});
test('fixed roles, NPCs and explicitly dead roles cannot be selected',()=>{
 assert.throws(()=>switchRole(world,initial(),'a','b','a'));
 const w=structuredClone(world);w.characters[1].playable=false;assert.throws(()=>switchRole(w,initial(),'a','b'));
 const s=initial();s.characterStates.b.status='死亡';assert.throws(()=>switchRole(world,s,'a','b'));
});
