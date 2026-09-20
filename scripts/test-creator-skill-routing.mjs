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
test('scenario 1: Journey to the West - discuss only Sha Wujing routes to H2 without intrigue',()=>{
  const req = { userMessage: '西游多角色作品，本轮只讨论沙僧', characters: [{ name: '唐僧' }, { name: '孙悟空' }, { name: '猪八戒' }, { name: '沙僧' }] };
  const routed = selectCreatorSkills(req);
  assert.equal(routed.horizontal, 'H2');
  assert.deepEqual(routed.vertical, []);
  const guidance = creatorSkillGuidance(req);
  assert.ok(guidance.includes('局限性修改原则：作者只讨论某个人，就不要替其他人定案'));
});
test('scenario 2: Warm co-living - relationship without forced secrets and intrigue',()=>{
  const req = request('温暖合租作品，以相处为主，不强加秘密和阴谋');
  const routed = selectCreatorSkills(req);
  assert.equal(routed.horizontal, 'H1');
  assert.deepEqual(routed.vertical, ['V2']);
  const guidance = creatorSkillGuidance(req);
  assert.ok(guidance.includes('允许日常安静相处、并肩协作，不强制恋爱、阴谋或好感数字'));
});
test('scenario 3: Shop management - clear delegation receives V6 method and execution guidance',()=>{
  const req = request('小店经营作品，作者明确委托完善');
  const routed = selectCreatorSkills(req);
  assert.deepEqual(routed.vertical, ['V6']);
  const guidance = creatorSkillGuidance(req);
  assert.ok(guidance.includes('建设与经营'));
  assert.ok(guidance.includes('明确委托交付原则：作者明确委托'));
});

