import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldGenerateImage, imageModelFor, DEFAULT_IMAGE_MODEL } from '../lib/image-policy.ts';
import { makeContentImageKey } from '../lib/image-cache.ts';
import { createInitialImageTask, startImageTask, finishImageTask } from '../lib/image-task.ts';

const directive = (reason, required = true) => ({ reason, required, sceneId: 'scene', prompt: '虚构庭院' });
test('existing openings and ordinary conversation make no automatic image request', () => {
  assert.equal(shouldGenerateImage(directive('opening'), 0, 0, true), false);
  assert.equal(shouldGenerateImage(directive('opening'), 0, 0, false), true);
  assert.equal(shouldGenerateImage(directive('opening'), 1, 0, false), false);
  assert.equal(shouldGenerateImage(directive('character_changed'), 10, 0), false);
  assert.equal(shouldGenerateImage(directive('reuse'), 10, 0), false);
});
test('important changes obey a three-turn interval, including after a failed attempt', () => {
  for (const reason of ['location_changed', 'major_event']) {
    assert.equal(shouldGenerateImage(directive(reason), 2, 0), false);
    assert.equal(shouldGenerateImage(directive(reason), 3, 0), true);
    assert.equal(shouldGenerateImage(directive(reason), 4, 3), false);
    assert.equal(shouldGenerateImage(directive(reason), 6, 3), true);
    assert.equal(shouldGenerateImage(directive(reason, false), 6, 3), false);
  }
});
test('routine and portrait models default to Turbo, with isolated operator overrides', () => {
  assert.equal(imageModelFor('scene', {}), DEFAULT_IMAGE_MODEL);
  assert.equal(imageModelFor('portrait', {}), DEFAULT_IMAGE_MODEL);
  const env = { SILICONFLOW_IMAGE_MODEL: 'legacy', SILICONFLOW_SCENE_MODEL: 'economy', SILICONFLOW_PORTRAIT_MODEL: 'portrait' };
  assert.equal(imageModelFor('scene', env), 'economy');
  assert.equal(imageModelFor('portrait', env), 'portrait');
  assert.equal(imageModelFor('scene', { SILICONFLOW_PORTRAIT_MODEL: 'premium' }), DEFAULT_IMAGE_MODEL);
});
test('art keys can reuse identical chat context without session or turn IDs while isolating identities', () => {
  const key = (...args) => makeContentImageKey('scene', ...args);
  assert.equal(key('world-A', 'player', 'target', 'prompt'), key('world-A', 'player', 'target', 'prompt'));
  assert.notEqual(key('world-A', 'player', 'target', 'prompt'), key('world-B', 'player', 'target', 'prompt'));
  assert.notEqual(key('world-A', 'player', 'target', 'prompt'), key('world-A', 'target', 'player', 'prompt'));
});

test('a failed replacement keeps the old persistent scene and never requests a premium retry', () => {
  const existing = { ...createInitialImageTask('data:image/png;base64,old'), cacheKey: 'old-key' };
  const pending = startImageTask(existing, directive('major_event'), 2);
  const failed = finishImageTask(pending, 2, { error: '生成失败' });
  assert.equal(failed.assetUrl, existing.assetUrl);
  assert.equal(failed.cacheKey, 'old-key');
  assert.equal(failed.status, 'fallback');
  assert.deepEqual(finishImageTask(pending, 1, { assetUrl: 'stale' }), pending);
});
