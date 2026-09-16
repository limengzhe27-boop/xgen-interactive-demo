import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { actionServiceError, visibleInteractionGoal, actionLabel, INTERACTION_CLARITY_GUIDANCE } from '../lib/interaction-clarity.ts';

test('technical errors explain unchanged progress without exposing raw upstream data', () => {
  assert.match(actionServiceError(new Error('504')), /超时/);
  assert.match(actionServiceError(new Error('模型回复格式不完整')), /格式/);
  assert.match(actionServiceError(new Error('请求过多')), /请求较多/);
  assert.ok(!actionServiceError(new Error('secret upstream stack')).includes('secret'));
});
test('generic internal goal is replaced with meaningful role intent or omitted', () => {
  assert.equal(visibleInteractionGoal('事件发生', '推进剧情', '不惊动同伴，确认谁动过包袱'), '不惊动同伴，确认谁动过包袱');
  assert.equal(visibleInteractionGoal('检查包袱', undefined, '旅途'), '检查包袱');
  assert.equal(visibleInteractionGoal('事件发生', undefined, ''), '');
});
test('short labels preserve the full action meaning', () => {
  assert.equal(actionLabel('唐僧：退回庙内，留意谁先动', '唐僧'), '退回庙内，留意谁先动');
  assert.equal(actionLabel('询问唐僧：怎么了', '唐僧'), '询问唐僧：怎么了');
});
test('text UI exposes choices, keeps failed input and only labels accepted actions', () => {
  const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const action = source.slice(source.indexOf('function takeAction('), source.indexOf('function updateDraftRole('));
  assert.ok(action.indexOf('setLastAction(nextAction)') > action.indexOf('if (!response.actionDecision.allowed)'));
  assert.ok(action.includes('actionServiceError(error)'));
  assert.ok(action.includes('setFreeAction(current => current || nextAction)'));
  assert.ok(source.includes('aria-label="接下来可以怎么做"'));
  assert.ok(!source.includes('不知道怎么做？看行动灵感'));
  assert.match(INTERACTION_CLARITY_GUIDANCE, /观察、装睡、等待都是有效行动/);
});
test('canvas publishes valid changes without delayed writes or graph-dependent remounts', () => {
  const source = readFileSync(new URL('../components/creator-story-canvas.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('const updateNode = (patch: Partial<typeof node>) => saveEdit('));
  assert.ok(!source.includes('setTimeout'));
  assert.ok(source.includes("suggested ? 'proposal' : 'draft'"));
});
