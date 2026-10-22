import type { WorldDefinition, WorldGoal, WorldTurnResponse } from '@/lib/ai-contracts';

// Keep the words actually heard, not only the narrator's scenery. Hidden lines stay out.
export function turnMemoryText(response: Pick<WorldTurnResponse, 'narrative' | 'dialogue'>, world: Pick<WorldDefinition, 'characters'>, roleId: string): string {
  const names = new Map(world.characters.map(character => [character.id, character.name]));
  const lines = response.dialogue.filter(line => names.has(line.characterId) && line.visibleToRoleIds.includes(roleId))
    .map(line => `${names.get(line.characterId)}：${line.text}`);
  return [response.narrative, ...lines].filter(Boolean).join('\n\n');
}

export function selectRoleGoal(world: WorldDefinition, roleId: string): WorldGoal | undefined {
  const explicit = world.goals.find((goal) => goal.scope === 'role' && goal.roleId === roleId)
    ?? world.goals.find((goal) => goal.scope === 'world');
  if (explicit) return explicit;
  const role = world.characters.find((character) => character.id === roleId);
  return role?.goal ? { id: `role-goal:${roleId}`, scope: 'role', roleId, title: role.goal,
    description: role.goal, requiredTaskIds: world.tasks.filter((task) => task.assignedRoleIds.includes(roleId)).map((task) => task.id) } : undefined;
}

export type EventStatus = 'committed' | 'interrupted' | 'rejected';

export type EventRecord = {
  id: string;
  turn: number;
  action: string;
  result: string;
  location: string;
  status: EventStatus;
};

export type WorldState = {
  schemaVersion?: 2;
  stalledTurns?: number;
  rolePerspectives?: Record<string, Pick<WorldState, 'inventory' | 'clues' | 'knownSecrets' | 'relationshipTrust' | 'relationshipChanges' | 'eventLedger'>>;
  turn: number;
  clock: string;
  location: string;
  inventory: string[];
  clues: string[];
  knownSecrets: string[];
  committedFacts?: string[];
  reachedEndingIds?: string[];
  archivedEndingIds?: string[];
  activeGoalId?: string;
  completedTaskIds: string[];
  failedTaskIds: string[];
  taskNotes: Record<string, string>;
  characterStates: Record<string, { locationId?: string; status?: string; lastAction?: string; lastUpdatedTurn?: number }>;
  relationshipTrust: number;
  /** Change since entry, per NPC; zero is no recorded change, not automatic trust. */
  relationshipChanges?: Record<string, number>;
  eventLedger: EventRecord[];
};

export type ActionValidation = {
  allowed: boolean;
  reason?: string;
  suggestion?: string;
};

export type WorldIncident = {
  id: string;
  title: string;
  narrative: string;
  clue: string;
  relationshipDelta: number;
  impact: 'minor' | 'moderate' | 'major';
};

type CommitTurnInput = {
  action: string;
  result: string;
  clue: string;
  addClues?: string[];
  committedFacts?: string[];
  reachedEndingId?: string;
  nextLocation: string;
  relationshipDelta: number;
  relationshipDeltas?: Record<string, number>;
  incident?: WorldIncident | null;
  clock?: string;
  addInventory?: string[];
  removeInventory?: string[];
  addKnownSecrets?: string[];
  completeTaskIds?: string[];
  failTaskIds?: string[];
  taskNotes?: Record<string, string>;
  characterUpdates?: Record<string, { locationId?: string; status?: string; lastAction?: string }>;
};

function unique(items: string[]) {
  return [...new Set(items)];
}

function inferAcquiredItems(action: string, clue: string) {
  const items: string[] = [];
  if (action.includes('带上铜钥匙') || clue.includes('铜钥匙可以打开')) items.push('铜钥匙');
  if (action.includes('录下信号')) items.push('异常信号录音');
  if (clue.includes('没有烧尽的旧遗嘱')) items.push('残缺旧遗嘱');
  if (clue.includes('红泥')) items.push('红泥样本');
  return items;
}

export function createInitialWorldState(
  worldKind: 'storm' | 'suggestion' | 'draft',
  roleId: string,
  roleSecret: string,
  initialLocation: string,
  generated?: {
    timeSetting: string;
    coreEvent: string;
    activeGoalId?: string;
    characterIds?: string[];
    openingLocationId?: string;
    roleKnowledge?: string[];
    characterLocations?: Record<string, string>;
  },
): WorldState {
  const inventoryByRole: Record<string, string[]> = {
    'lin-xia': ['弟弟留下的录音', '手机'],
    'gu-huai': ['真遗嘱原件', '公文包'],
    'zhou-bo': ['铜钥匙', '手电'],
  };
  return {
    turn: 0,
    clock: generated?.timeSetting || (worldKind === 'draft' ? '02:40' : '23:40'),
    location: initialLocation,
    inventory: generated ? [] : worldKind === 'draft' ? ['航海日志', '手电'] : (inventoryByRole[roleId] ?? []),
    clues: [generated ? `核心事件：${generated.coreEvent}` : worldKind === 'draft' ? '雾潮将在凌晨三点达到顶峰' : '遗嘱公布时间：午夜'],
    knownSecrets: [...new Set((generated?.roleKnowledge ?? [roleSecret]).filter(Boolean))],
    committedFacts: [],
    reachedEndingIds: [],
    activeGoalId: generated?.activeGoalId,
    completedTaskIds: [],
    failedTaskIds: [],
    taskNotes: {},
    characterStates: Object.fromEntries((generated?.characterIds ?? []).map((characterId) => [characterId, {
      locationId: generated?.characterLocations?.[characterId] ?? generated?.openingLocationId,
      status: '行动中',
      lastAction: '等待世界开始',
    }])),
    relationshipTrust: 42,
    relationshipChanges: {},
    eventLedger: [],
  };
}

export function validateAction(action: string, state: WorldState, listedChoices: string[], world?: Pick<WorldDefinition, 'rules'>): ActionValidation {
  // This validates whether a turn may be sent, not whether the requested outcome succeeds.
  // The world Agent handles consequences while every non-empty user reply remains playable.
  void action;
  void state;
  void listedChoices;
  void world;
  return { allowed: true };
}

export function commitTurn(state: WorldState, input: CommitTurnInput): WorldState {
  const progressed = (input.committedFacts??[]).some(f => !(state.committedFacts??[]).includes(f))
    || (input.completeTaskIds??[]).some(id => !state.completedTaskIds.includes(id))
    || (input.failTaskIds??[]).some(id => !state.failedTaskIds.includes(id));
  const relationshipChanges = { ...state.relationshipChanges };
  for (const [id, delta] of Object.entries(input.relationshipDeltas ?? {})) {
    if (!Object.hasOwn(state.characterStates, id) || !Number.isFinite(delta)) continue;
    const previous = Number.isFinite(relationshipChanges[id]) ? relationshipChanges[id] : 0;
    relationshipChanges[id] = Math.max(-100, Math.min(100, previous + Math.max(-10, Math.min(10, delta))));
  }
  const nextTurn = state.turn + 1;
  const clockMinutes = /^\d{2}:\d{2}$/.test(state.clock)
    ? (Number(state.clock.slice(0, 2)) * 60 + Number(state.clock.slice(3)) + 5) % 1440 : null;
  const incidentRecords: EventRecord[] = input.incident ? [{
    id: `incident-${input.incident.id}-${nextTurn}`,
    turn: nextTurn,
    action: `意外事件：${input.incident.title}`,
    result: input.incident.narrative,
    location: input.nextLocation,
    status: 'committed',
  }] : [];
  return {
    ...state,
    schemaVersion: 2,
    stalledTurns: progressed ? 0 : (state.stalledTurns??0) + 1,
    turn: nextTurn,
    clock: input.clock || (clockMinutes !== null
      ? `${Math.floor(clockMinutes / 60).toString().padStart(2, '0')}:${(clockMinutes % 60).toString().padStart(2, '0')}`
      : `${state.clock.replace(/ · 第 \d+ [幕轮]$/, '')} · 第 ${nextTurn} 轮`),
    location: input.nextLocation,
    inventory: unique([
      ...state.inventory.filter((item) => !input.removeInventory?.includes(item)),
      ...inferAcquiredItems(input.action, input.clue),
      ...(input.addInventory ?? []),
    ]),
    clues: unique([...state.clues, input.clue, ...(input.addClues ?? []), ...(input.incident ? [input.incident.clue] : [])].filter(Boolean)),
    knownSecrets: unique([...state.knownSecrets, ...(input.addKnownSecrets ?? [])]),
    committedFacts: unique([...(state.committedFacts ?? []), ...(input.committedFacts ?? [])]),
    reachedEndingIds: unique([...(state.reachedEndingIds ?? []), ...(input.reachedEndingId ? [input.reachedEndingId] : [])]),
    completedTaskIds: unique([...(state.completedTaskIds ?? []), ...(input.completeTaskIds ?? [])]),
    failedTaskIds: unique([...(state.failedTaskIds ?? []), ...(input.failTaskIds ?? [])]),
    taskNotes: { ...state.taskNotes, ...input.taskNotes },
    characterStates: {
      ...state.characterStates,
      ...Object.fromEntries(Object.entries(input.characterUpdates ?? {}).map(([characterId, update]) => [
        characterId,
        { ...state.characterStates?.[characterId], ...update, lastUpdatedTurn: nextTurn },
      ])),
    },
    relationshipTrust: Math.max(12, Math.min(92, state.relationshipTrust + input.relationshipDelta + (input.incident?.relationshipDelta ?? 0))),
    relationshipChanges,
    eventLedger: [...state.eventLedger, {
      id: `event-${nextTurn}-${state.eventLedger.length}`,
      turn: nextTurn,
      action: input.action,
      result: input.result,
      location: input.nextLocation,
      status: 'committed',
    }, ...incidentRecords],
  };
}

export function recordInterruptedEvent(state: WorldState, action: string): WorldState {
  return {
    ...state,
    eventLedger: [...state.eventLedger, {
      id: `event-interrupted-${state.turn}-${state.eventLedger.length}`,
      turn: state.turn,
      action,
      result: '用户在生成完成前介入，尚未发生的后续已丢弃。',
      location: state.location,
      status: 'interrupted',
    }],
  };
}

export function recordRejectedEvent(state: WorldState, action: string, reason: string): WorldState {
  return {
    ...state,
    eventLedger: [...state.eventLedger, {
      id: `event-rejected-${state.turn}-${state.eventLedger.length}`,
      turn: state.turn,
      action,
      result: reason,
      location: state.location,
      status: 'rejected',
    }],
  };
}
