import test from 'node:test';
import assert from 'node:assert/strict';
import {creatorConfirmation,combineCreatorChanges,applyCreatorChange,creatorChanges,rebaseCreatorAcceptance} from '../lib/creator-changes.ts';
import {creatorTaskIssues} from '../lib/creator-task-graph.ts';

test('explicit confirmation executes locally, mixed or negative instructions are not blanket consent',()=>{
  for(const text of ['采纳','全部采纳','确认采纳！','就按这个来','好的']) assert.equal(creatorConfirmation(text),'accept');
  for(const text of ['不采纳','全部忽略']) assert.equal(creatorConfirmation(text),'dismiss');
  for(const text of ['采纳角色，其他不要','好，但是把主角改成女生','不要全部采纳','先修改一下','他说“采纳”']) assert.equal(creatorConfirmation(text),null);
});

const role={editorId:'r1',name:'甲',identity:'成年人',personality:'谨慎',relationship:'朋友',appearance:'蓝衣'};
const task=(id,pre=[])=>({id,title:id,description:id,kind:'main',assignedRoleIds:['draft-role-0'],prerequisiteTaskIds:pre,successCondition:'取得回应',difficulty:'需要实际行动'});
test('all-accept preserves five-role cross-character tasks without broadening ownership',()=>{
  const cast=['悟空','八戒','沙僧','唐僧','观音'].map((name,i)=>({...role,editorId:`r${i}`,name}));
  const tasks=[{...task('escape'),title:'八戒叛逃',assignedRoleIds:['draft-role-1']},{...task('envoy',['escape']),title:'天庭密使',assignedRoleIds:['draft-role-4']}];
  const before={title:'',castAndTasks:{roles:[],tasks:[]}};
  const after={title:'西游暗局',castAndTasks:{roles:cast,tasks}};
  const saved=applyCreatorChange(before,combineCreatorChanges(before,creatorChanges(before,after,{title:'名称',castAndTasks:'角色任务'})));
  assert.deepEqual(creatorTaskIssues(saved.castAndTasks.tasks,5),[]);
  assert.deepEqual(saved,after);
});
test('one batch applies dependent tasks regardless of individual card order and can undo',()=>{
  const before={title:'旧名',castAndTasks:{roles:[role],tasks:[]}};
  const after={title:'新名',castAndTasks:{roles:[role],tasks:[task('later',['first']),task('first')]}};
  const changes=creatorChanges(before,after,{title:'名称',castAndTasks:'角色任务'});
  const batch=combineCreatorChanges(before,changes);
  assert.ok(batch);
  const saved=applyCreatorChange(before,batch);
  assert.deepEqual(saved,after);
  assert.deepEqual(creatorTaskIssues(saved.castAndTasks.tasks,1),[]);
  assert.deepEqual(applyCreatorChange(saved,batch,true),before);
  assert.equal(applyCreatorChange({...saved,title:'我的新手改'},batch,true),null);
});
test('batch conflict changes nothing and modified suggestion is the value actually saved',()=>{
  const before={title:'原名',premise:'原文'};
  const changes=creatorChanges(before,{title:'建议',premise:'新文'},{title:'名称',premise:'背景'});
  assert.equal(combineCreatorChanges({...before,premise:'后来手改'},changes),null);
  assert.deepEqual(before,{title:'原名',premise:'原文'});
  const edited=changes.map(c=>c.key==='title'?{...c,after:'我改的建议'}:c);
  assert.equal(applyCreatorChange(before,combineCreatorChanges(before,edited)).title,'我改的建议');
});

test('explicit acceptance preserves original baseline and rejects later manual role edits',()=>{
  const before={castAndTasks:{roles:[role],tasks:[]}};
  const after={castAndTasks:{roles:[{...role,identity:'卷帘神将'}],tasks:[]}};
  const [change]=creatorChanges(before,after,{castAndTasks:'人物'});
  const current={castAndTasks:{roles:[{...role,identity:'金身罗汉'}],tasks:[]}};
  assert.equal(rebaseCreatorAcceptance(current,change).before,role.identity);
  assert.equal(applyCreatorChange(current,rebaseCreatorAcceptance(current,change)),null);
  assert.equal(combineCreatorChanges(current,[change],true),null);
  assert.equal(current.castAndTasks.roles[0].identity,'金身罗汉');
});
test('unrelated manual field survives local acceptance and batch undo',()=>{
  const before={title:'原名',castAndTasks:{roles:[role],tasks:[]}};
  const changes=creatorChanges(before,{...before,castAndTasks:{roles:[{...role,identity:'新身份'}],tasks:[]}},{castAndTasks:'人物'});
  const current={...before,title:'作者新标题'};
  const combined=combineCreatorChanges(current,changes,true);
  assert.ok(combined);
  const accepted=applyCreatorChange(current,combined);
  assert.equal(accepted.title,'作者新标题');
  assert.deepEqual(applyCreatorChange(accepted,combined,true),current);
});
