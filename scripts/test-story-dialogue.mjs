import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleDialogue, dialogueContext } from '../lib/story-dialogue.ts';
test('dialogue retains speaker order and excludes invisible or unknown speakers',()=>{
  const response={dialogue:[{characterId:'secret',text:'hidden',visibleToRoleIds:['other']},{characterId:'a',text:'第一句',visibleToRoleIds:['p']},{characterId:'b',text:'第二句',visibleToRoleIds:['p']},{characterId:'a',text:'第三句',visibleToRoleIds:['p']},{characterId:'unknown',text:'unknown',visibleToRoleIds:['p']}]};
  const lines=visibleDialogue(response,'p',['a','b','secret']);
  assert.deepEqual(lines.map(l=>l.characterId),['a','b','a']);
  const context=dialogueContext(JSON.parse(JSON.stringify(lines)),[{id:'a',name:'甲'},{id:'b',name:'乙'}]);
  assert.equal(context,'甲：第一句\n乙：第二句\n甲：第三句');
  assert.ok(!context.includes('hidden'));
});
