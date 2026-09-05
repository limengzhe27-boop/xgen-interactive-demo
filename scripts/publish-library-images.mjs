// Publish ONLY these already-public built-in assets. Never scans drafts or user files.
// Run with: node --env-file=.env.local scripts/publish-library-images.mjs
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compressImage, imageId, claimImage, saveImage } from '../lib/server-image-store.ts';
const names = ['contract-cover', 'contract-su', 'contract-gu', 'contract-shen', 'workplace-cover', 'workplace-lin', 'workplace-zhou', 'workplace-tang', 'inheritance-cover', 'inheritance-xu', 'inheritance-he', 'inheritance-lu'];
const manifest = {};
for (const name of names) {
  const buffer = await compressImage(await readFile(new URL(`../public/assets/${name}.jpg`, import.meta.url)));
  const id = imageId(['published-library', createHash('sha256').update(buffer).digest('hex')]);
  // Separate importer identities; imports count conservatively against the global daily allowance.
  const owner = imageId(['library-import', name]);
  const claim = await claimImage(id, owner, 'static-import', 'world-public');
  if (claim.status === 'claimed') await saveImage(id, buffer, 'world-public');
  else if (claim.status !== 'ready') throw new Error(`Library import stopped: ${claim.status}`);
  const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/world-public/${id}.webp`;
  const r = await fetch(url);
  if (!r.ok || r.headers.get('content-type') !== 'image/webp') throw new Error('Public read verification failed');
  manifest[`/assets/${name}.jpg`] = id;
}
// Public content IDs only. Apply this manifest to lib/public-image-manifest.json after verification.
console.log(JSON.stringify(manifest, null, 2));
