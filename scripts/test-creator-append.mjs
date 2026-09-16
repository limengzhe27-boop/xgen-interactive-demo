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
