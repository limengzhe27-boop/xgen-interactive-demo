import test from 'node:test';
import assert from 'node:assert/strict';
import { readCreatorResponse, parseCreatorContent } from '../lib/creator-response.ts';
import { isCreatorAgentResponse } from '../lib/ai-validation.ts';
import { normalizeCreatorGraphIds } from '../lib/creator-normalization.ts';
import { creatorStoryIssues } from '../lib/creator-story-graph.ts';
import { creatorGraphGuidance } from '../lib/creator-guidance.ts';

const input = { characters: [], currentDraft: { title: '原作', premise: '原来的故事', surpriseLevel: 2,
  brief: { coreGoal: '', preferredDirection: '', alternativeDirection: '', complexityLevel: 2, tasks: [], difficulties: [], scheduledEvents: [] } } };

test('unambiguous local character subset retains untouched cast and omitted fields',()=>{
  const characters=['唐僧','悟空','八戒','沙僧'].map((name,i)=>({name,identity:'身份'+i,persona:'性格'+i,relationship:'关系'+i,appearance:'外貌'+i,goal:'目标'+i}));
  const request={...input,userMessage:'只改沙僧的性格',characters};
  const response=readCreatorResponse({reply:'建议已整理',proposal:{characters:[{name:'沙僧',persona:'坚韧隐忍'}]}},request);
  assert.equal(response.discussionOnly,false);
  assert.equal(response.proposal.characters.length,4);
  assert.deepEqual(response.proposal.characters.slice(0,3),characters.slice(0,3));
  assert.deepEqual(response.proposal.characters[3],{...characters[3],persona:'坚韧隐忍'});
  assert.equal(characters[3].persona,'性格3');
});
test('ambiguous short roster and positional graph changes cannot delete cast',()=>{
  const characters=['甲','乙'].map(name=>({name,identity:'旅人',persona:'谨慎',relationship:'',appearance:''}));
  for(const proposal of [{characters:[]},{characters:[{name:'新人'}]},{characters:[{name:'乙'}],brief:{tasks:[]}}]) {
    const response=readCreatorResponse({reply:'建议',proposal},{...input,characters});
    assert.equal(response.discussionOnly,true);assert.ok(response.proposalIssue.includes('未删除'));
  }
});
test('creator content accepts fenced and prose-wrapped JSON without changing proposal', () => {
  const data = {reply:'从谁开始？',proposal:{title:'山中'}};
  for (const s of [JSON.stringify(data), '```json\n'+JSON.stringify(data)+'\n```', '建议如下：\n'+JSON.stringify(data)]) {
    assert.deepEqual(parseCreatorContent(s), data);
  }
});
test('truncated or malformed proposal keeps only a complete real reply', () => {
  const s = '{"reply":"他说：\\"等一下\\"\\n你想怎么办？","proposal":{"characters":[';
  for (const truncated of [false,true]) {
    const r = readCreatorResponse(parseCreatorContent(s,truncated),input);
    assert.equal(r.reply,'他说："等一下"\n你想怎么办？');
    assert.equal(r.discussionOnly,true);
    assert.ok(r.proposalIssue);
    assert.deepEqual(r.proposal,input.currentDraft);
  }
});
test('plain conversation is readable; broken JSON and incomplete reply never become content', () => {
  assert.equal(parseCreatorContent('我们可以先聊聊他们为什么不愿意继续取经。').reply,'我们可以先聊聊他们为什么不愿意继续取经。');
  assert.throws(()=>parseCreatorContent('{"reply":"未说完',true),/model_output_truncated/);
  assert.throws(()=>parseCreatorContent('{"proposal":broken}'),/invalid_model_output/);
});
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

const role = {name:'旅人',identity:'旅人',persona:'谨慎',relationship:'',appearance:'',goal:'找路'};
const graph = {startNodeId:'opening',nodes:[{id:'opening',title:'城门',location:'门口',scene:'守卫拦路',worldFacts:[],nextNodeIds:[]}],
  entries:[{roleId:'draft-role-0',nodeId:'opening',defaultPath:['opening'],knownFacts:[],beliefs:[],scene:'你停在城门'}]};
test('invalid new graph does not discard valid roles, title or premise', () => {
  const r=readCreatorResponse({reply:'先把人物给你',proposal:{title:'旅人',premise:'城门前',characters:[role],brief:{storyGraph:{nodes:[]}}}},input);
  assert.equal(r.discussionOnly,false);
  assert.equal(r.proposal.title,'旅人');
  assert.deepEqual(r.proposal.characters,[role]);
  assert.equal(r.proposal.brief.storyGraph,undefined);
  assert.ok(r.proposalIssue);
  assert.ok(isCreatorAgentResponse(r));
});
test('invalid graph update preserves the pending edited graph without mutating input', () => {
  const pendingProposal={...input.currentDraft,characters:[role],brief:{...input.currentDraft.brief,storyGraph:graph}};
  const before=JSON.stringify(pendingProposal);
  const r=readCreatorResponse({reply:'改了名称',proposal:{title:'新名',brief:{storyGraph:{nodes:[]}}}},{...input,pendingProposal});
  assert.equal(r.discussionOnly,false);
  assert.deepEqual(r.proposal.brief.storyGraph,graph);
  assert.equal(JSON.stringify(pendingProposal),before);
});
test('bad graph plus changed roster cannot transfer old role knowledge to a different person', () => {
  const pendingProposal={...input.currentDraft,characters:[role],brief:{...input.currentDraft.brief,storyGraph:graph}};
  const r=readCreatorResponse({reply:'换一个角色',proposal:{characters:[{...role,name:'守卫'}],brief:{storyGraph:{nodes:[]}}}},{...input,pendingProposal});
  assert.equal(r.discussionOnly,true);
  assert.match(r.proposalIssue,/人物名单/);
});
test('Chinese node IDs remap every edge, start, entry and default path without collisions', () => {
  const g={startNodeId:'城门',nodes:[{...graph.nodes[0],id:'城门',nextNodeIds:['node-1']},{...graph.nodes[0],id:'node-1',nextNodeIds:[]}],
    entries:[{...graph.entries[0],nodeId:'node-1',defaultPath:['城门','node-1']}]};
  const before=JSON.stringify(g), n=normalizeCreatorGraphIds(g);
  assert.equal(n.startNodeId,'node-2');
  assert.deepEqual(n.entries[0].defaultPath,['node-2','node-1']);
  assert.deepEqual(creatorStoryIssues(n,['draft-role-0']),[]);
  assert.equal(JSON.stringify(g),before);
});
test('normalization never repairs dangling edges or duplicate IDs by inventing associations', () => {
  const g={...graph,startNodeId:'城门',nodes:[{...graph.nodes[0],id:'城门',nextNodeIds:['node-1']}],entries:[]};
  const n=normalizeCreatorGraphIds(g);
  assert.equal(n.startNodeId,'node-2');
  assert.ok(creatorStoryIssues(n).length);
  assert.ok(creatorStoryIssues(normalizeCreatorGraphIds({...g,nodes:[g.nodes[0],g.nodes[0]]})).length);
});
test('explicit aliases and numeric strings normalize without overriding canonical fields', () => {
  const {persona,...rest}=role;
  const r=readCreatorResponse({reply:'人物',proposal:{surpriseLevel:'3',characters:[{...rest,personality:'好奇',cardHook:'等一下\n陪我走一段'}],brief:{complexityLevel:'2',tasks:[{id:'t1',title:'找路',description:'找路',kind:'支线',assignedRoleIds:['draft-role-0'],prerequisiteTaskIds:[],successCondition:'找到道路',difficulty:'迷雾'}]}}},input);
  assert.equal(r.discussionOnly,false);
  assert.equal(r.proposal.characters[0].persona,'好奇');
  assert.equal(r.proposal.characters[0].cardHook,'等一下 陪我走一段');
  assert.equal(r.proposal.brief.tasks[0].kind,'side');
  assert.equal(r.proposal.surpriseLevel,3);
  const canonical=readCreatorResponse({reply:'人物',proposal:{characters:[{...role,personality:'另一个值'}]}},input);
  assert.equal(canonical.proposal.characters[0].persona,'谨慎');
});
test('unknown enum or number remains rejected rather than silently assigned meaning', () => {
  assert.equal(readCreatorResponse({reply:'建议',proposal:{brief:{complexityLevel:'困难'}}},input).discussionOnly,true);
  const r=readCreatorResponse({reply:'建议',proposal:{brief:{tasks:[{id:'t1',title:'任务',description:'任务',kind:'核心',prerequisiteTaskIds:[],successCondition:'条件',difficulty:''}]}}},input);
  assert.equal(r.discussionOnly,true);
});
test('cold start uses small opening contract; requested or existing graph uses full guidance', () => {
  const light=creatorGraphGuidance({userMessage:'我想写师徒各怀鬼胎'});
  assert.ok(!light.includes('最多16个'));
  assert.ok(light.includes('不必等用户点击按钮'));
  assert.ok(creatorGraphGuidance({userMessage:'帮我整理画布'}).includes('最多16个'));
  assert.ok(creatorGraphGuidance({userMessage:'继续',currentDraft:{...input.currentDraft,brief:{...input.currentDraft.brief,storyGraph:graph}}}).includes('最多16个'));
  const charAdd = creatorGraphGuidance({userMessage:'继续补充悟空悟净',currentDraft:{...input.currentDraft,brief:{...input.currentDraft.brief,storyGraph:graph}}});
  assert.ok(charAdd.includes('最多16个'));
  assert.ok(charAdd.includes('只有形成明确修改时才在 proposal.characters'));
  assert.ok(charAdd.includes('省略 brief.storyGraph'));
  const composite = creatorGraphGuidance({userMessage:'加悟净并在流沙河阻拦唐僧',currentDraft:{...input.currentDraft,brief:{...input.currentDraft.brief,storyGraph:graph}}});
  assert.ok(composite.includes('本轮提及人物与事件，不等于要求都补全'));
  assert.ok(composite.includes('proposal.characters'));
  assert.ok(composite.includes('brief.storyGraph'));
  const eventAdd = creatorGraphGuidance({userMessage:'在流沙河发生冲突',currentDraft:{...input.currentDraft,brief:{...input.currentDraft.brief,storyGraph:graph}}});
  assert.ok(eventAdd.includes('本轮涉及事件话题，但讨论可能性不等于授权添加'));
  assert.ok(eventAdd.includes('brief.storyGraph'));
});
test('adding characters to existing graph draft preserves existing graph without forced regeneration', () => {
  const role1 = { name: '唐僧', identity: '取经人', persona: '慈悲隐忍', relationship: '', appearance: '', goal: '取经' };
  const role2 = { name: '沙僧', identity: '卷帘大将', persona: '沉默戒备', relationship: '', appearance: '', goal: '脱罪' };
  const currentDraft = {
    ...input.currentDraft,
    characters: [role1, role2],
    brief: { ...input.currentDraft.brief, storyGraph: graph },
  };
  const role3 = { name: '孙悟空', identity: '齐天大圣', persona: '桀骜敏锐', relationship: '', appearance: '', goal: '解脱紧箍' };
  const r = readCreatorResponse({
    reply: '已为你构思孙悟空的设定。',
    proposal: {
      characters: [role1, role2, role3],
    },
  }, { ...input, currentDraft });
  assert.ok(isCreatorAgentResponse(r));
  assert.equal(r.discussionOnly, false);
  assert.equal(r.proposal.characters.length, 3);
  assert.equal(r.proposal.characters[2].name, '孙悟空');
  assert.deepEqual(r.proposal.brief.storyGraph, graph);
});
test('creator append guidance distinguishes between empty canvas and existing canvas', () => {
  const emptyGuide = creatorGraphGuidance({ userMessage: '请构思并添加下一个事件' });
  assert.ok(emptyGuide.includes('建立初始故事画布'));
  assert.ok(emptyGuide.includes('opening'));
  const existGuide = creatorGraphGuidance({ userMessage: '请构思并添加下一个事件', currentDraft: { ...input.currentDraft, brief: { ...input.currentDraft.brief, storyGraph: graph } } });
  assert.ok(existGuide.includes('本轮作者明确委托追加事件'));
  assert.ok(existGuide.includes('沿用原节点ID'));
});
test('fault-tolerant extractor recovers valid title, characters and genre even when minor fields omitted', () => {
  const r = readCreatorResponse({
    reply: '为你构思了暴风雨海域的故事。',
    proposal: {
      title: '深海余烬',
      premise: '19世纪末，风暴海域中的旧商船...',
      characters: [
        { name: '艾登', identity: '老船长', persona: '沉稳冷酷', relationship: '与大副对立' },
        { name: '雷恩', identity: '叛变大副', persona: '野心勃勃', relationship: '觊觎船权' }
      ],
      brief: {
        discoveryGenre: '悬疑惊悚 · 架空海域',
        coreGoal: '在暴风雨中维持对船只的控制',
      }
    }
  }, input);
  assert.ok(isCreatorAgentResponse(r));
  assert.equal(r.discussionOnly, false);
  assert.equal(r.proposal.title, '深海余烬');
  assert.equal(r.proposal.brief.discoveryGenre, '悬疑惊悚');
  assert.equal(r.proposal.characters.length, 2);
  assert.equal(r.proposal.characters[0].name, '艾登');
  assert.equal(r.proposal.characters[0].appearance, '');
});
