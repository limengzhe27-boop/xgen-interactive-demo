import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
test('storage enforces account uniqueness and keeps identities private', () => {
  const sql = read('supabase/migrations/202609110001_play_counts.sql');
  assert.match(sql, /primary key \(target, account_id\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all.*from public, anon, authenticated/);
  assert.match(sql, /on delete cascade/);
});
test('write verifies server session, scope, origin and public target', () => {
  const route = read('app/api/play-counts/route.ts');
  for (const guard of ['sameOrigin(request)', 'requestAccount(request, true)', '!account.id', '(await targets()).has(target)', 'resolution=ignore-duplicates']) assert.ok(route.includes(guard));
  assert.ok(!route.includes('body.account'));
});
test('no fabricated fallback and all experience paths are connected', () => {
  const home = read('components/studio-home.tsx');
  assert.ok(!home.includes('demoPlayCount'));
  assert.match(home, /counts\[itemKey\(item\)\] !== undefined/);
  assert.match(read('components/character-chat.tsx'), /useRecordPlay\(session.turns.length/);
  assert.match(read('components/video-explorer.tsx'), /useRecordPlay\(session.rounds > 0/);
  assert.match(read('app/page.tsx'), /view === 'play' && <RecordPlay/);
});
