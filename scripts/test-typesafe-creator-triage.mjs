import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCreatorTriage, classifyCreatorTurn } from '../lib/typesafe-creator-triage.ts';
import { selectCreatorSkills } from '../lib/creator-skill-routing.ts';
const choice = (value,confidence=.9) => ({type:'choice',choice:value,confidence});
const payload = (extra={}) => ({answers:{focus:choice('open_discussion'),shouldClarify:{type:'noul',noul:.95},...extra}});
test('official noul field is read, not invented probability/yes fields',()=>{
  assert.equal(parseCreatorTriage(payload()).shouldClarify,true);
  assert.equal(parseCreatorTriage(payload({shouldClarify:{type:'noul',probability:.99}})).shouldClarify,false);
});
test('invalid and nonfinite confidence is rejected',()=>{
  for(const confidence of [NaN,Infinity,-1,2,.2]) assert.equal(parseCreatorTriage(payload({focus:choice('open_discussion',confidence)})),null);
});
test('uncertain or unknown method is omitted independently',()=>{
  const r=parseCreatorTriage(payload({horizontal:choice('H4'),vertical:choice('V1',.3)}));
  assert.equal(r.horizontal,'H4');assert.equal(r.vertical,undefined);
  assert.equal(parseCreatorTriage(payload({horizontal:choice('unknown')})).horizontal,undefined);
});
test('semantic continuation and negation override keyword matching without granting execution',()=>{
  const triage=parseCreatorTriage(payload({horizontal:choice('H2'),vertical:choice('none')}));
  const r=selectCreatorSkills({userMessage:'不要开场和调查，只修改他的性格'},triage);
  assert.equal(r.horizontal,'H2');assert.deepEqual(r.vertical,[]);
  const next=selectCreatorSkills({userMessage:'就按这个继续'},parseCreatorTriage(payload({horizontal:choice('H5'),vertical:choice('V6')})));
  assert.equal(next.horizontal,'H5');assert.deepEqual(next.vertical,['V6']);
  assert.equal('authorized' in next,false);
});
test('single bounded request retains privacy minimization and official result parsing',async()=>{
  const oldKey=process.env.TYPESAFE_API_KEY, oldFetch=globalThis.fetch;
  let calls=0;
  try {
    process.env.TYPESAFE_API_KEY='unit-test-not-a-real-key';
    globalThis.fetch=async(url,options)=>{
      calls++;const body=JSON.parse(options.body);
      assert.equal(url,'https://api.typesafe.ai/v1/systemone');
      assert.equal(Object.keys(body.questions).length,4);
      assert.ok(!JSON.stringify(body.state).includes('PRIVATE_SENTINEL'));
      assert.equal(body.state.recentConversation.length,3);
      assert.equal(body.state.userMessage.length,1200);
      assert.ok(options.signal);
      return {ok:true,json:async()=>payload({horizontal:choice('H4'),vertical:choice('none')})};
    };
    const r=await classifyCreatorTurn({userMessage:'a'.repeat(2000),conversation:Array(5).fill({role:'creator',content:'只讨论入口'}),characters:[{name:'旅人',identity:'客人',goal:'PRIVATE_SENTINEL'}],companionContext:'PRIVATE_SENTINEL',currentDraft:{premise:'PRIVATE_SENTINEL'},pendingProposal:'PRIVATE_SENTINEL'});
    assert.equal(r.horizontal,'H4');assert.equal(r.shouldClarify,true);assert.equal(calls,1);
    globalThis.fetch=async()=>{throw new Error('timeout')};
    assert.equal(await classifyCreatorTurn({userMessage:'继续'}),null);
    delete process.env.TYPESAFE_API_KEY;
    globalThis.fetch=async()=>{throw new Error('must not call')};
    assert.equal(await classifyCreatorTurn({userMessage:'继续'}),null);
  } finally {globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.TYPESAFE_API_KEY;else process.env.TYPESAFE_API_KEY=oldKey;}
});
