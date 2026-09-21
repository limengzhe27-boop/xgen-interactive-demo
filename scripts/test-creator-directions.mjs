import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateCreatorDirections } from '../lib/creator-directions.ts';
import { readCreatorResponse } from '../lib/creator-response.ts';
import { restoreCreatorSession } from '../lib/creator-session.ts';
import { applyCreatorChange } from '../lib/creator-changes.ts';
import { creatorSkillGuidance, selectCreatorSkills } from '../lib/creator-skill-routing.ts';

const brief = {coreGoal:'保护同伴',successCondition:'合作',failureCondition:'各自离开',complexityLevel:2,tasks:[],difficulties:[],scheduledEvents:[]};
const draft = {title:'测试',premise:'虚构',surpriseLevel:2,brief};
test('legacy directions migrate without mutating source or task completion criteria', () => {
  const old = {...brief,tasks:[{successCondition:'拿到钥匙'}]};
  const result = migrateCreatorDirections(old);
  assert.equal(result.preferredDirection,'合作');
  assert.equal(result.alternativeDirection,'各自离开');
  assert.ok(!('successCondition' in result));
  assert.equal(result.tasks[0].successCondition,'拿到钥匙');
  assert.equal(old.successCondition,'合作');
  assert.deepEqual(migrateCreatorDirections({}),{});
  assert.equal(migrateCreatorDirections({...brief,preferredDirection:''}).preferredDirection,'');
});
test('new model proposals cannot revive retired direction fields; legacy notes stay intact', () => {
  const input = {currentDraft:draft,characters:[],userMessage:'改一下走向'};
  const r=readCreatorResponse({reply:'建议',proposal:{brief:{failureCondition:'暂时停战'}}},input);
  assert.equal(r.discussionOnly,false);
  assert.equal(r.proposal.brief.preferredDirection,'合作');
  assert.equal(r.proposal.brief.alternativeDirection,'各自离开');
  const cleared=readCreatorResponse({reply:'留白',proposal:{brief:{preferredDirection:''}}},{...input,pendingProposal:r.proposal});
  assert.equal(cleared.proposal.brief.preferredDirection,'合作');
  assert.equal(cleared.proposal.brief.alternativeDirection,'各自离开');
});
test('saved pending changes migrate and still support guarded adoption and undo', () => {
  const session=restoreCreatorSession({proposal:draft,input:'继续',changes:[{key:'successCondition',label:'预期走向',before:'旧走向',after:'合作'}]});
  assert.equal(session.proposal.brief.preferredDirection,'合作');
  const change=session.changes[0];
  assert.equal(change.key,'preferredDirection');
  const applied=applyCreatorChange({preferredDirection:'旧走向'},change);
  assert.equal(applied.preferredDirection,'合作');
  assert.equal(applyCreatorChange(applied,change,true).preferredDirection,'旧走向');
  assert.equal(applyCreatorChange({preferredDirection:'手改'},change),null);
});
test('guidance distinguishes story direction from tasks and preserves author scope', () => {
  const input={currentDraft:draft,characters:[],userMessage:'讨论预期走向'};
  assert.equal(selectCreatorSkills(input).horizontal,'H5');
  const prompt=creatorSkillGuidance(input);
  for(const text of ['适时补缺','字段为空不等于没有讨论','closingCondition','不要求每部故事配任务','局部改字不附加问卷']) assert.ok(prompt.includes(text));
});
