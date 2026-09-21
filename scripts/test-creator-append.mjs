import test from 'node:test';
import assert from 'node:assert/strict';
import { appendCreatorGraph, creatorAppendRequested } from '../lib/creator-append.ts';
import { readCreatorResponse } from '../lib/creator-response.ts';

const base = {startNodeId:'a',nodes:[{id:'a',title:'开场',location:'码头',scene:'原有手改',worldFacts:['已确认'],nextNodeIds:[]}],entries:[{roleId:'draft-role-0',nodeId:'a',defaultPath:['a'],knownFacts:['原有知识'],beliefs:[],scene:'你在码头'}]};
const proposal = {startNodeId:'a',nodes:[{...base.nodes[0],scene:'误改',nextNodeIds:['b']},{id:'b',title:'新事件',location:'船上',scene:'有人递来包裹',worldFacts:[],nextNodeIds:[]}],entries:[{...base.entries[0],nodeId:'b',defaultPath:['a','b'],knownFacts:['泄露的后续事实']}]};
test('only explicit append requests execute',()=>{
  for(const m of ['请构思并添加下一个事件节点','添加到画布中','请追加后续节点，不要修改原角色']) assert.equal(creatorAppendRequested(m),true,m);
  for(const m of ['先不添加节点','讨论一下后续节点','如何添加节点','可以添加节点吗？','修改角色入场']) assert.equal(creatorAppendRequested(m),false,m);
});
test('public introduction instructions do not authorize graph append',()=>{
  for(const message of [
    '请整理公开介绍，不新增人物秘密、剧情或外貌，不透露后续转折或结局。',
    '不新增事件，只补充作品简介',
    '新增一条人物介绍，后续剧情不要透露',
  ]) assert.equal(creatorAppendRequested(message),false,message);
  assert.equal(creatorAppendRequested('请新增后续事件，保留已有简介'),true);
});
test('append preserves opening, hand edits and entire entry knowledge',()=>{
  const original=structuredClone(base);
  const r=appendCreatorGraph(base,proposal);
  assert.equal(r.graph.nodes.length,2);
  assert.equal(r.graph.nodes[0].scene,'原有手改');
  assert.deepEqual(r.graph.entries,base.entries);
  assert.deepEqual(base,original);
});
test('duplicate, empty, disconnected and cyclic results cannot claim completion',()=>{
  assert.ok(appendCreatorGraph(base,base).issue);
  for(const patch of [{title:'开场'},{scene:''},{nextNodeIds:['a']}]){
    const p=structuredClone(proposal);Object.assign(p.nodes[1],patch);assert.ok(appendCreatorGraph(base,p).issue);
  }
  const p=structuredClone(proposal);p.nodes[0].nextNodeIds=[];assert.ok(appendCreatorGraph(base,p).issue);
});
test('subsequent append keeps previous event and edges',()=>{
  const first=appendCreatorGraph(base,proposal).graph;
  const p=structuredClone(first);p.nodes[1].nextNodeIds=['c'];p.nodes.push({...p.nodes[1],id:'c',title:'第三幕',nextNodeIds:[]});
  const next=appendCreatorGraph(first,p).graph;
  assert.equal(next.nodes.length,3);assert.deepEqual(next.nodes[0].nextNodeIds,['b']);assert.deepEqual(next.entries,base.entries);
});
test('explicit parent must be connected',()=>{
  assert.ok(appendCreatorGraph(base,proposal,'节点ID：missing').issue);
  assert.ok(appendCreatorGraph(base,proposal,'节点ID：a').graph);
});
test('model-only success claim becomes an honest no-change response',()=>{
  const input={userMessage:'添加下一个事件节点',characters:[],currentDraft:{title:'故事',premise:'开场',surpriseLevel:2,brief:{storyGraph:base}}};
  const r=readCreatorResponse({reply:'已经添加好了',proposal:null},input);
  assert.equal(r.discussionOnly,true);assert.match(r.reply,/未改动/);
});
test('delegated append on empty canvas establishes initial graph with opening and next event',()=>{
  const input={userMessage:'请为破庙避雨构思并添加下一个事件',characters:[{name:'悟空',identity:'大圣',persona:'急躁',relationship:'',appearance:'',goal:'守夜'}],currentDraft:{title:'破庙夜话',premise:'荒山破庙避雨',surpriseLevel:2,brief:{coreGoal:'',preferredDirection:'',alternativeDirection:'',complexityLevel:2,tasks:[],difficulties:[],scheduledEvents:[]}}};
  const initialGraph={startNodeId:'opening',nodes:[{id:'opening',title:'荒山避雨',location:'破庙',scene:'师徒在破庙避雨',worldFacts:[],nextNodeIds:['night_talk']},{id:'night_talk',title:'夜谈分歧',location:'残破佛像旁',scene:'悟空提出守夜并索要文牒',worldFacts:[],nextNodeIds:[]}],entries:[{roleId:'draft-role-0',nodeId:'opening',defaultPath:['opening'],knownFacts:[],beliefs:[],scene:'你站在破庙门边'}]};
  const r=readCreatorResponse({reply:'已为你建立开场并构思新事件',proposal:{brief:{storyGraph:initialGraph}}},input);
  assert.equal(r.discussionOnly,false);
  assert.equal(r.proposal.brief.storyGraph.nodes.length,2);
  assert.deepEqual(r.proposal.brief.storyGraph.nodes[0].nextNodeIds,['night_talk']);
});
