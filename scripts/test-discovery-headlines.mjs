import test from 'node:test';
import assert from 'node:assert/strict';
import { studioWorlds } from '../lib/studio-worlds.ts';
import { DISCOVERY_HEADLINES, LEGACY_DISCOVERY_HEADLINES, discoveryHeadline } from '../lib/discovery-headlines.ts';
import { characterHook, characterSearchText, validCardHook } from '../lib/character-card.ts';
import { creativeGuidance } from '../lib/creative-guidance.ts';
import { DISCOVERY_COPY_GUIDANCE } from '../lib/discovery-copy-guidance.ts';

test('every built-in world and character has explicit new copy with exact stable IDs', () => {
  assert.deepEqual(Object.keys(DISCOVERY_HEADLINES).sort(), studioWorlds.map(w => w.id).sort());
  const titles = [];
  for (const w of studioWorlds) {
    const entry = DISCOVERY_HEADLINES[w.id];
    assert.deepEqual(Object.keys(entry.characters).sort(), w.world.characters.map(c => c.id).sort());
    for (const title of [entry.world, ...Object.values(entry.characters)]) {
      assert.ok(title.trim()); assert.ok(validCardHook(title));
      titles.push(title);
    }
    assert.equal(discoveryHeadline('world:' + w.id).title, entry.world);
  }
  assert.equal(new Set(titles).size, titles.length, 'no duplicated universal fallback copy');
  assert.equal(discoveryHeadline('character:unknown:missing'), undefined);
});

test('name remains searchable when the visible invitation omits it; original fields remain untouched', () => {
  const c = { name: '李白', identity: '诗人', persona: '狂放', worldTitle: '原酒局', cardHook: undefined };
  const snapshot = JSON.stringify(c);
  const hook = discoveryHeadline('character:libai-moon-debt:r1').tagline;
  assert.ok(!hook.includes(c.name));
  const index = characterSearchText(c, hook, '今夜，谁买得起李白的沉默？');
  for (const q of ['李白', '原酒局', '沉默', hook]) assert.ok(index.includes(q));
  assert.equal(JSON.stringify(c), snapshot);
  assert.equal(characterHook('', hook), '');
  assert.equal(characterHook('我的手写标题', hook), '我的手写标题');
});

test('legacy worlds also receive a single headline without inventing character entries', () => {
  assert.deepEqual(Object.keys(LEGACY_DISCOVERY_HEADLINES).sort(), ['sea-train', 'sixth-roommate', 'storm-manor']);
  for (const [id, title] of Object.entries(LEGACY_DISCOVERY_HEADLINES)) {
    assert.equal(discoveryHeadline('world:' + id).title, title);
    assert.ok(validCardHook(title));
    assert.equal(discoveryHeadline('character:' + id + ':unknown'), undefined);
  }
});

test('creator uses the same source of headline guidance; normal conversations do not', () => {
  for (const op of ['co-create-world', 'generate-world']) assert.ok(creativeGuidance(op).includes(DISCOVERY_COPY_GUIDANCE));
  for (const op of ['advance-world', 'personal-agent', 'adapt-persona']) assert.ok(!creativeGuidance(op).includes(DISCOVERY_COPY_GUIDANCE));
});
