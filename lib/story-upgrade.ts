import type { StudioWorld } from './studio-worlds';
import type { WorldState } from './world-state';
import { appendStory } from './story-continuation.ts';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}

/** Only an append-only saved/released edition can be attached to an old run. */
export function storyUpgrade(current: StudioWorld, latest?: StudioWorld) {
  if (!latest || current.id !== latest.id || current.world.id !== latest.world.id || current.world.entryAdmission || latest.world.entryAdmission || current.fixedRoleId !== latest.fixedRoleId) return null;
  try {
    const merged = appendStory(current.world, latest.world);
    // Reject revised old facts, deleted objects, and older/unrelated editions.
    if (canonical(merged) !== canonical(latest.world)) return null;
    return { entry: { ...latest, world: merged }, addedTasks: merged.tasks.length - current.world.tasks.length };
  } catch { return null; }
}

export function applyStoryUpgrade(current: StudioWorld, latest: StudioWorld, state: WorldState): WorldState {
  const upgrade = storyUpgrade(current, latest);
  if (!upgrade) throw Error('这版内容改动了原有设定，暂不能直接接入旧存档。原进度保持不变。');
  const changedEndings = new Set(current.world.endingConditions.filter(old => {
    const next = upgrade.entry.world.endingConditions.find(e=>e.id===old.id);
    return next && canonical(old)!==canonical(next);
  }).map(e=>e.id));
  const characterStates = { ...state.characterStates };
  for (const role of upgrade.entry.world.characters) {
    if (!current.world.characters.some(old=>old.id===role.id)) characterStates[role.id] = { locationId: role.startLocationId, status: '尚未相遇' };
  }
  return { ...state, characterStates,
    // Keep the earlier achievement as history, while the extended condition can be reached later.
    archivedEndingIds: [...new Set([...(state.archivedEndingIds??[]), ...(state.reachedEndingIds??[]).filter(id=>changedEndings.has(id))])],
    reachedEndingIds: (state.reachedEndingIds??[]).filter(id=>!changedEndings.has(id)),
  };
}
