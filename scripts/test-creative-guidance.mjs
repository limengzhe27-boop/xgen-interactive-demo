import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkProloguePlan, compileProloguePlan } from '../lib/prologue-plan.ts';
import { creativeGuidance } from '../lib/creative-guidance.ts';
import { videoPayload } from '../lib/media-policy.ts';
const example = () => JSON.parse(readFileSync(new URL('../docs/prologue-plan.example.json', import.meta.url), 'utf8'));
test('twenty second evidence plan compiles visual prompts separately from overlays', () => {
  const plan = example(); assert.deepEqual(checkProloguePlan(plan), []);
  const result = compileProloguePlan(plan);
  assert.equal(result.totalSeconds, 20); assert.equal(result.status, 'plan-only-not-video-reviewed');
  assert.ok(result.shots[0].prompt.includes('主动环抱并亲吻'));
  assert.ok(!result.shots[1].prompt.includes('幼儿园'));
  assert.ok(result.shots[1].overlays[0].includes('丈夫'));
  assert.ok(result.shots[1].prompt.includes('不演出选择结果'));
  assert.deepEqual(plan, example());
});
test('no filler, undeclared cast, missing evidence, duplicate IDs, timing gaps or premature handoff', () => {
  const changes = [
    p => p.shots[1].end = 31,
    p => p.shots[1].start = 11,
    p => p.shots[0].start = -1,
    p => p.shots[0].end = NaN,
    p => p.shots[1].evidence = [],
    p => p.shots[0].evidence[1].channel = 'overlay',
    p => p.shots[0].characterIds.push('unknown'),
    p => p.characters[1].id = 'lin',
    p => p.shots[1].continuity = '',
    p => p.handoff.shotId = 's1',
    p => p.handoff.choices = ['回复'],
    p => p.shots[0].evidence[0].factId = 'future-secret',
  ];
  for (const change of changes) { const plan = example(); change(plan); assert.ok(checkProloguePlan(plan).length); assert.throws(() => compileProloguePlan(plan)); }
});
test('malformed plans fail closed without throwing from validator', () => {
  for (const value of [null, [], {}, { characters:[null], facts:[null], shots:[null] }, {...example(), handoff:[]}]) assert.ok(checkProloguePlan(value).length);
});
test('ordinary companion and admission do not receive drama rules; single scene retains five second API contract', () => {
  for (const operation of ['personal-agent', 'adapt-persona', 'design-persona', 'unknown']) assert.equal(creativeGuidance(operation), '');
  for (const operation of ['co-create-world', 'generate-world', 'advance-world']) assert.ok(creativeGuidance(operation).length > 100);
  const payload = videoPayload('model-fixture', '甲放下杯子，乙转身离开。');
  assert.equal(payload.seconds, '5'); assert.equal(payload.model, 'model-fixture');
  assert.ok(payload.prompt.includes('甲放下杯子，乙转身离开。'));
});
