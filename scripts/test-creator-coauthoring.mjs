import test from 'node:test';
import assert from 'node:assert/strict';
import { creatorGraphGuidance, CREATOR_COAUTHORING_GUIDANCE } from '../lib/creator-guidance.ts';
import { readCreatorResponse } from '../lib/creator-response.ts';

test('all routing branches retain discussion-before-completion policy', () => {
  for (const input of [
    { userMessage: '师徒四人各怀鬼胎' },
    { userMessage: '开场怎么想比较好？' },
    { userMessage: '沙僧为什么隐藏秘密？', currentDraft: { brief: { storyGraph: {} } } },
    { userMessage: '悟空发现秘密可能怎么办？', pendingProposal: { brief: { storyGraph: {} } } },
    { userMessage: '你来构思并添加下一个事件' },
  ]) {
    const guidance = creatorGraphGuidance(input);
    assert.ok(guidance.startsWith(CREATOR_COAUTHORING_GUIDANCE));
    assert.match(guidance, /上一轮委托不代表以后每轮都授权代写/);
    assert.match(guidance, /未涉及的角色与字段逐字保留/);
  }
});

const role = name => ({ name, identity: '', persona: '', relationship: '', appearance: '', goal: '' });
const input = { userMessage: '沙僧想保护家人', characters: [], currentDraft: {
  title: '取经路上', premise: '沿用取经背景', surpriseLevel: 2,
  characters: [role('唐僧'),role('孙悟空'),role('猪八戒'),role('沙僧')],
  brief: { coreGoal:'',preferredDirection:'',alternativeDirection:'',complexityLevel:2,tasks:[],difficulties:[],scheduledEvents:[] },
} };

test('discussion-only is successful and does not fabricate settings', () => {
  const result = readCreatorResponse({reply:'你想保留哪些原有背景？',proposal:null},input);
  assert.equal(result.discussionOnly,true);
  assert.deepEqual(result.proposal,input.currentDraft);
});

test('partial character discussion accepts blank unknowns and leaves others untouched', () => {
  const characters=structuredClone(input.currentDraft.characters);
  characters[3].goal='保护家人';
  const result=readCreatorResponse({reply:'先记下沙僧想保护家人。',proposal:{characters}},input);
  assert.equal(result.discussionOnly,false);
  assert.deepEqual(result.proposal.characters.slice(0,3),input.currentDraft.characters.slice(0,3));
  assert.equal(result.proposal.characters[3].persona,'');
  assert.equal(result.proposal.brief.storyGraph,undefined);
  assert.deepEqual(input.currentDraft.characters[3],role('沙僧'));
});

test('explicit append still executes without repeated questions', () => {
  const result=creatorGraphGuidance({userMessage:'你来构思并添加下一个事件'});
  assert.match(result,/必须在 proposal.brief.storyGraph 中完整返回/);
  assert.match(result,/nextQuestions 返回空数组/);
});
