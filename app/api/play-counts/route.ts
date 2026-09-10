import { requestAccount, sameOrigin } from '@/lib/server-auth';
import { storageFetch } from '@/lib/server-image-store';
import { studioWorlds } from '@/lib/studio-worlds';

export const runtime = 'nodejs';
export const maxDuration = 30;
type CatalogEntry = { id: string; world: { characters: { id: string }[] } };
async function targets() {
  const keys = new Set(['world:storm-manor', 'world:sea-train', 'world:sixth-roommate']);
  const add = (entry: CatalogEntry) => {
    keys.add(`world:${entry.id}`);
    for (const role of entry.world.characters) keys.add(`character:${entry.id}:${role.id}`);
  };
  studioWorlds.forEach(add);
  const response = await storageFetch('/rest/v1/demo_world_publications?published=eq.true&select=document&limit=200');
  const rows = await response.json() as { document: CatalogEntry }[];
  for (const row of rows) add(row.document);
  return keys;
}
export async function GET() {
  try {
    const [allowed, response] = await Promise.all([targets(), storageFetch('/rest/v1/rpc/demo_play_counts', { method: 'POST' })]);
    const counts: Record<string, number> = Object.fromEntries([...allowed].map(key => [key, 0]));
    for (const row of await response.json() as { target: string; players: number }[]) {
      if (allowed.has(row.target)) counts[row.target] = Number(row.players);
    }
    return Response.json({ counts, basis: 'unique_signed_in_accounts' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // No demo values or false zeros when storage is unavailable.
    return Response.json({ error: 'counts_unavailable' }, { status: 503 });
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'invalid_origin' }, { status: 403 });
  try {
    const account = await requestAccount(request, true);
    if (!account.id) return account.finish(Response.json({ error: 'sign_in_required' }, { status: 401 }));
    const text = await request.text();
    if (text.length > 500) return account.finish(Response.json({ error: 'invalid_target' }, { status: 400 }));
    const { target } = JSON.parse(text) as { target?: unknown };
    if (typeof target !== 'string' || target.length > 240 || !(await targets()).has(target)) {
      return account.finish(Response.json({ error: 'invalid_target' }, { status: 400 }));
    }
    await storageFetch('/rest/v1/demo_play_accounts?on_conflict=target,account_id', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ target, account_id: account.id }),
    });
    return account.finish(Response.json({ recorded: true }));
  } catch {
    return Response.json({ error: 'count_not_recorded' }, { status: 503 });
  }
}
