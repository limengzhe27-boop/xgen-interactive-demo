import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_CATEGORIES, DISCOVERY_CHANNELS, discoveryCategory, isMemeScene, matchesDiscovery, validDiscoveryGenre } from '../lib/discovery-category.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';
import { publicationWorld } from '../lib/publication.ts';
import { publicationDraft } from '../lib/restore-publication.ts';
import { WORLD_INVITATIONS, editorialCopy } from '../lib/home-editorial.ts';
import { creatorChanges, applyCreatorChange } from '../lib/creator-changes.ts';
test('fixed channels cover all built-ins without one channel per story', () => {
  assert.equal(DISCOVERY_CHANNELS.length, 10);
  for (const item of studioWorlds) assert.ok(STORY_CATEGORIES.includes(discoveryCategory(item)), item.id);
  assert.equal(discoveryCategory(studioWorlds.find(w => w.id === 'peach-source')), '知识体验');
  assert.equal(isMemeScene(studioWorlds.find(w => w.id === 'conquest-watermelon')), true);
  assert.equal(isMemeScene(studioWorlds.find(w => w.id === 'ascension-work-number')), false);
});
test('new works use accepted metadata, not title keyword coincidences', () => {
  const item = {id: 'new', title: '皇帝在片场', genre: '我的创作', world: { discoveryGenre: '轻松搞笑 · 热梗名场面' }};
  assert.ok(matchesDiscovery(item, '热梗名场面'));
  assert.ok(matchesDiscovery(item, '轻松搞笑'));
  assert.ok(!matchesDiscovery(item, '古风历史'));
  item.world.discoveryGenre = '都市情感';
  assert.ok(!isMemeScene(item));
  assert.equal(discoveryCategory({title: '悬疑仙侠世界', genre:'我的创作'}), '待分类');
  assert.ok(!validDiscoveryGenre('爆款新栏目'));
});
test('accepted category survives public serialization and draft restoration; old worlds still work', () => {
  const entry = studioWorlds[0];
  const world = publicationWorld({...entry.world, discoveryGenre:'古风历史 · 热梗名场面', privateChat:'not public'});
  assert.equal(world.privateChat, undefined);
  assert.equal(world.discoveryGenre, '古风历史 · 热梗名场面');
  assert.equal(publicationDraft({...entry, world}).data.creatorBrief.discoveryGenre, world.discoveryGenre);
  assert.ok(publicationWorld(entry.world));
  assert.throws(() => publicationWorld({...entry.world, discoveryGenre:'自造栏目'}));
});
test('classification proposal respects later manual changes and undo', () => {
  const before={discoveryGenre:'古风历史'};
  const [change]=creatorChanges(before,{discoveryGenre:'轻松搞笑'},{discoveryGenre:'剧情分类'});
  const accepted=applyCreatorChange(before, change);
  assert.equal(accepted.discoveryGenre,'轻松搞笑');
  assert.deepEqual(applyCreatorChange(accepted,change,true), before);
  assert.equal(applyCreatorChange({discoveryGenre:'知识体验'},change),null);
});
test('reviewed title targets exist and detail title agrees with discovery card', () => {
  for(const key of Object.keys(WORLD_INVITATIONS)) {
    const world=studioWorlds.find(w=>w.id===key.slice(6));
    assert.ok(world,key);
    assert.equal(world.title,editorialCopy(key).title);
    assert.equal(world.world.title,world.title);
  }
});
