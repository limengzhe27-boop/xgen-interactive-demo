// No network, generation, credentials, or paid side effects.
import { readFile } from 'node:fs/promises';
import { compileProloguePlan } from '../lib/prologue-plan.ts';
try {
  if (!process.argv[2]) throw Error('用法: node scripts/prepare-prologue.mjs <plan.json> --story；仅查看历史旧计划可用 --legacy');
  const raw = await readFile(process.argv[2], 'utf8');
  if (raw.length > 100000) throw Error('计划过大，请拆成单个序章');
  if (process.argv.slice(3).some(arg => !['--story', '--legacy'].includes(arg)) || process.argv.includes('--story') && process.argv.includes('--legacy')) throw Error('无效预检选项');
  console.log(JSON.stringify(compileProloguePlan(JSON.parse(raw), !process.argv.includes('--legacy')), null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
