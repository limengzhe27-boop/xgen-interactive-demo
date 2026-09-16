import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creatorEntryContext, possibilityRoleId, bindCreatorActors, remapCreatorStoryRoles, mapCreatorStoryRoleIds, creatorStoryIssues } from '../lib/creator-story-graph.ts';
import { CREATOR_FOUNDATION_GUIDANCE, creatorGraphGuidance } from '../lib/creator-guidance.ts';
import { publicationWorld } from '../lib/publication.ts';
import { publicationDraft } from '../lib/restore-publication.ts';

const graph = () => ({ startNodeId: 'start', nodes: [['start',['mountain','water']],['mountain',['merge']],['water',['merge']],['merge',[]]].map(([id,nextNodeIds]) => ({id,title:id,location:'',scene:'',worldFacts:[],nextNodeIds})), entries: [{roleId:'draft-role-0',nodeId:'mountain',defaultPath:['start','mountain'],knownFacts:[],beliefs:[],scene:''}] });
const roles = [{id:'draft-role-0',name:'陆沉'},{id:'draft-role-1',name:'陆沉舟'}];
const action = actor => ({actor,action:'拦路',consequence:'引起注意'});
test('exact unique actor only, never substring, target or duplicate names', () => {
  assert.equal(possibilityRoleId(action('陆沉舟'),roles),'draft-role-1');
  assert.equal(possibilityRoleId(action('黑衣刺客（突袭陆沉）'),roles),null);
  assert.equal(possibilityRoleId(action(''),roles),null);
  assert.equal(possibilityRoleId(action('陆沉'),[roles[0],{...roles[1],name:'陆沉'}]),null);
  assert.equal(possibilityRoleId({...action('陆沉'),roleId:null},roles),null);
});
test('rename, reorder and deletion preserve identity without inheriting removed actions', () => {
  const g=graph(); g.nodes[3].possibilities=[action('陆沉'),action('陆沉舟')];
  const before=roles.map((r,i)=>({name:r.name,editorId:`stable-${i}`}));
  const after=[before[1],{...before[0],name:'陆掌柜'}];
  const next=remapCreatorStoryRoles(g,before,after);
  assert.deepEqual(next.nodes[3].possibilities.map(p=>p.roleId),['draft-role-1','draft-role-0']);
  const removed=remapCreatorStoryRoles(g,before,[{...before[1],name:'陆沉'}]);
  assert.equal(removed.nodes[3].possibilities[0].roleId,null);
  assert.equal(removed.entries.length,0);
  assert.equal(g.nodes[3].possibilities[0].roleId,undefined);
});
test('entry topology reports design paths, never presence or combined experience', () => {
  const g=graph();
  assert.match(creatorEntryContext(g,'draft-role-0','merge'),/部分设计路径.*另一些不经过/);
  assert.match(creatorEntryContext(g,'draft-role-0','merge'),/实际是否已登场须看体验记录/);
  assert.match(creatorEntryContext(g,'draft-role-0','water'),/不会迁移入场或授予/);
  g.nodes[0].nextNodeIds=['mountain']; g.nodes=g.nodes.filter(n=>n.id!=='water');
  assert.match(creatorEntryContext(g,'draft-role-0','merge'),/更早入场不等于此刻在场/);
});
test('binding survives publication and restoring to editor role IDs, null stays null', () => {
  const source=JSON.parse(readFileSync(new URL('./fixtures/creator-story-world.json',import.meta.url),'utf8'));
  const g=graph(); g.nodes[3].possibilities=[action('陆沉'),{...action('黑衣刺客'),roleId:null}];
  const mapped=mapCreatorStoryRoleIds(bindCreatorActors(g,roles),id=>source.characters[Number(id.replace('draft-role-',''))]?.id);
  const world=publicationWorld({...source,storyGraph:mapped});
  const restored=publicationDraft({id:'test',title:world.title,genre:'',premise:world.premise,cover:'',portraits:{},world});
  assert.equal(restored.data.creatorBrief.storyGraph.nodes[3].possibilities[0].roleId,'draft-role-0');
  assert.equal(restored.data.creatorBrief.storyGraph.nodes[3].possibilities[1].roleId,null);
  g.nodes[3].possibilities[0].roleId='missing';
  assert.ok(creatorStoryIssues(g,roles.map(r=>r.id)).length);
});
test('guidance checks high-impact premise without forced questionnaire or delegation deadlock', () => {
  assert.match(CREATOR_FOUNDATION_GUIDANCE,/不默认先编开场/);
  assert.match(CREATOR_FOUNDATION_GUIDANCE,/已确认的前提不重复问/);
  assert.match(CREATOR_FOUNDATION_GUIDANCE,/明确委托构思/);
  assert.match(creatorGraphGuidance({userMessage:'西天取经师徒四人各怀鬼胎、暗自盘算'}),/关键世界前提/);
  assert.match(creatorGraphGuidance({userMessage:'你来构思并添加下一个事件'}),/nextQuestions返回空数组|nextQuestions 返回空数组/);
  const route=readFileSync(new URL('../app/api/ai/route.ts',import.meta.url),'utf8');
  assert.ok(route.includes('${CREATOR_FOUNDATION_GUIDANCE}'));
});
