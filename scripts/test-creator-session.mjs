import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreCreatorSession } from '../lib/creator-session.ts';
import { repairCreatorProposal } from '../lib/creator-proposal-repair.ts';
import { creatorChanges, combineCreatorChanges, applyCreatorChange } from '../lib/creator-changes.ts';

const task=(id,pre=[])=>({id,title:id,kind:'main',description:'目标方向',successCondition:'达成条件',difficulty:'有人阻挠',assignedRoleIds:['draft-role-0'],prerequisiteTaskIds:pre});
const response=(tasks=[])=>({reply:'建议',proposal:{title:'测试世界',premise:'虚构测试',brief:{coreGoal:'目标',preferredDirection:'成功',alternativeDirection:'失败',complexityLevel:2,tasks,difficulties:[],scheduledEvents:[]}},nextQuestions:['继续吗'],readiness:'ready'});
const roundtrip=value=>JSON.parse(JSON.stringify(value));
test('pending edited suggestions survive storage and still apply with original conflict protection',()=>{
 const before={title:'原名'};
 const changes=creatorChanges(before,{title:'建议名'},{title:'名称'}).map(c=>({...c,after:'手改建议'}));
 const saved=restoreCreatorSession(roundtrip({proposal:response().proposal,changes,input:'未发文字',questions:['继续吗']}));
 assert.equal(saved.input,'未发文字'); assert.equal(saved.changes[0].after,'手改建议');
 assert.equal(applyCreatorChange(before,combineCreatorChanges(before,saved.changes)).title,'手改建议');
 assert.equal(combineCreatorChanges({title:'后来修改'},saved.changes),null);
 assert.equal(restoreCreatorSession(undefined).proposal,null);
 assert.equal(restoreCreatorSession({proposal:{},changes:[]}).proposal,null);
});
test('separate drafts retain separate pending proposals and an accepted draft stays accepted',()=>{
 const a={proposal:response().proposal,changes:[{key:'title',label:'名称',before:'',after:'甲'}],input:'甲输入',questions:[]};
 const b={...a,changes:[{...a.changes[0],after:'乙'}],input:'乙输入'};
 const stored=roundtrip({a,b});
 assert.equal(restoreCreatorSession(stored.a).changes[0].after,'甲');
 assert.equal(restoreCreatorSession(stored.b).input,'乙输入');
 assert.equal(restoreCreatorSession(roundtrip({...a,proposal:null,changes:[]})).proposal,null);
});
test('valid cross-role prerequisites do not invoke repair',async()=>{
 const r=response([task('a'),{...task('b',['a']),assignedRoleIds:['draft-role-1']}]);
 assert.equal(await repairCreatorProposal(r,2,()=>{throw Error('unexpected call');}),r);
});
test('invalid graph is repaired once while preserving the entire non-task proposal',async()=>{
 const r=response([task('a',['b']),task('b',['a'])]);let calls=0;
 const result=await repairCreatorProposal(r,1,async issues=>{calls++;assert.ok(issues.length);return {...response([task('a'),task('b',['a'])]),proposal:{...response([task('a'),task('b',['a'])]).proposal,title:'不允许篡改'}};});
 assert.equal(calls,1);assert.equal(result.proposal.title,r.proposal.title);assert.deepEqual(r.proposal.brief.tasks[0].prerequisiteTaskIds,['b']);
 assert.deepEqual(result.proposal.brief.tasks[0].prerequisiteTaskIds,[]);
});
test('invalid, deleted, or rewritten repair cannot be offered as successful',async()=>{
 const r=response([task('a',['missing'])]);
 for(const candidate of [null,r,response([]),response([{...task('a'),title:'偷换目标'}]),response([{...task('a'),assignedRoleIds:[]}])]) {
  let calls=0;await assert.rejects(repairCreatorProposal(r,1,async()=>{calls++;return candidate;}),/invalid_creator_task_graph/);assert.equal(calls,1);
 }
});
