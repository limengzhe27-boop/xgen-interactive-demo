#!/usr/bin/env node
/**
 * Standard Tool for Pure Text-to-Video (T2V) Native-Audio Prologue Generation.
 * 
 * Enforces the 2026-09-14 battle-tested standard:
 * 1. Pure T2V (No reference face image to avoid PrivacyInformation errors).
 * 2. Collegiate / young-adult compliance checks (warns on minor / campus keywords).
 * 3. Native audio parameter enforcement (Seedance 2.5 + generate_audio: true).
 * 4. Structured job persistence in work/prologues/<world>/<role>.json.
 * 
 * Usage:
 *   node scripts/generate-prologue-t2v.mjs submit --world <id> --role <roleId> --prompt <text|file> [--duration 15] [--ratio 16:9]
 *   node scripts/generate-prologue-t2v.mjs status --world <id> --role <roleId>
 *   node scripts/generate-prologue-t2v.mjs collect --world <id> --role <roleId> [--dest <path>]
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { companyFetch, companyAssetUrl } from '../lib/company-gateway.ts';
import { videoResult } from '../lib/media-policy.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// High-risk compliance keywords that trigger domestic content moderation
const SENSITIVE_KEYWORDS = ['高三', '早恋', '同班女友', '要挟老师', '改分', '未成年', '打架斗殴'];

function parseArgs() {
  const args = process.argv.slice(2);
  const action = args[0];
  if (!['submit', 'status', 'collect', 'help'].includes(action)) {
    console.error('Usage: node scripts/generate-prologue-t2v.mjs <submit|status|collect> [options]');
    process.exit(1);
  }

  const options = { action };
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

async function loadPrompt(promptArg) {
  if (!promptArg) throw new Error('--prompt is required for submit');
  try {
    // Check if it is a file path
    const content = await readFile(promptArg, 'utf8');
    return content.trim();
  } catch {
    // Treat as raw text
    return promptArg.trim();
  }
}

async function main() {
  const options = parseArgs();
  if (options.action === 'help') {
    console.log(`
Pure T2V Native-Audio Video Generation CLI
Commands:
  submit   Submit a new T2V generation task to Seedance 2.5
  status   Query current generation task status
  collect  Download and verify completed MP4 video asset

Options:
  --world <id>        World ID (e.g. after-class, storm-manor) [Required]
  --role <roleId>     Role identifier (e.g. zhou, lin, player) [Required]
  --prompt <str|path> Prompt string or prompt text file path
  --duration <sec>    Video duration (default: 15)
  --ratio <ratio>     Aspect ratio (default: 16:9)
  --dest <path>       Destination MP4 file path for collect
`);
    return;
  }

  const { world, role } = options;
  if (!world || !role) {
    console.error('Error: Both --world and --role are required.');
    process.exit(1);
  }

  const jobDir = path.join(ROOT_DIR, 'work/prologues', world);
  await mkdir(jobDir, { recursive: true });
  const jobFile = path.join(jobDir, `${role}-t2v-job.json`);

  let job = null;
  try {
    job = JSON.parse(await readFile(jobFile, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  if (options.action === 'submit') {
    if (job && (job.status === 'queued' || job.status === 'running')) {
      console.log(`[Notice] Task already in progress (ID: ${job.id}, status: ${job.status}). Use 'status' or 'collect'.`);
      return;
    }

    const rawPrompt = await loadPrompt(options.prompt);
    
    // Safety check: Warn about domestic compliance trigger words
    const violations = SENSITIVE_KEYWORDS.filter(k => rawPrompt.includes(k));
    if (violations.length > 0) {
      console.warn(`[WARNING] Prompt contains sensitive keywords: [${violations.join(', ')}]!`);
      console.warn(`Please remap them to collegiate / young-adult context per references/t2v-and-safety-playbook.md.`);
    }

    const duration = Number(options.duration || 15);
    const ratio = options.ratio || '16:9';
    const model = 'doubao-seedance-2-5-260628';

    const payload = {
      model,
      prompt: rawPrompt,
      metadata: {
        generate_audio: true,
        duration,
        ratio,
        resolution: '720p',
        watermark: false
      }
    };

    console.log(`[Submit] Submitting T2V job to ${model} (duration: ${duration}s, audio: true)...`);
    const res = await companyFetch('/videos', payload, 55000);
    const body = await res.json();

    if (!res.ok) {
      console.error(`[Failed] Gateway returned HTTP ${res.status}:`, body);
      const failedJob = {
        world,
        role,
        status: 'failed',
        error: String(body.error?.message || body.message || 'Submission rejected'),
        attemptedAt: new Date().toISOString(),
        prompt: rawPrompt
      };
      await writeFile(jobFile, JSON.stringify(failedJob, null, 2));
      process.exit(1);
    }

    const id = body.id || body.task_id;
    if (!id || typeof id !== 'string') {
      throw new Error(`Uncertain task id from gateway: ${JSON.stringify(body)}`);
    }

    job = {
      world,
      role,
      id,
      status: 'queued',
      model,
      duration,
      ratio,
      prompt: rawPrompt,
      submittedAt: new Date().toISOString()
    };
    await writeFile(jobFile, JSON.stringify(job, null, 2));
    console.log(`[Success] Task submitted! Task ID: ${id}`);
    console.log(`Saved job record to ${jobFile}`);
  }

  if (options.action === 'status') {
    if (!job || !job.id) {
      console.error(`[Error] No active job found for ${world}/${role}. Submit first.`);
      process.exit(1);
    }

    console.log(`[Status] Querying task ${job.id}...`);
    const res = await companyFetch(`/videos/${job.id}`, undefined, 25000);
    if (!res.ok) {
      console.error(`[Error] Failed to query status: HTTP ${res.status}`);
      process.exit(1);
    }

    const body = await res.json();
    const result = videoResult(body);
    job.status = result.status;
    job.lastCheckedAt = new Date().toISOString();
    if (result.status === 'ready' && result.url) {
      job.url = result.url;
    }
    if (result.status === 'failed') {
      job.error = String(body.error?.message || body.message || 'Generation failed');
    }
    await writeFile(jobFile, JSON.stringify(job, null, 2));
    console.log(`Task ${job.id} is currently: ${job.status}`);
    if (job.status === 'ready') {
      console.log(`Video ready! Run 'collect' to download.`);
    }
  }

  if (options.action === 'collect') {
    if (!job || !job.id) {
      console.error(`[Error] No job found for ${world}/${role}.`);
      process.exit(1);
    }

    if (job.status !== 'ready') {
      console.log(`[Collect] Job status is '${job.status}'. Querying latest status...`);
      const res = await companyFetch(`/videos/${job.id}`, undefined, 25000);
      if (res.ok) {
        const body = await res.json();
        const result = videoResult(body);
        job.status = result.status;
        if (result.url) job.url = result.url;
      }
    }

    if (job.status !== 'ready' || !job.url) {
      console.log(`[Wait] Video is not ready yet (status: ${job.status}). Please try again in 30s.`);
      await writeFile(jobFile, JSON.stringify(job, null, 2));
      return;
    }

    const defaultDest = path.join(ROOT_DIR, 'public/assets', `${world}-v1`, `${role}-prologue.mp4`);
    const destPath = options.dest ? path.resolve(options.dest) : defaultDest;
    await mkdir(path.dirname(destPath), { recursive: true });

    console.log(`[Download] Downloading video from asset URL...`);
    const downloadRes = await fetch(companyAssetUrl(job.url), {
      redirect: 'error',
      signal: AbortSignal.timeout(60000)
    });

    if (!downloadRes.ok) {
      throw new Error(`Failed to download video: HTTP ${downloadRes.status}`);
    }

    const buffer = Buffer.from(await downloadRes.arrayBuffer());
    if (buffer.length < 1024 || buffer.subarray(4, 8).toString() !== 'ftyp') {
      throw new Error('Downloaded file is not a valid MP4');
    }

    await writeFile(destPath, buffer);
    job.collectedAt = new Date().toISOString();
    job.savedPath = destPath;
    job.bytes = buffer.length;
    await writeFile(jobFile, JSON.stringify(job, null, 2));

    console.log(`[Success] Video downloaded (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)!`);
    console.log(`Saved to: ${destPath}`);
  }
}

main().catch(err => {
  console.error('[Fatal Error]', err.message);
  process.exit(1);
});
