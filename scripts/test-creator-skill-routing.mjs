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
test('CREATOR_SKILL_VERSION reflects updated 6x6 runtime specification', () => {
  assert.equal(horizontalSkills.H1.includes('成果落点：设定与方向'), true);
  assert.equal(horizontalSkills.H2.includes('成果落点：人物与关系'), true);
  assert.equal(horizontalSkills.H3.includes('四分法（客观事实、角色已知、怀疑推断及玩家见闻依据）'), true);
  assert.equal(horizontalSkills.H4.includes('绝不因新增事件搬移入口'), true);
  assert.equal(horizontalSkills.H5.includes('触发条件—行动空间—影响与代价—他人回应'), true);
  assert.equal(horizontalSkills.H6.includes('三级公开权限'), true);
  for (const [key, text] of Object.entries(verticalMethods)) {
    assert.ok(text.includes('调用操作：'), `${key} must include 调用操作`);
    assert.ok(text.includes('检查与反例：'), `${key} must include 检查与反例`);
  }
});
test('scenario 4: Investigation V1 specifies 4-step operation and avoids forced lies', () => {
  const req = request('设计调查开场与线索发现');
  const routed = selectCreatorSkills(req);
  assert.equal(routed.horizontal, 'H4');
  assert.deepEqual(routed.vertical, ['V1']);
  const guidance = creatorSkillGuidance(req);
  assert.ok(guidance.includes('调查与发现'));
  assert.ok(guidance.includes('不用微动作直接证明有罪，不强制物证或全员撒谎'));
  assert.ok(guidance.includes('知情依据交给 H3'));
});
test('scenario 5: Negotiation V3 requires controlled leverage and preserves exit', () => {
  const req = request('后续安排双方协商谈判与筹码交换');
  const routed = selectCreatorSkills(req);
  assert.equal(routed.horizontal, 'H5');
  assert.deepEqual(routed.vertical, ['V3']);
  const guidance = creatorSkillGuidance(req);
  assert.ok(guidance.includes('博弈与协商'));
  assert.ok(guidance.includes('口头承诺不等于兑现'));
  assert.ok(guidance.includes('不以威胁背叛为默认解法'));
});
test('scenario 6: Survival V4 compares tradeoffs without arbitrary countdowns', () => {
  const req = request('后续渡河求生，资源分配与风险取舍');
  const routed = selectCreatorSkills(req);
  assert.equal(routed.horizontal, 'H5');
  assert.deepEqual(routed.vertical, ['V4']);
  const guidance = creatorSkillGuidance(req);
  assert.ok(guidance.includes('求生与风险取舍'));
  assert.ok(guidance.includes('不凭空增加死亡或倒计时惩罚'));
});
test('scenario 7: Exploration V5 respects capability boundaries and avoids pure grinding', () => {
  const req = request('设计探索未知的后续事件与学习能力');
  const routed = selectCreatorSkills(req);
  assert.equal(routed.horizontal, 'H5');
  assert.deepEqual(routed.vertical, ['V5']);
  const guidance = creatorSkillGuidance(req);
  assert.ok(guidance.includes('探索与成长'));
  assert.ok(guidance.includes('不强制数值等级或无理剥夺能力'));
});

