import type { WorldDefinition } from './ai-contracts';
import type { WorldState } from './world-state';

/** Add missing legacy fields only. Never remap IDs, discard facts, or reapply entry events. */
export function migrateWorldState(state: WorldState, world?: WorldDefinition): WorldState {
  const characterStates = { ...state.characterStates };
  for (const role of world?.characters ?? []) {
    if (!characterStates[role.id]) characterStates[role.id] = { locationId: role.startLocationId };
  }
  return {
    ...state,
    schemaVersion: 2,
    stalledTurns: Number.isSafeInteger(state.stalledTurns) && state.stalledTurns! >= 0 ? state.stalledTurns : 0,
    inventory: state.inventory ?? [], clues: state.clues ?? [], knownSecrets: state.knownSecrets ?? [],
    completedTaskIds: state.completedTaskIds ?? [], failedTaskIds: state.failedTaskIds ?? [],
    committedFacts: state.committedFacts ?? [], reachedEndingIds: state.reachedEndingIds ?? [],
    archivedEndingIds: state.archivedEndingIds ?? [], taskNotes: state.taskNotes ?? {},
    relationshipChanges: state.relationshipChanges ?? {}, eventLedger: state.eventLedger ?? [],
    characterStates,
    rolePerspectives: state.rolePerspectives ? Object.fromEntries(Object.entries(state.rolePerspectives).map(([id, p])=>[id, {
      ...p, inventory:p.inventory??[], clues:p.clues??[], knownSecrets:p.knownSecrets??[],
      relationshipChanges:p.relationshipChanges??{}, eventLedger:p.eventLedger??[],
    }])) : undefined,
  };
}
