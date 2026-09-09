import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkProloguePlan, checkStoryProloguePlan, compileProloguePlan } from '../lib/prologue-plan.ts';
const path = name => fileURLToPath(new URL(`../${name}`, import.meta.url));
const read = name => JSON.parse(readFileSync(path(`docs/${name}`), 'utf8'));
const yoga = () => read('prologue-story.example.json');
const pov = () => read('prologue-first-person.example.json');
test('both causal audio plans compile without implying generation or authorization', () => {
  for (const plan of [yoga(), pov()]) {
    assert.deepEqual(checkStoryProloguePlan(plan), []);
    const snapshot = structuredClone(plan), result = compileProloguePlan(plan, true);
    assert.ok(result.totalSeconds >= 20 && result.totalSeconds <= 30);
    assert.equal(result.submissionAuthorized, false);
    assert.equal(result.status, 'plan-only-not-video-reviewed');
    assert.equal(result.audio.mode, 'post'); assert.ok(result.audio.cues.length > 1);
    assert.deepEqual(plan, snapshot);
    assert.equal(result.shots.length, plan.story.beats.length);
    assert.ok(result.shots[0].prompt.includes(plan.story.throughline));
    assert.ok(result.shots.at(-1).prompt.includes('不演出选择结果'));
  }
  assert.ok(compileProloguePlan(pov()).shots.every(s => s.prompt.includes('眼睛视角')));
});
test('missing cause, recall, point of view, voice and timing fail before production', () => {
  const cases = [
    [p => delete p.version, 'VERSION'],
    [p => delete p.story, 'STORY'],
    [p => p.story.throughline = '', 'STORY'],
    [p => p.story.beats.reverse(), 'CAUSALITY'],
    [p => p.story.beats.pop(), 'CAUSALITY'],
    [p => p.story.beats[0] = null, 'CAUSALITY'],
    [p => p.story.recall.pop(), 'RECALL'],
    [p => p.story.recall[0].topic = 'event', 'RECALL'],
    [p => p.story.recall[0].factIds = ['unknown'], 'RECALL'],
    [p => p.story.recall[0] = null, 'RECALL'],
    [p => { p.story.perspective = 'first-person'; p.story.povCharacterId = 'unknown'; }, 'POV'],
    [p => delete p.audio, 'AUDIO'],
    [p => p.audio.cues = [], 'AUDIO'],
    [p => { p.audio.mode = 'silent'; p.audio.cues = []; p.audio.silentReason = '字幕足够'; }, 'AUDIO'],
    [p => p.audio.cues[0].speakerId = 'ghost', 'VOICE'],
    [p => p.audio.cues[0].delivery = '', 'VOICE'],
    [p => p.audio.cues[0].text = '这句话明显太长'.repeat(30), 'PACE'],
    [p => p.audio.cues[1].start = 0.5, 'AUDIO_TIME'],
    [p => p.audio.cues.at(-1).end = 31, 'AUDIO_TIME'],
    [p => p.audio.cues[0].start = -1, 'AUDIO_TIME'],
    [p => p.audio.cues[0].end = Infinity, 'AUDIO_TIME'],
    [p => p.audio.cues[0] = null, 'AUDIO_TIME'],
  ];
  for (const [mutate, prefix] of cases) {
    const plan = yoga(); mutate(plan);
    assert.ok(checkStoryProloguePlan(plan).some(e => e.startsWith(prefix)), prefix);
    assert.throws(() => compileProloguePlan(plan, true), undefined, prefix);
  }
  for (const value of [null, {}, [], { version:2, story:[] }]) assert.ok(checkStoryProloguePlan(value).length);
});
test('historical visual-only plans remain readable but are not new-production plans', () => {
  const old = read('prologue-plan.example.json');
  assert.deepEqual(checkProloguePlan(old), []);
  assert.ok(checkStoryProloguePlan(old).length);
  assert.throws(() => compileProloguePlan(old, true));
  assert.equal(compileProloguePlan(old).totalSeconds, 20);
});
test('offline CLI requires story by default; legacy mode is explicit', () => {
  const run = (...args) => spawnSync(process.execPath, [path('scripts/prepare-prologue.mjs'), ...args], { encoding:'utf8' });
  const good = run(path('docs/prologue-story.example.json'));
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).submissionAuthorized, false);
  assert.equal(run(path('docs/prologue-first-person.example.json'), '--story').status, 0);
  assert.equal(run(path('docs/prologue-plan.example.json')).status, 1);
  assert.equal(run(path('docs/prologue-plan.example.json'), '--legacy').status, 0);
  assert.equal(run(path('docs/prologue-story.example.json'), '--legacy', '--story').status, 1);
  assert.equal(run().status, 1);
});
test('retired hardcoded generators reject submit before any journal write or network request', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'xgen-prologue-no-submit-'));
  for (const script of ['generate-prologue-pilot.mjs', 'generate-prologue-v2.mjs']) {
    const result = spawnSync(process.execPath, [path(`scripts/${script}`), 'submit'], {
      cwd, encoding:'utf8', env:{ PATH:process.env.PATH }, timeout:3000,
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /旧硬编码试拍脚本已停用新提交/);
    assert.deepEqual(readdirSync(cwd), []);
  }
});
