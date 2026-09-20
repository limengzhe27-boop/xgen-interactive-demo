import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCreatorSkills, creatorSkillGuidance, horizontalSkills, verticalMethods } from '../lib/creator-skill-routing.ts';
const request = userMessage => ({userMessage});
test('all six horizontal and vertical runtime methods exist', () => {
  assert.equal(Object.keys(horizontalSkills).length,6);
  assert.equal(Object.keys(verticalMethods).length,6);
});
for (const [text,h,v] of [
  ['定一下方向','H1',[]], ['只讨论沙僧性格','H2',[]], ['谁知道秘密','H3',[]],
  ['设计调查开场','H4',['V1']], ['后续安排协商','H5',['V3']], ['写公开介绍','H6',[]],
  ['人物之间如何相处','H2',['V2']], ['后续求生资源分配','H5',['V4']],
  ['设计探索未知的事件','H5',['V5']], ['经营小店的后续','H5',['V6']],
]) test(text, () => {const r=selectCreatorSkills(request(text));assert.equal(r.horizontal,h);assert.deepEqual(r.vertical,v);});
test('genre alone does not authorize intrigue or whole cast generation',()=>{
  assert.deepEqual(selectCreatorSkills(request('师徒四人各怀鬼胎')).vertical,[]);
});
test('current subject overrides advisory focus and local edits load no method',()=>{
  const hint={focus:'story_canvas',confidence:0.9,shouldClarify:false};
  assert.equal(selectCreatorSkills(request('改名字'),hint).horizontal,'H2');
  assert.deepEqual(selectCreatorSkills(request('角色改名为调查员'),hint).vertical,[]);
});
test('only selected excerpts enter context; no twelve-file dump',()=>{
  const result=creatorSkillGuidance(request('只讨论人物性格'));
  assert.ok(result.includes(horizontalSkills.H2));
  assert.ok(!result.includes(horizontalSkills.H5));
  for(const method of Object.values(verticalMethods)) assert.ok(!result.includes(method));
});
