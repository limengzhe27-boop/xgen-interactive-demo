import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { imageOwner, imageId, compressImage, boundedImageDownload } from '../lib/server-image-store.ts';

test('private image ownership requires a valid signature and cannot be forged', () => {
  process.env.IMAGE_SESSION_SECRET = 'synthetic-test-secret';
  const owner = imageOwner(new Request('https://example.test/api/image'), true);
  assert.match(owner.cookie, /HttpOnly; SameSite=Lax/);
  assert.match(owner.cookie, /Secure/);
  assert.equal(imageOwner(new Request('https://example.test/', { headers: { cookie: owner.cookie } })).id, owner.id);
  assert.equal(imageOwner(new Request('https://example.test/')), null);
  assert.equal(imageOwner(new Request('https://example.test/', { headers: { cookie: owner.cookie.replace(owner.id, 'a'.repeat(64)) } })), null);
});
test('content identity reuses identical requests and isolates device, seed and model', () => {
  const parts = ['owner-a', 'scene', 'economy', '1024x576', 3, 'fictional courtyard'];
  assert.equal(imageId(parts), imageId([...parts]));
  for (const index of [0, 2, 4, 5]) {
    const changed = [...parts]; changed[index] = 'different';
    assert.notEqual(imageId(parts), imageId(changed));
  }
});
test('images become bounded WebP and invalid inputs are rejected', async () => {
  const png = await sharp({ create: { width: 1800, height: 1000, channels: 3, background: '#334455' } }).png().toBuffer();
  const result = await compressImage(png);
  const info = await sharp(result).metadata();
  assert.equal(info.format, 'webp'); assert.equal(info.width, 1280);
  assert.ok(result.length < png.length);
  await assert.rejects(compressImage(Buffer.from('not an image')));
  await assert.rejects(compressImage(Buffer.alloc(8_000_001)));
});
test('downloads stop at the byte limit even without Content-Length', async () => {
  const original = globalThis.fetch; let cancelled = false;
  globalThis.fetch = async () => new Response(new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(1_000_000)); }, cancel() { cancelled = true; } }));
  try {
    await assert.rejects(boundedImageDownload('https://example.test/image', AbortSignal.timeout(5000)), /image_too_large/);
    assert.equal(cancelled, true);
  } finally { globalThis.fetch = original; }
});
