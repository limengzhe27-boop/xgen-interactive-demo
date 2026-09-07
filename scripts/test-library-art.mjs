import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { libraryArt, libraryArtPaths } from '../lib/library-art.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';

test('12 public worlds have 47 dedicated static assets and two explicit reference fallbacks', async () => {
  assert.equal(Object.keys(libraryArt).length, 12);
  assert.equal(libraryArtPaths.size, 47);
  for (const [id, art] of Object.entries(libraryArt)) {
    const world = studioWorlds.find(entry => entry.id === id);
    assert.ok(world, id);
    if (art.cover) assert.equal(world.cover, art.cover);
    if (id !== 'monkey-pirate-avengers') {
      assert.deepEqual(Object.keys(art.portraits).sort(), world.world.characters.map(role => role.id).sort());
      assert.ok(!world.artNote?.includes('参考图'));
    } else assert.match(world.artNote, /封面与托尼暂用参考图/);
    for (const [role, path] of Object.entries(art.portraits)) assert.equal(world.portraits[role], path);
    for (const path of [...(art.cover ? [art.cover] : []), ...Object.values(art.portraits)]) {
      assert.match(path, /^\/assets\/library-v1\/[a-z-]+\.webp$/);
      const file = new URL('../public' + path, import.meta.url);
      assert.ok((await stat(file)).size > 1000, path);
      const metadata = await sharp(fileURLToPath(file)).metadata();
      assert.equal(metadata.format, 'webp');
      assert.ok(metadata.width >= 512 && metadata.height >= 512, path);
    }
  }
  assert.match(studioWorlds.find(w => w.id === 'monkey-pirate-avengers').artNote, /非官方同人/);
});

test('publication allowlist rejects arbitrary local paths', () => {
  assert.equal(libraryArtPaths.has('/assets/library-v1/missing.webp'), false);
  assert.equal(libraryArtPaths.has('/assets/library-v1/../../private.webp'), false);
  assert.equal(libraryArtPaths.has('https://example.test/private.webp'), false);
});
