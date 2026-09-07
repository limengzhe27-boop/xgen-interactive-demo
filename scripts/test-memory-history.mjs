import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreMemoryDetails, confirmMemoryDetail, editMemoryDetail, removeMemoryDetail } from '../lib/memory-history.ts';
test('legacy history never fabricates source or confirmation time',()=>{
  assert.deepEqual(restoreMemoryDetails(null,['旧记忆']),{'旧记忆':{source:'legacy',revisions:[]}});
  assert.deepEqual(restoreMemoryDetails({'旧记忆':{source:'confirmed-suggestion',confirmedAt:-1,revisions:[{previous:'x',changedAt:NaN}]}},['旧记忆']),{'旧记忆':{source:'legacy',revisions:[]}});
});
test('confirmation, revisions, persistence and deletion retain only current account entries',()=>{
  let d=confirmMemoryDetail({},'A',1000);
  d=editMemoryDetail(d,'A','B',2000);
  assert.equal(d.B.confirmedAt,1000); assert.equal(d.B.editedAt,2000);
  assert.deepEqual(d.B.revisions,[{previous:'A',changedAt:2000}]);
  assert.deepEqual(restoreMemoryDetails(JSON.parse(JSON.stringify(d)),['B']),d);
  assert.deepEqual(restoreMemoryDetails(d,[]),{});
  assert.deepEqual(removeMemoryDetail(d,'B'),{});
  for(let i=0;i<8;i++)d=editMemoryDetail(d,i?String(i-1):'B',String(i),3000+i);
  assert.equal(d['7'].revisions.length,5);
});
