import test from 'node:test';
import assert from 'node:assert/strict';
import { appOrigin, sameOrigin, authConfigured } from '../lib/server-auth.ts';
test('login redirects accept only known app hosts, never attacker-controlled forwarded hosts', () => {
  const request = (host, forwarded) => new Request('http://localhost:3102/auth/login', { headers: { host, 'x-forwarded-host': forwarded || 'attacker.example' } });
  assert.equal(appOrigin(request('xgen-interactive-demo.vercel.app')), 'https://xgen-interactive-demo.vercel.app');
  assert.equal(appOrigin(request('localhost:3102')), 'http://localhost:3102');
  assert.throws(() => appOrigin(request('attacker.example')));
});
test('publication writes reject missing, malformed and foreign origins', () => {
  const req = (origin) => new Request('https://xgen-interactive-demo.vercel.app/api/worlds', { headers: origin ? { origin } : {} });
  assert.equal(sameOrigin(req()), false);
  assert.equal(sameOrigin(req('null')), false);
  assert.equal(sameOrigin(req('https://attacker.example')), false);
  assert.equal(sameOrigin(req('https://xgen-interactive-demo.vercel.app')), true);
});
test('auth stays disabled until a provider and publishable key are intentionally configured', () => {
  delete process.env.AUTH_PROVIDER; delete process.env.SUPABASE_PUBLISHABLE_KEY;
  assert.equal(authConfigured(), false);
});
