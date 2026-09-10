import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { studioWorlds } from '../lib/studio-worlds.ts';
import { appendStory } from '../lib/story-continuation.ts';
import { publicationWorld } from '../lib/publication.ts';
import { storyUpgrade, applyStoryUpgrade } from '../lib/story-upgrade.ts';
import { createInitialWorldState } from '../lib/world-state.ts';
const base=()=>({...studioWorlds[0],world:publicationWorld(studioWorlds[0].world)});
const extend=entry=>{
 const proposal=structuredClone(entry.world);
 proposal.tasks.push({...proposal.tasks[0],kind:'main',id:'new-task',prerequisiteTaskIds:[proposal.tasks.at(-1).id]});
 proposal.characters.push({...proposal.characters[0],id:'new-person',name:'新人物',privateKnowledge:['新人物的秘密']});
 return {...entry,world:appendStory(entry.world,proposal)};
};
test('saved append-only edition is detected, equal/older/rewritten/unrelated editions are not',()=>{
 const old=base(),latest=extend(old);
 assert.equal(storyUpgrade(old,latest).addedTasks,1);
 assert.equal(storyUpgrade(old,old),null);assert.equal(storyUpgrade(latest,old),null);
 const rewritten=structuredClone(latest);rewritten.world.characters[0].persona='改写旧人物';assert.equal(storyUpgrade(old,rewritten),null);
 assert.equal(storyUpgrade(old,{...latest,id:'another'}),null);
});
test('attach preserves player facts, possessions, role memories, time and previous ending history',()=>{
 const old=base(),latest=extend(old),state=createInitialWorldState('draft',old.world.characters[0].id,'旧秘密','大厅');
 state.turn=9;state.clock='12:10';state.completedTaskIds=old.world.tasks.map(t=>t.id);state.committedFacts=['玩家自己走出的事实'];
 const success=old.world.endingConditions.find(e=>(e.outcome??'success')==='success');
 state.reachedEndingIds=[success.id];state.rolePerspectives={a:{inventory:['甲的物品'],clues:[],knownSecrets:['甲的秘密'],relationshipTrust:42,eventLedger:[]}};
 const before=structuredClone(state),next=applyStoryUpgrade(old,latest,state);
 assert.deepEqual(state,before);
 for(const key of ['turn','clock','location','inventory','knownSecrets','completedTaskIds','failedTaskIds','committedFacts','rolePerspectives','eventLedger'])assert.deepEqual(next[key],before[key]);
 assert.ok(next.archivedEndingIds.includes(success.id));assert.ok(!next.reachedEndingIds.includes(success.id));
 assert.equal(next.characterStates['new-person'].status,'尚未相遇');assert.ok(!next.knownSecrets.includes('新人物的秘密'));
 assert.equal(storyUpgrade(latest,JSON.parse(JSON.stringify(latest))),null);
});
test('video save holds its world edition and switching does not demand an absent old frame',()=>{
 const source=readFileSync(new URL('../components/video-explorer.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('worldSnapshot:input.worldSnapshot??entry'));
 assert.ok(source.includes('s.clip&&(s.rounds>0||entry.fixedRoleId)'));
 assert.ok(source.includes('sessionStorage.setItem(`${storageKey}:before-update`'));
 assert.ok(source.includes('当前剧情已体验完'));
});
