import test from 'node:test';
import assert from 'node:assert/strict';
import { readCreatorResponse } from '../lib/creator-response.ts';
import { isCreatorAgentResponse } from '../lib/ai-validation.ts';

const input = { characters: [], currentDraft: { title: '原作', premise: '原来的故事', surpriseLevel: 2,
  brief: { coreGoal: '', successCondition: '', failureCondition: '', complexityLevel: 2, tasks: [], difficulties: [], scheduledEvents: [] } } };
test('discussion does not require a complete proposal', () => {
  const r = readCreatorResponse({ reply: '你更想从谁开始？', proposal: null }, input);
  assert.equal(r.discussionOnly, true);
  assert.ok(isCreatorAgentResponse(r));
  assert.deepEqual(r.proposal, input.currentDraft);
});
test('partial proposal preserves omitted draft fields', () => {
  const r = readCreatorResponse({ reply: '可以换个开场', proposal: { premise: '新开场' } }, input);
  assert.ok(isCreatorAgentResponse(r));
  assert.equal(r.discussionOnly, false);
  assert.equal(r.proposal.title, '原作');
  assert.equal(r.proposal.premise, '新开场');
  assert.deepEqual(r.proposal.brief, input.currentDraft.brief);
});
test('malformed graph preserves real reply but never becomes an adoptable proposal', () => {
  const r = readCreatorResponse({ reply: '我建议从城门开始', proposal: { brief: { storyGraph: { nodes: [] } } } }, input);
  assert.equal(r.reply, '我建议从城门开始');
  assert.equal(r.discussionOnly, true);
  assert.ok(r.proposalIssue);
  assert.deepEqual(r.proposal, input.currentDraft);
});
test('wrong field type is not silently coerced or adopted', () => {
  assert.equal(readCreatorResponse({ reply: '建议', proposal: { title: 123 } }, input).discussionOnly, true);
  assert.equal(readCreatorResponse({ proposal: {} }, input), null);
});
test('valid single-node graph and role proposal can be displayed immediately', () => {
  const r = readCreatorResponse({ reply: '先从这里进入', proposal: {
    characters: [{ name:'旅人', identity:'旅人', persona:'好奇', relationship:'', appearance:'', goal:'找路' }],
    brief: { storyGraph: { startNodeId:'opening', nodes:[{id:'opening',title:'城门',location:'门口',scene:'守卫拦住去路',worldFacts:[],nextNodeIds:[]}], entries:[{roleId:'draft-role-0',nodeId:'opening',defaultPath:['opening'],knownFacts:[],beliefs:[],scene:'你停在城门前'}] } }
  } }, input);
  assert.ok(isCreatorAgentResponse(r));
  assert.equal(r.discussionOnly, false);
  assert.equal(r.proposal.brief.storyGraph.nodes.length, 1);
});
test('continued discussion preserves pending user-edited suggestions', () => {
  const pendingProposal = { ...input.currentDraft, title: '手改标题', premise: '尚未采纳的开场' };
  const r = readCreatorResponse({ reply: '改了目标', proposal: { brief: { coreGoal: '新的动机' } } }, { ...input, pendingProposal });
  assert.equal(r.proposal.title, '手改标题');
  assert.equal(r.proposal.premise, '尚未采纳的开场');
  assert.equal(r.proposal.brief.coreGoal, '新的动机');
});
