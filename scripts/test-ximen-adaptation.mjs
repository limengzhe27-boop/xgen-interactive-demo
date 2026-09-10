import test from 'node:test';
import assert from 'node:assert/strict';
import { studioWorlds, getRoleOpening } from '../lib/studio-worlds.ts';
import { HOME_EDITORIAL } from '../lib/home-editorial.ts';
const entry=studioWorlds.find(w=>w.id==='ximen-red-ledger');
test('chapter nine characters and separate locations replace the invented visitor plot',()=>{
  assert.deepEqual(entry.world.characters.map(c=>c.name),['潘金莲','西门庆','吴月娘']);
  assert.match(entry.artNote,/第九回/);
  assert.match(entry.world.characters[0].identity,/第五房/);
  assert.match(entry.world.characters[2].identity,/正妻/);
  assert.notEqual(entry.world.characters[1].startLocationId,entry.world.openingScene.locationId);
  assert.doesNotMatch(getRoleOpening(entry,'r2'),/鞋脚还未递出/);
  assert.doesNotMatch(JSON.stringify(entry),/沈青棠|撞期邀约|同款红绸/);
  assert.ok(entry.world.rules.some(rule=>rule.description.includes('不是逐字复演')));
});
test('third featured item changes, spider remains available and covers agree',()=>{
  assert.equal(HOME_EDITORIAL[2].key,'world:ximen-red-ledger');
  assert.ok(studioWorlds.some(w=>w.id==='spider-under-table'));
  assert.equal(entry.cover,'/assets/expansion/ximen-red-ledger/cover-v2.webp');
});
