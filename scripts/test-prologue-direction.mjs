import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkPrologueDirection, compileDirectedProloguePlan } from '../lib/prologue-direction.ts';
const path = name => fileURLToPath(new URL(`../${name}`, import.meta.url));
const read = name => JSON.parse(readFileSync(path(`docs/${name}`), 'utf8'));
const plan = () => read('prologue-first-person.example.json');
const direction = () => read('prologue-first-person.direction.json');

test('all five detailed shots compile without mutation, generation or validated reference claims', () => {
  const p = plan(), d = direction(), before = structuredClone({p,d});
  assert.deepEqual(checkPrologueDirection(p,d), []);
  const result = compileDirectedProloguePlan(p,d);
  assert.deepEqual({p,d}, before);
  assert.equal(result.shots.length, 5);
  assert.equal(result.totalSeconds, 28);
  assert.equal(result.submissionAuthorized, false);
  assert.equal(result.status, 'plan-only-not-video-reviewed');
  assert.equal(result.referencesVerified, false);
  assert.equal(result.modelCapabilityVerified, false);
  assert.equal(result.timingIsEditorialTarget, true);
  assert.deepEqual(result.audio, p.audio);
  assert.match(result.shots.at(-1).imageToVideoMotionPrompt, /不演出选择结果/);
  assert.equal(result.shots[2].directorTimeline[1].globalStart, 13.5);
  assert.equal(result.shots[2].sound[1].globalStart, 12.4);
  assert.deepEqual(result.shots[0].spokenCues, p.audio.cues.slice(0,2));
  for (const [i,s] of result.shots.entries()) {
    assert.match(s.textToVideoPrompt, /地点：/);
    assert.ok(!s.imageToVideoMotionPrompt.includes('沿用已确认参考图'));
    for (const b of d.shots[i].beats) {
      assert.ok(s.imageToVideoMotionPrompt.includes(b.blocking));
      assert.ok(s.imageToVideoMotionPrompt.includes(b.camera));
      assert.ok(s.directorTimeline.some(row => row.change === b.change));
      assert.ok(!s.imageToVideoMotionPrompt.includes(b.change));
    }
    assert.ok(!s.imageToVideoMotionPrompt.includes('registrar'));
    assert.ok(!s.imageToVideoMotionPrompt.includes('shen'));
    assert.ok(s.imageToVideoMotionPrompt.includes(d.shots[i].lastFrame));
  }
});

test('partial, disordered or empty direction and invalid beat coverage cannot compile', () => {
  const cases = [
    [d => d.shots.pop(), 'DIRECTION'],
    [d => d.shots.reverse(), 'DIRECTION'],
    [d => d.version = 2, 'DIRECTION'],
    [d => d.shots[0] = null, 'DIRECTION'],
    [d => d.shots[0].firstFrame = '', 'DIRECTION_FIELD'],
    [d => delete d.shots[0].risk, 'DIRECTION_FIELD'],
    [d => d.shots[0].beats = [], 'BEATS'],
    [d => d.shots[0].beats[0] = null, 'BEATS'],
    [d => d.shots[0].beats[0].blocking = ' ', 'BEAT_ACTION'],
    [d => d.shots[0].beats[0].change = '', 'BEAT_ACTION'],
    [d => d.shots[0].beats[0].start = -1, 'BEAT_TIME'],
    [d => d.shots[0].beats[1].start = 0.5, 'BEAT_TIME'],
    [d => d.shots[0].beats[1].start = 2, 'BEAT_TIME'],
    [d => d.shots[0].beats[1].end = Infinity, 'BEAT_TIME'],
    [d => d.shots[0].beats.at(-1).end = 5.8, 'BEAT_TIME'],
    [d => d.shots[0].beats.at(-1).end = 6.1, 'BEAT_TIME'],
    [d => d.shots[0].sound = [], 'SOUND'],
    [d => d.shots[0].sound[0].end = 7, 'SOUND_TIME'],
    [d => d.shots[0].sound[0].description = '', 'SOUND_TIME'],
  ];
  for (const [mutate,prefix] of cases) {
    const d = direction(); mutate(d);
    assert.ok(checkPrologueDirection(plan(),d).some(e => e.startsWith(prefix)), prefix);
    assert.throws(() => compileDirectedProloguePlan(plan(),d));
  }
  for (const d of [null, {}, [], {version:1,shots:null}]) assert.ok(checkPrologueDirection(plan(),d).length);
  assert.ok(checkPrologueDirection({}, direction()).length);
});

test('direction cannot bypass mandatory voice; legitimate long beat and overlapping ambience allowed', () => {
  const p = plan(), d = direction();
  p.audio.mode = 'silent';
  assert.ok(checkPrologueDirection(p,d).some(e => e.startsWith('AUDIO')));
  const single = d.shots[0].beats[0];
  single.end = 6; d.shots[0].beats = [single];
  assert.deepEqual(checkPrologueDirection(plan(),d), []);
  // The validator deliberately does not judge whether this six-second performance is compelling.
});

test('CLI requires both explicit files and rejects mixed modes; base story remains readable', () => {
  const run = (...args) => spawnSync(process.execPath, [path('scripts/prepare-prologue.mjs'), ...args], {encoding:'utf8'});
  const p = path('docs/prologue-first-person.example.json'), d = path('docs/prologue-first-person.direction.json');
  const valid = run(p, '--direction', d);
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).directionVersion, 1);
  assert.equal(run(p, '--direction').status, 1);
  assert.equal(run(p, '--direction', d, '--legacy').status, 1);
  assert.equal(run(p, '--story', '--direction', d).status, 1);
  assert.equal(run(p, '--direction', p).status, 1);
  assert.equal(run(p, '--story').status, 0);
});
