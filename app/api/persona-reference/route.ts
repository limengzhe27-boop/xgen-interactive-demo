import { requestAccount, sameOrigin } from '@/lib/server-auth';
import { referenceQuery } from '@/lib/persona-reference';
import { searchCharacterReferences, completeCharacterReference } from '@/lib/persona-reference-server';
export const maxDuration = 60;
const windows = new Map<string, { since: number; count: number }>();
const busy = new Set<string>();
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'origin_not_allowed' }, { status: 403 });
  try {
    const account = await requestAccount(request, true);
    const reply = (body: unknown, status = 200) => account.finish(Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } }));
    if (!account.id) return reply({ error: 'login_required' }, 401);
    const raw = await request.text(); if (raw.length > 1000) return reply({ error: 'invalid_request' }, 400);
    let body; try { body = JSON.parse(raw); } catch { return reply({ error: 'invalid_request' }, 400); }
    if (!body || !['search', 'complete'].includes(body.action) || (body.action === 'search' ? !referenceQuery(body.query) : typeof body.id !== 'string' || !/^(official:boa-hancock|wiki:\d{1,10})$/.test(body.id) || typeof body.spoilerSafe !== 'boolean')) return reply({ error: 'invalid_request' }, 400);
    const key = account.id, now = Date.now();
    for (const [id, window] of windows) if (now - window.since > 60_000) windows.delete(id);
    const window = windows.get(key) || { since: now, count: 0 };
    if (busy.has(key) || window.count >= 6 || windows.size > 500) return reply({ error: 'reference_rate_limited' }, 429);
    window.count++; windows.set(key, window); busy.add(key);
    try { return reply(body.action === 'search' ? { candidates: await searchCharacterReferences(referenceQuery(body.query)!) } : await completeCharacterReference(body.id, body.spoilerSafe)); }
    catch (error) { const code = error instanceof Error ? error.message : ''; return reply({ error: ['reference_not_found', 'reference_insufficient', 'model_rate_limited'].includes(code) ? code : 'reference_unavailable' }, 502); }
    finally { busy.delete(key); }
  } catch { return Response.json({ error: 'account_changed_or_unavailable' }, { status: 409, headers: { 'Cache-Control': 'no-store' } }); }
}
