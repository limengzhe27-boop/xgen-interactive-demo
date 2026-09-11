import test from 'node:test';
import assert from 'node:assert/strict';
import {afterClassEntry,AFTER_CLASS_ID} from '../lib/after-class-entry.ts';
import {characterRecap,validCharacterEntries} from '../lib/character-entry.ts';
import {getRoleOpening,studioWorlds} from '../lib/studio-worlds.ts';
const premise='高三下学期，成绩垫底的周野被新来的年轻班主任沈知夏抓住一次考试作弊。沈知夏没有上报，而是以此要挟周野替她做一件私事：帮她拿到一份能保住教职的材料。周野的同班女友林小满发现他频繁出入办公室，误以为他移情别恋。三个人都在用自己的方式争取想要的东西：周野想不被开除也不失去女友，沈知夏想留在学校并摆脱一段旧关系，林小满想弄清真相并守住自己的尊严。';
function fixture(){const entry=structuredClone(studioWorlds[0]);entry.id=AFTER_CLASS_ID;entry.world.premise=premise;
 entry.world.characters=['周野','沈知夏','林小满'].map((name,i)=>({...entry.world.characters[0],id:`draft-role-${i}`,name,isDefault:false,entry:undefined,publicBackground:'同班关系',goal:'弄清眼前的事情'}));
 entry.world.locations=[0,1,2].map(i=>({id:`location-${i}`,name:'旧位置',description:'旧描述',connectedLocationIds:[]}));
 entry.world.openingScene.narrative='旧全知梗概。体验者将从所选角色的身份出发。';return entry;}
test('each role receives only its own recap, with a distinct current scene',()=>{
 const input=fixture(),before=structuredClone(input),result=afterClassEntry(input);
 assert.deepEqual(input,before);assert.ok(validCharacterEntries(result.world));
 const lin=characterRecap(result.world,'draft-role-2').join('');
 assert.match(lin,/不知道原因/);assert.doesNotMatch(lin,/作弊|要挟|保住教职|材料/);
 assert.match(characterRecap(result.world,'draft-role-0').join(''),/作弊/);
 assert.match(characterRecap(result.world,'draft-role-1').join(''),/旧关系/);
 assert.doesNotMatch(getRoleOpening(result,'draft-role-2'),/旧全知梗概|作弊/);
 assert.notEqual(result.world.characters[2].startLocationId,result.world.characters[0].startLocationId);
 assert.deepEqual(result.world.characters.map(r=>r.entry.completedTaskIds),[[],[],[]]);
});
test('repair does not overwrite another world, new edition, new roles or authored entries',()=>{
 for(const modify of [e=>e.id='other',e=>e.world.premise+='更新',e=>e.world.characters.push({...e.world.characters[0],id:'new'}),e=>e.world.characters[0].entry={storyAnchor:'custom'}]){
 const input=fixture();modify(input);assert.equal(afterClassEntry(input),input);
 }
 const repaired=afterClassEntry(fixture());assert.equal(afterClassEntry(repaired),repaired);
});
