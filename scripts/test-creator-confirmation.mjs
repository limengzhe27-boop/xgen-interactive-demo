import test from 'node:test';
import assert from 'node:assert/strict';
import {creatorConfirmation,combineCreatorChanges,applyCreatorChange,creatorChanges} from '../lib/creator-changes.ts';
import {creatorTaskIssues} from '../lib/creator-task-graph.ts';

test('explicit confirmation executes locally, mixed or negative instructions are not blanket consent',()=>{
  for(const text of ['采纳','全部采纳','确认采纳！','就按这个来','好的']) assert.equal(creatorConfirmation(text),'accept');
  for(const text of ['不采纳','全部忽略']) assert.equal(creatorConfirmation(text),'dismiss');
  for(const text of ['采纳角色，其他不要','好，但是把主角改成女生','不要全部采纳','先修改一下','他说“采纳”']) assert.equal(creatorConfirmation(text),null);
});

const role={editorId:'r1',name:'甲',identity:'成年人',personality:'谨慎',relationship:'朋友',appearance:'蓝衣'};
const task=(id,pre=[])=>({id,title:id,description:id,kind:'main',assignedRoleIds:['draft-role-0'],prerequisiteTaskIds:pre,successCondition:'取得回应',difficulty:'需要实际行动'});
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
