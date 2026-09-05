// Server-only transfer through child stdin. Never print secret values or child error bodies.
import { spawnSync } from 'node:child_process';
for (const name of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'IMAGE_SESSION_SECRET']) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  const result = spawnSync('/opt/homebrew/bin/vercel', ['env', 'add', name, 'production', '--force'], {
    input: value, encoding: 'utf8', timeout: 60000,
  });
  if (result.status !== 0) throw new Error(`Vercel configuration failed for ${name}; inspect configuration status before retrying.`);
  console.log(`${name}: configured for production`);
}
