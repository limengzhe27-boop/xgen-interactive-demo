// Deterministic export only: four-panel artwork is generated with GPT first.
// This script crops the intentionally separate panels and compresses WebP.
import { mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { expansionSeeds } from '../lib/expansion-worlds.ts';

const source = process.argv[2];
if (!source || !path.isAbsolute(source)) throw new Error('Pass an absolute generated-art directory');
const output = fileURLToPath(new URL('../public/assets/expansion/', import.meta.url));
let installed=0;
for (const seed of expansionSeeds) {
  if (!/^[a-z0-9-]+$/.test(seed.id)) throw new Error('invalid_world_id');
  const input=path.join(source,`${seed.id}.png`);
  try { await access(input); } catch { console.log('pending',seed.id); continue; }
  const meta=await sharp(input).metadata();
  if (!meta.width || !meta.height || Math.abs(meta.width-meta.height)>2 || meta.width<1000) throw new Error('unexpected_artboard:'+seed.id);
  const width=Math.floor(meta.width/2),height=Math.floor(meta.height/2);
  const dir=path.join(output,seed.id); await mkdir(dir,{recursive:true});
  for(const [name,left,top] of [['cover',0,0],['r1',width,0],['r2',0,height],['r3',width,height]]) {
    await sharp(input).extract({left,top,width,height}).webp({quality:88,effort:5}).toFile(path.join(dir,name+'.webp'));
  }
  installed++; console.log('installed',seed.id);
}
const extra=path.join(source,'pilgrimage-extra.png');
try {
  const meta=await sharp(extra).metadata();const width=Math.floor(meta.width/2),height=Math.floor(meta.height/2);
  for(const [name,left,top] of [['r4',width,0],['r5',0,height]]) await sharp(extra).extract({left,top,width,height}).webp({quality:88,effort:5}).toFile(path.join(output,'pilgrimage-five-secrets',name+'.webp'));
} catch(error) { if(error.message.includes('Input file is missing')) console.log('pending pilgrimage-extra');else throw error; }
console.log('worlds installed:',installed,'/',expansionSeeds.length);
