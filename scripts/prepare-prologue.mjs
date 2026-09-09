// No network, generation, credentials, or paid side effects.
import { readFile } from 'node:fs/promises';
import { compileProloguePlan } from '../lib/prologue-plan.ts';
import { compileDirectedProloguePlan } from '../lib/prologue-direction.ts';
try {
  if (!process.argv[2]) throw Error('用法: node scripts/prepare-prologue.mjs <plan.json> --direction <direction.json>；故事草案用 --story，历史旧计划用 --legacy');
  const raw = await readFile(process.argv[2], 'utf8');
  if (raw.length > 100000) throw Error('计划过大，请拆成单个序章');
  const args = process.argv.slice(3);
  if (args[0] === '--direction') {
    if (args.length !== 2 || !args[1] || args[1].startsWith('--')) throw Error('表演层需要单个JSON路径，不能混用预检模式');
    const detail = await readFile(args[1], 'utf8');
    if (detail.length > 100000) throw Error('表演层过大，请拆成单个序章');
    console.log(JSON.stringify(compileDirectedProloguePlan(JSON.parse(raw), JSON.parse(detail)), null, 2));
  } else {
    if (args.length > 1 || args.some(arg => !['--story', '--legacy'].includes(arg))) throw Error('无效预检选项');
    console.log(JSON.stringify(compileProloguePlan(JSON.parse(raw), !args.includes('--legacy')), null, 2));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
