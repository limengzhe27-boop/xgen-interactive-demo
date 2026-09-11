import test from 'node:test';
import assert from 'node:assert/strict';
import {combineCreatorChanges,applyCreatorChange,rebaseCreatorAcceptance} from '../lib/creator-changes.ts';
test('explicit acceptance uses edited proposal despite changed baseline, undo restores actual current text',()=>{
 const current={title:'另一台恢复的标题',premise:'保持'};
 const change={key:'title',label:'标题',before:'旧标题',after:'用户编辑后的建议'};
 const combined=combineCreatorChanges(current,[change],true);
 assert.equal(combined.after.title,change.after);assert.equal(combined.after.premise,'保持');
 assert.deepEqual(applyCreatorChange(combined.after,combined,true),current);
 const single=rebaseCreatorAcceptance(current,change);
 assert.deepEqual(applyCreatorChange(applyCreatorChange(current,single),single,true),current);
});
test('acceptance still refuses a removed role instead of editing a different person',()=>{
 const current={castAndTasks:{roles:[{editorId:'b',name:'乙'}],tasks:[]}};
 const change={key:'role:a:name',label:'姓名',before:'甲',after:'新姓名',target:{kind:'role',id:'a',field:'name'}};
 assert.equal(combineCreatorChanges(current,[change],true),null);
});
