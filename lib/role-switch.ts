import type { WorldDefinition } from './ai-contracts';
import type { WorldState } from './world-state';
import { migrateWorldState } from './world-state-migration';

/** Switch a viewpoint, never apply an authored entry anchor to a running save. */
export function switchRole(world: WorldDefinition, state: WorldState, fromId: string, toId: string, fixedRoleId?: string) {
  state = migrateWorldState(state, world);
  const role = world.characters.find(c => c.id === toId);
  if (!role || role.playable === false || (fixedRoleId && fixedRoleId !== toId) || world.entryAdmission)
    throw Error('这个角色当前不可切换。');
  if (/^(已死亡|死亡|已死|身亡)$/.test(state.characterStates[toId]?.status ?? '')) throw Error('该角色已经死亡，不能通过切换恢复行动。');
  const perspectives = { ...state.rolePerspectives, [fromId]: {
    inventory: state.inventory, clues: state.clues, knownSecrets: state.knownSecrets,
    relationshipTrust: state.relationshipTrust, relationshipChanges: state.relationshipChanges, eventLedger: state.eventLedger,
  }};
  // Late-entry knowledge may describe events that have not happened in this save.
  const knowledge = role.entry && role.entry.storyAnchor !== 'story_start' ? [] : [...role.privateKnowledge, ...role.secrets];
  const personal = perspectives[toId] ?? { inventory: [], clues: [], knownSecrets: [...new Set(knowledge)], relationshipTrust: 42, relationshipChanges: {}, eventLedger: [] };
  const departing = world.locations.find(l => l.id === state.location || l.name === state.location)?.id ?? state.location;
  const characterStates = { ...state.characterStates, [fromId]: { ...state.characterStates[fromId], locationId: departing } };
  const placeId = characterStates[toId]?.locationId ?? role.startLocationId;
  const location = world.locations.find(l => l.id === placeId)?.name ?? placeId;
  const next: WorldState = { ...state, ...personal, rolePerspectives: perspectives, characterStates, location,
    activeGoalId: world.goals.find(g => g.scope === 'role' && g.roleId === toId)?.id ?? world.goals.find(g => g.scope === 'world')?.id };
  return { state: next, narrative: `同一时刻 · ${state.clock}\n\n你现在是${role.name}，身处${location}。时间与已发生的事情没有改变。先观察眼前，再决定下一步。` };
}
