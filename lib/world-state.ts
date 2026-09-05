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
  turn: number;
  clock: string;
  location: string;
  inventory: string[];
  clues: string[];
  knownSecrets: string[];
  activeGoalId?: string;
  completedTaskIds: string[];
  failedTaskIds: string[];
  taskNotes: Record<string, string>;
  characterStates: Record<string, { locationId?: string; status?: string; lastAction?: string }>;
  relationshipTrust: number;
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
  nextLocation: string;
  relationshipDelta: number;
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
    knownSecrets: [roleSecret],
    activeGoalId: generated?.activeGoalId,
    completedTaskIds: [],
    failedTaskIds: [],
    taskNotes: {},
    characterStates: Object.fromEntries((generated?.characterIds ?? []).map((characterId) => [characterId, {
      locationId: generated?.openingLocationId,
      status: '行动中',
      lastAction: '等待世界开始',
    }])),
    relationshipTrust: 42,
    eventLedger: [],
  };
}

export function validateAction(action: string, state: WorldState, listedChoices: string[]): ActionValidation {
  const normalized = action.trim();
  if (listedChoices.includes(normalized)) return { allowed: true };
  if (normalized.length < 2) return { allowed: false, reason: '行动太模糊，世界无法判定你想做什么。', suggestion: '说明你想观察、询问或操作什么。' };

  const impossiblePattern = /(瞬移|穿墙|凭空变出|时间倒流|召唤飞船|飞到楼顶)/;
  if (impossiblePattern.test(normalized)) {
    return { allowed: false, reason: '这个行动违反了当前世界的物理规则。', suggestion: '可以尝试寻找通道、工具或请求其他角色帮助。' };
  }

  const secretPattern = /(读取|查看|直接知道).{0,6}(内心|记忆|秘密)/;
  if (secretPattern.test(normalized)) {
    return { allowed: false, reason: '你不能无依据获得其他角色的私密信息。', suggestion: '可以询问对方、查找证据，或先提高对方对你的信任。' };
  }

  const shortcutPattern = /(直接进入|现在直接|立刻进入).{0,8}(结局|终局)|宣布.{0,18}(已经|全部).{0,12}(解决|完成|达成)|不需要.{0,10}(证据|条件|前置)|没有任何证据就宣布/;
  if (shortcutPattern.test(normalized)) {
    return { allowed: false, reason: '你描述的是尚未发生的结果，不能用宣告跳过任务条件。', suggestion: '说明你准备采取的具体行动，世界会根据证据、关系和前置条件判断结果。' };
  }

  const requiredItems = [
    { pattern: /(用|拿出).{0,4}铜钥匙/, item: '铜钥匙' },
    { pattern: /(播放|查看).{0,5}弟弟.{0,3}录音/, item: '弟弟留下的录音' },
    { pattern: /(出示|打开|检查).{0,5}真遗嘱/, item: '真遗嘱原件' },
  ];
  const missing = requiredItems.find(({ pattern, item }) => pattern.test(normalized) && !state.inventory.includes(item));
  if (missing) {
    return { allowed: false, reason: `你当前没有“${missing.item}”，不能直接执行这个行动。`, suggestion: '先在场景中寻找它，或向持有它的角色索要。' };
  }

  return { allowed: true };
}

export function commitTurn(state: WorldState, input: CommitTurnInput): WorldState {
  const nextTurn = state.turn + 1;
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
    turn: nextTurn,
    clock: input.clock || (/^\d{2}:\d{2}$/.test(state.clock)
      ? `${state.clock.slice(0, 3)}${Math.min(59, Number(state.clock.slice(3)) + nextTurn * 5).toString().padStart(2, '0')}`
      : `${state.clock.replace(/ · 第 \d+ [幕轮]$/, '')} · 第 ${nextTurn + 1} 轮`),
    location: input.nextLocation,
    inventory: unique([
      ...state.inventory.filter((item) => !input.removeInventory?.includes(item)),
      ...inferAcquiredItems(input.action, input.clue),
      ...(input.addInventory ?? []),
    ]),
    clues: unique([...state.clues, input.clue, ...(input.incident ? [input.incident.clue] : [])]),
    knownSecrets: unique([...state.knownSecrets, ...(input.addKnownSecrets ?? [])]),
    completedTaskIds: unique([...(state.completedTaskIds ?? []), ...(input.completeTaskIds ?? [])]),
    failedTaskIds: unique([...(state.failedTaskIds ?? []), ...(input.failTaskIds ?? [])]),
    taskNotes: { ...state.taskNotes, ...input.taskNotes },
    characterStates: {
      ...state.characterStates,
      ...Object.fromEntries(Object.entries(input.characterUpdates ?? {}).map(([characterId, update]) => [
        characterId,
        { ...state.characterStates?.[characterId], ...update },
      ])),
    },
    relationshipTrust: Math.max(12, Math.min(92, state.relationshipTrust + input.relationshipDelta + (input.incident?.relationshipDelta ?? 0))),
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
