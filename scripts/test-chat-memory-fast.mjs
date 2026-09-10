import test from 'node:test';
import assert from 'node:assert/strict';
import { exactChatRecall, chatHistoryIndices } from '../lib/chat-memory.ts';
const input = { interaction:{mode:'character-chat',targetCharacterId:'poet'},userAction:'我给你发送的第一句话是什么？',selectedRoleId:'visitor',
  conversationMemory:{firstUserMessage:'你谁',greeting:'在下李白',totalTurns:20},state:{completedTaskIds:[]},currentScene:{id:'chat-20'} };
test('exact user recall quotes the user, not the greeting; never advances plot',()=>{
  const result=exactChatRecall(input);
  assert.equal(result.dialogue[0].text,'你给我发的第一句话是：“你谁”');
  assert.deepEqual(result.statePatch,{committedFacts:[]});
  assert.equal(result.ending.reached,false);
  assert.deepEqual(result.dialogue[0].visibleToRoleIds,['visitor']);
});
test('does not intercept poems, compound requests, ambiguous recall or world exploration',()=>{
  for(const userAction of ['此情此景，写一首诗','你的第一句话是什么','我的第一句话是什么，然后写首诗','他问我的第一句话是什么','我第一句话说要救人，现在救人'])
    assert.equal(exactChatRecall({...input,userAction}),null);
  assert.equal(exactChatRecall({...input,interaction:undefined}),null);
  assert.equal(exactChatRecall({...input,conversationMemory:undefined}),null);
});
test('missing earlier message cannot fabricate an answer',()=>{
  assert.match(exactChatRecall({...input,conversationMemory:{...input.conversationMemory,firstUserMessage:null}}).dialogue[0].text,/没有更早/);
});
test('retrieves relevant older words and keeps the last twelve without unbounded growth',()=>{
  const actions=['我的名字是林星，我想去洛阳',...Array.from({length:60},(_,i)=>`普通闲聊${i}`)];
  const indices=chatHistoryIndices(actions,'我之前说我想去洛阳还记得吗');
  assert.ok(indices.includes(0));
  assert.deepEqual(indices.slice(-12),Array.from({length:12},(_,i)=>actions.length-12+i));
  assert.ok(indices.length<=15);
  assert.equal(new Set(indices).size,indices.length);
});
