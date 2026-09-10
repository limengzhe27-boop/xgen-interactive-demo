import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { studioWorlds, getRoleOpening } from '../lib/studio-worlds.ts';
import { publicationWorld } from '../lib/publication.ts';
import { playableCharacters, characterRecap, applyCharacterEntry } from '../lib/character-entry.ts';
const base=()=>publicationWorld(studioWorlds[0].world);
test('legacy cast remains playable, fixed identity is respected, NPCs are excluded',()=>{
 const world=base();assert.equal(playableCharacters(world).length,world.characters.length);
 assert.equal(playableCharacters(world,world.characters[0].id).length,1);
 world.characters[0].playable=false;world.characters[1].isDefault=true;
 assert.equal(playableCharacters(world)[0].id,world.characters[1].id);
 assert.ok(!playableCharacters(world).some(c=>c.id===world.characters[0].id));
 assert.equal(publicationWorld(world).characters[0].playable,false);
});
test('recap exposes only role-known facts, entry scene overrides global opening',()=>{
 const world=base(),role=world.characters[0];
 role.entry={storyAnchor:'investigation_started',completedTaskIds:[],worldFacts:['凶器在暗格'],knownFacts:['凶器尚未找到'],scene:'你正在接听报案电话。'};
 const valid=publicationWorld(world);
 assert.deepEqual(characterRecap(valid,role.id),['凶器尚未找到']);
 const narrative=getRoleOpening({...studioWorlds[0],world:valid},role.id);
 assert.ok(narrative.startsWith('你正在接听报案电话。'));
 assert.ok(!narrative.includes('凶器在暗格'));
 assert.deepEqual(characterRecap(valid,world.characters[1].id),[]);
});
test('first entry carries prior world facts and task progress without sharing hidden facts as knowledge',()=>{
 const world=base(),role=world.characters[0];
 const task=world.tasks.find(t=>!t.prerequisiteTaskIds.length);
 role.entry={storyAnchor:'after_event',completedTaskIds:[task.id],worldFacts:['世界事实'],knownFacts:['角色已知'],scene:'当前场景'};
 const initial={turn:0,clock:'当前时刻',knownSecrets:['自己的秘密'],completedTaskIds:[],committedFacts:[]};
 const state=applyCharacterEntry(world,role.id,initial);
 assert.deepEqual(state.completedTaskIds,[task.id]);assert.deepEqual(state.committedFacts,['世界事实']);
 assert.deepEqual(state.knownSecrets,['自己的秘密','角色已知']);assert.deepEqual(initial.completedTaskIds,[]);
 assert.equal(state.turn,0);assert.equal(state.clock,initial.clock);
});
test('broken anchors and unavailable playable casts are rejected before publication',()=>{
 const world=base();world.characters.forEach(c=>c.playable=false);assert.throws(()=>publicationWorld(world));
 const other=base();other.characters[0].entry={storyAnchor:'later',completedTaskIds:['missing'],worldFacts:[],knownFacts:[],scene:'现场'};
 assert.throws(()=>publicationWorld(other));
});
test('video chooser precedes private intro and existing saved clips are retained',()=>{
 const source=readFileSync(new URL('../components/video-explorer.tsx',import.meta.url),'utf8');
 assert.ok(source.includes("roles.length===1?'intro':'roles'"));
 assert.ok(source.includes("roleId==='lin'"));
 assert.ok(source.includes("restored.rounds===0"));
});
