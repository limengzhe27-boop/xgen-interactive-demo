// Explicit opt-in only: creates two temporary real test accounts and a public
// fixture. Finally unpublishes only this run's work and bans its test accounts.
// Credentials stay in memory. No AI/media generation and no user's data is read.
import env from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { studioWorlds } from '../lib/studio-worlds.ts';
import { publicationWorld } from '../lib/publication.ts';
import { appendStory } from '../lib/story-continuation.ts';
import { storyUpgrade, applyStoryUpgrade } from '../lib/story-upgrade.ts';
import { createInitialWorldState } from '../lib/world-state.ts';
import { directConversationEntry } from '../lib/studio-session.ts';
import { historicalPublicationDraft } from '../lib/restore-publication.ts';

if (!process.argv.includes('--run-production')) throw Error('Explicit --run-production and user authorization required');
env.loadEnvConfig(process.cwd());
const base = 'https://xgen-interactive-demo.vercel.app';
const supabase = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const admin = createClient(supabase, key, { auth: { persistSession: false, autoRefreshToken: false } });
const users = [];
let step = 'configuration';
const pass = label => console.log('PASS', label);
async function account(label) {
  const email = `xgen-check-${randomUUID()}@example.com`, password = randomUUID() + randomUUID();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: '临时发布验证', purpose: 'publication-check' } });
  if (created.error || !created.data.user) throw Error('test_account_creation_failed');
  const user = { id: created.data.user.id, label, cookies: new Map() }; users.push(user);
  console.log('TEST_ACCOUNT', label, user.id);
  const client = createServerClient(supabase, process.env.SUPABASE_PUBLISHABLE_KEY, { cookies: {
    getAll: () => [...user.cookies].map(([name, value]) => ({ name, value })),
    setAll: values => values.forEach(({ name, value }) => user.cookies.set(name, value)),
  } });
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw Error('test_sign_in_failed');
  return user;
}
async function call(user, path, method = 'GET', body, expected = 200) {
  const headers = { origin: base, 'Content-Type': 'application/json', 'x-xgen-account': user?.id ?? 'guest' };
  if (user) headers.cookie = [...user.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  const response = await fetch(base + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  if (response.status !== expected) throw Error(`http_${response.status}_expected_${expected}`);
  return response.json();
}
try {
  const config = await call(null, '/api/account');
  assert.equal(config.canPublish, true);
  step = 'real account sessions';
  const a = await account('author'), b = await account('reader');
  assert.equal((await call(a, '/api/account')).user.id, a.id);
  assert.equal((await call(b, '/api/account')).user.id, b.id); pass(step);
  step = 'publish and discover';
  const world = publicationWorld(structuredClone(studioWorlds[0].world));
  world.title = '临时功能验证·请勿游玩';
  const sourceId = randomUUID(), consent = 'publish-world-and-selected-images-v1';
  const payload = { world, sourceId, consent, memories: ['PRIVATE_TEST_MARKER'], chat: ['PRIVATE_TEST_MARKER'] };
  const published = (await call(a, '/api/worlds', 'POST', payload)).world;
  const id = published.id.slice(10); console.log('TEST_PUBLICATION', id);
  const found = (await call(b, '/api/worlds')).worlds.find(item => item.id === published.id);
  assert.ok(found); assert.ok(!JSON.stringify(found).includes('PRIVATE_TEST_MARKER')); assert.equal(found.sourceId, undefined);
  const role = found.world.characters[0];
  const encounter = directConversationEntry(found, role.id);
  assert.ok(encounter.world.characters.some(item => item.id === role.id));
  const state = createInitialWorldState('draft', role.id, '', found.world.locations[0].name);
  state.turn = 3; state.clock = '12:10'; pass(step);
  step = 'reader isolation and update inbox';
  assert.equal((await call(b, '/api/worlds?mine=true')).publications.length, 0);
  await call(b, `/api/worlds/updates?id=${id}&edition=1`, 'GET', undefined, 404);
  const own = (await call(a, '/api/worlds?mine=true')).publications.find(item => item.id === id);
  await call(b, '/api/worlds', 'PATCH', { id, updatedAt: own.updated_at, published: false }, 409);
  await call(b, '/api/worlds/updates', 'POST', { id: published.id });
  await call(b, '/api/worlds/updates', 'POST', { id: published.id });
  const inbox = (await call(a, '/api/worlds/updates')).inbox.find(item => item.publication_id === id);
  assert.equal(Number(inbox.requests), 1); pass(step);
  step = 'append publish and preserve save';
  const proposal = structuredClone(world);
  proposal.tasks.push({ ...proposal.tasks[0], id: 'live-check-continuation', title: '后续功能验证', prerequisiteTaskIds: [proposal.tasks.at(-1).id] });
  const extended = appendStory(world, proposal);
  await call(a, '/api/worlds', 'POST', { ...payload, world: extended, expectedUpdatedAt: own.updated_at });
  await call(a, '/api/worlds', 'POST', { ...payload, expectedUpdatedAt: own.updated_at }, 409);
  const latest = (await call(b, '/api/worlds')).worlds.find(item => item.id === published.id);
  assert.equal(storyUpgrade(found, latest).addedTasks, 1);
  const updated = applyStoryUpgrade(found, latest, state);
  assert.equal(updated.turn, state.turn); assert.equal(updated.clock, state.clock);
  assert.deepEqual(updated.inventory, state.inventory); pass(step);
  step = 'historical draft and unpublish';
  const historical = (await call(a, `/api/worlds/updates?id=${id}&edition=1`)).edition;
  const draft = historicalPublicationDraft(historical.document, 1);
  assert.notEqual(draft.id, sourceId); assert.equal(draft.data.publishedWorld, false);
  assert.equal(draft.data.generatedWorld.tasks.length, world.tasks.length);
  const current = (await call(a, '/api/worlds?mine=true')).publications.find(item => item.id === id);
  await call(a, '/api/worlds', 'PATCH', { id, updatedAt: current.updated_at, published: false });
  assert.ok(!(await call(b, '/api/worlds')).worlds.some(item => item.id === published.id)); pass(step);
} catch (error) {
  // Do not dump assertions, request bodies or authentication responses.
  console.log('FAILED', step, error instanceof Error && /^http_/.test(error.message) ? error.message : 'check_failed');
  process.exitCode = 1;
} finally {
  for (const user of users) {
    try {
      if (user.label === 'author') {
        const response = await fetch(`${supabase}/rest/v1/demo_world_publications?owner_id=eq.${user.id}`, { method: 'PATCH', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ published: false }), signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw Error();
      }
      const result = await admin.auth.admin.updateUserById(user.id, { ban_duration: '876000h', password: randomUUID() + randomUUID() });
      if (result.error) throw Error();
      console.log('CLEANUP', user.label, 'unpublished_and_account_disabled');
    } catch { console.log('CLEANUP_REQUIRED', user.id); process.exitCode = 1; }
  }
}
