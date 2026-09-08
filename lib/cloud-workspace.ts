import { accountStorageKey } from './account-scope.ts';

export type CloudSnapshot = { version: 1; demo: string; studio: string; images: Record<string, string> };
export type CloudRecord = { revision: number; updatedAt: string | null; snapshot: CloudSnapshot | null };
export const SNAPSHOT_LIMIT = 2_000_000;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function readCloudSnapshot(value: unknown): CloudSnapshot {
  if (!record(value) || value.version !== 1 || typeof value.demo !== 'string' || typeof value.studio !== 'string' || !record(value.images)) throw new Error('invalid_snapshot');
  if (new TextEncoder().encode(JSON.stringify(value)).length > SNAPSHOT_LIMIT) throw new Error('snapshot_too_large');
  const demo = JSON.parse(value.demo), studio = JSON.parse(value.studio);
  if (!record(demo) || !Array.isArray(demo.memories) || !demo.memories.every(m => typeof m === 'string') || !Array.isArray(demo.draftRoles)
    || typeof demo.worldTitle !== 'string' || typeof demo.worldSeed !== 'string' || !record(studio) || studio.version !== 1
    || !Array.isArray(studio.documents) || !Array.isArray(studio.chats) || !Array.isArray(studio.runs) || typeof studio.draftId !== 'string') throw new Error('invalid_snapshot');
  if (demo.agentConversation !== undefined && (!Array.isArray(demo.agentConversation) || !demo.agentConversation.every(t => record(t) && ['user','assistant'].includes(String(t.role)) && typeof t.content === 'string'))) throw new Error('invalid_conversation');
  if (!studio.documents.every(d => record(d) && typeof d.id === 'string' && record(d.data) && typeof d.data.worldTitle === 'string' && typeof d.data.worldSeed === 'string' && Array.isArray(d.data.draftRoles))) throw new Error('invalid_documents');
  if (!studio.chats.every(c => {
    if (!record(c) || typeof c.id !== 'string' || !record(c.entry) || !record(c.entry.world) || !Array.isArray(c.entry.world.characters) || !record(c.state) || !record(c.state.characterStates) || !Array.isArray(c.turns)) return false;
    return c.playerRoleId !== c.targetCharacterId && [c.playerRoleId, c.targetCharacterId].every(id => c.entry && record(c.entry) && record(c.entry.world) && Array.isArray(c.entry.world.characters) && c.entry.world.characters.some(r => record(r) && r.id === id));
  })) throw new Error('invalid_chats');
  if (!studio.runs.every(r => record(r) && typeof r.id === 'string' && r.version === 1
    && ['storm', 'suggestion', 'draft'].includes(String(r.worldKind)) && ['playing', 'ending'].includes(String(r.status))
    && ['worldTitle', 'roleId', 'narrative', 'lastAction', 'endingDecision'].every(k => typeof r[k] === 'string')
    && ['surpriseLevel', 'turn', 'savedAt'].every(k => typeof r[k] === 'number')
    && (r.lastIncident === null || record(r.lastIncident)) && (r.imageCacheKey === undefined || typeof r.imageCacheKey === 'string')
    && (r.currentBeat === undefined || record(r.currentBeat)) && record(r.worldState)
    && typeof r.worldState.turn === 'number' && typeof r.worldState.clock === 'string' && typeof r.worldState.location === 'string'
    && Array.isArray(r.worldState.clues) && Array.isArray(r.worldState.inventory) && Array.isArray(r.worldState.eventLedger))) throw new Error('invalid_runs');
  const images: Record<string, string> = {};
  for (const [key, url] of Object.entries(value.images)) {
    if (!/^v2:(scene|portrait):[a-f0-9]+:[a-f0-9]+$/.test(key) || typeof url !== 'string' || !/^\/api\/image\/asset\/[a-f0-9]{64}$/.test(url)) throw new Error('invalid_image_reference');
    images[key] = url;
  }
  return { version: 1, demo: value.demo, studio: value.studio, images };
}
export function workspaceKeys(scope: string) {
  if (scope === 'guest' || scope === 'pending') throw new Error('login_required');
  return { demo: accountStorageKey('xgen-small-world-demo-v1', scope), studio: accountStorageKey('xgen-worldstudio-v1', scope),
    images: accountStorageKey('xgen-cloud-image-refs-v1', scope), pending: accountStorageKey('xgen-cloud-restore-v1', scope), backup: accountStorageKey('xgen-cloud-backup-v1', scope) };
}
export function readLocalWorkspace(storage: Storage, scope: string, images: Record<string, string> = {}): CloudSnapshot {
  const keys = workspaceKeys(scope);
  return readCloudSnapshot({ version: 1, demo: storage.getItem(keys.demo), studio: storage.getItem(keys.studio), images: { ...images, ...JSON.parse(storage.getItem(keys.images) || '{}') } });
}

export function restoredImage(storage: Storage, scope: string, key: string): string | null {
  if (scope === 'guest' || scope === 'pending') return null;
  try { const url = JSON.parse(storage.getItem(workspaceKeys(scope).images) || '{}')[key]; return typeof url === 'string' && /^\/api\/image\/asset\/[a-f0-9]{64}$/.test(url) ? url : null; } catch { return null; }
}
// Called at boot before React reads either existing storage key. Back up first;
// an interrupted restore retains its staging record and can be retried safely.
export function applyPendingWorkspace(storage: Storage, scope: string) {
  if (scope === 'guest' || scope === 'pending') return;
  const keys = workspaceKeys(scope), staged = storage.getItem(keys.pending);
  if (!staged) return;
  const next = readCloudSnapshot(JSON.parse(staged));
  const previous = { demo: storage.getItem(keys.demo), studio: storage.getItem(keys.studio), images: storage.getItem(keys.images) };
  storage.setItem(keys.backup, JSON.stringify(previous));
  try {
    storage.setItem(keys.demo, next.demo); storage.setItem(keys.studio, next.studio); storage.setItem(keys.images, JSON.stringify(next.images));
    storage.removeItem(keys.pending);
  } catch (error) {
    for (const field of ['demo', 'studio', 'images'] as const) { const value = previous[field]; if (value === null) storage.removeItem(keys[field]); else storage.setItem(keys[field], value); }
    throw error;
  }
}
