import assert from 'node:assert/strict';
import { preserveCreatorDetails, preserveCreatorFramework } from '../lib/creator-framework.ts';
import { createInitialWorldState, selectRoleGoal } from '../lib/world-state.ts';

const baseUrl = process.env.XGEN_EVAL_BASE_URL || 'http://localhost:3000';
async function call(operation, input) {
  const response = await fetch(`${baseUrl}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, input }), signal: AbortSignal.timeout(85000) });
  const body = await response.json();
  assert.equal(response.status, 200, `${operation}: ${response.status} ${body.error}`);
  assert.equal(response.headers.get('x-ai-provider'), 'deepseek');
  return body;
}

const generated = await call('generate-world', {
  contractVersion: '2026-09-04.v2', creatorIntent: '雨天的小院读书会',
  characters: [
    { name: '许宁', identity: '成年书店店员', persona: '细心，蓝色衬衫，负责整理阅读角' },
    { name: '陈禾', identity: '成年社区志愿者', persona: '开朗，灰色夹克，在院内帮忙' },
    { name: '周岚', identity: '成年店主', persona: '务实，棕色针织衫，开场在储藏室整理雨伞，不在阅读角' },
  ], relationshipNotes: ['三人都是读书会筹备同伴，没有秘密亲属关系。'],
  storySeed: '小书店准备一场雨天读书会。开场在阅读角，木桌上有蓝色搪瓷杯和三本读物。店内的阅读角、走廊、储藏室互相可返回，不是只向前的单行路线。保留可感知的开场细节，周岚在储藏室，只有许宁和陈禾在阅读角。',
  surpriseLevel: 1, creatorBrief: {
    coreGoal: '准备好读书会', successCondition: '读物与座位准备好并宣布开始', failureCondition: '创作者明确取消读书会', complexityLevel: 2,
    tasks: [
      { id: 'books', title: '整理读物', description: '核对三本读物并摆好', kind: 'main', prerequisiteTaskIds: [], successCondition: '三本读物已放在阅读桌上', difficulty: '实际清点' },
      { id: 'seats', title: '摆好座位', description: '将三把椅子摆在阅读桌边', kind: 'main', prerequisiteTaskIds: ['books'], successCondition: '三把椅子已摆好', difficulty: '实际摆放' },
      { id: 'start', title: '宣布开始', description: '邀请在场人员开始读书会', kind: 'main', prerequisiteTaskIds: ['seats'], successCondition: '筹备者已宣布读书会开始', difficulty: '必须准备完毕' },
    ], difficulties: ['准备工作不可用口头宣告替代'], scheduledEvents: [],
  },
});
const base = generated.world;
const baseline = { roles: base.characters.map((character) => ({ name: character.name, identity: character.identity, personality: character.persona, appearance: character.imagePrompt, relationship: '' })), outline: generated.storyOutline };
const projected = structuredClone(base);
projected.title += '（发布验证）'; projected.surpriseLevel = 2;
projected.openingScene = { ...base.openingScene, narrative: '通用开场模板', locationId: 'template', presentCharacterIds: base.characters.map((character) => character.id) };
projected.characters = base.characters.map((character) => ({ ...character, publicBackground: '通用背景模板', startLocationId: 'template' }));
projected.locations = [{ id: 'template', name: '第一幕', description: '模板', connectedLocationIds: [] }];
const publish = (original) => preserveCreatorDetails(original, preserveCreatorFramework(original, projected), baseline, baseline);
const published = publish(base);
assert.deepEqual(published.openingScene, base.openingScene);
assert.deepEqual(published.characters, base.characters);
assert.deepEqual(published.locations, base.locations);
assert.deepEqual(publish(JSON.parse(JSON.stringify(published))), published);
assert.equal(published.title, projected.title);
console.log(JSON.stringify({ stage: 'published', openingChars: base.openingScene.narrative.length,
  locationCount: base.locations.length, characterCount: base.characters.length, presentCastCount: base.openingScene.presentCharacterIds.length,
  fullOpeningPreserved: true, graphAndBackgroundPreserved: true, repeatedPublishPreserved: true }));
const role = published.characters[0];
const location = published.locations.find((place) => place.id === published.openingScene.locationId);
const state = createInitialWorldState('draft', role.id, '', location.id, { timeSetting: published.timeSetting, coreEvent: published.coreEvent,
  activeGoalId: selectRoleGoal(published, role.id)?.id, roleKnowledge: [...role.privateKnowledge, ...role.secrets], characterIds: published.characters.map((character) => character.id),
  characterLocations: Object.fromEntries(published.characters.map((character) => [character.id, published.openingScene.presentCharacterIds.includes(character.id) ? location.id : character.startLocationId])), openingLocationId: location.id });
const out = await call('advance-world', { contractVersion: '2026-09-04.v2', world: published, selectedRoleId: role.id,
  userAction: `${role.name}留在当前地点，观察桌边物品，向在场同伴询问今天读书会的准备安排，只听回应不作承诺。`, state, recentTurns: [],
  currentScene: { id: 'published-opening', title: published.title, narrative: published.openingScene.narrative, choices: [] } });
assert.equal(out.actionDecision.allowed, true);
assert.ok(out.nextChoices.every((choice) => choice.label.startsWith(role.name)));
console.log(JSON.stringify({ stage: 'advance', narrativeChars: out.narrative.length, choices: out.nextChoices.map((choice) => choice.label), ending: out.ending, narrativeExcerpt: out.narrative.slice(0, 150) }));
