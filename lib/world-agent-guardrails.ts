import type { WorldTurnRequest, WorldTurnResponse } from '@/lib/ai-contracts';
import type { ActionValidation } from '@/lib/world-state';

function activeTasks(input: WorldTurnRequest, completed: Set<string>, failed: Set<string>) {
  return input.world.tasks.filter((task) => task.kind === 'main'
    && (task.assignedRoleIds.length === 0 || task.assignedRoleIds.includes(input.selectedRoleId))
    && !completed.has(task.id) && !failed.has(task.id)
    && task.prerequisiteTaskIds.every((id) => completed.has(id))).map((task) => task.id);
}

// Conservative overlap check: repeated names or a short recap are not a repeated turn.
export function narrativeOverlap(left: string, right: string): number {
  const normalize = (text: string) => text.replace(/[^\p{L}\p{N}]/gu, '');
  const a = normalize(left); const b = normalize(right);
  if (Math.min(a.length, b.length) < 160) return 0;
  const grams = (text: string) => new Set(Array.from({ length: text.length - 4 }, (_, index) => text.slice(index, index + 5)));
  const ag = grams(a); const bg = grams(b);
  const shared = [...ag].filter((gram) => bg.has(gram)).length;
  return shared / Math.max(ag.size, bg.size);
}

export function makeRejectedWorldTurn(input: WorldTurnRequest, validation: ActionValidation): WorldTurnResponse {
  return {
    actionDecision: { allowed: false, reason: validation.reason, suggestedAlternative: validation.suggestion },
    narrative: '', dialogue: [], statePatch: { committedFacts: [] },
    nextChoices: input.currentScene.choices.map(({ id, label, intent }) => ({ id, label, intent })),
    image: { required: false, reason: 'reuse', sceneId: input.currentScene.id },
    goalProgress: {
      activeTaskIds: activeTasks(input, new Set(input.state.completedTaskIds), new Set(input.state.failedTaskIds)),
      completedTaskIds: input.state.completedTaskIds,
      summary: '行动未通过，世界状态未改变',
    },
    ending: { reached: false, canContinue: true },
  };
}

export function enforceWorldTurnGuardrails(input: WorldTurnRequest, output: WorldTurnResponse): WorldTurnResponse {
  if (!output.actionDecision.allowed) {
    // Even a model's rejection reason can accidentally disclose hidden facts.
    return makeRejectedWorldTurn(input, { allowed: false,
      reason: '当前条件不足以执行这个行动。', suggestion: '尝试观察现场、询问在场人物或先取得所需条件。' });
  }
  const role = input.world.characters.find((character) => character.id === input.selectedRoleId);
  if (role && ['听到你的话', '听了你的话', '听到你这么说', '听你这么说'].some((phrase) => output.narrative.includes(`${role.name}${phrase}`))) {
    throw new Error('player_perspective_drift');
  }
  if (input.recentTurns.some((turn) => narrativeOverlap(output.narrative, turn.result) >= 0.72)) {
    throw new Error('repeated_narrative');
  }
  const completed = new Set(input.state.completedTaskIds ?? []);
  for (const [id, update] of Object.entries(output.statePatch.characterUpdates??{})) {
    if (!input.world.characters.some(c=>c.id===id) || !update || typeof update!=='object'
      || (update.locationId!==undefined && !input.world.locations.some(l=>l.id===update.locationId)))
      throw new Error('invalid_character_transition');
  }
  for (const fact of output.statePatch.committedFacts.filter(f=>f.startsWith('scheduled-event:'))) {
    const event=input.world.scheduledEvents.find(e=>`scheduled-event:${e.id}`===fact);
    if (!event || event.earliestTurn>input.state.turn+1 || input.state.committedFacts?.includes(fact))
      throw new Error('invalid_scheduled_event_transition');
  }
  if (input.userAction.includes('留在当前地点') && output.statePatch.locationId) {
    const currentLocation = input.world.locations.find((location) => location.id === input.state.location || location.name === input.state.location);
    const sameLocation = [input.state.location, currentLocation?.id, currentLocation?.name].includes(output.statePatch.locationId);
    if (!sameLocation) throw new Error('unauthorized_player_movement');
  }
  const failed = new Set(input.state.failedTaskIds ?? []);
  const tasks = new Map(input.world.tasks.map((task) => [task.id, task]));
  const completions = [...new Set(output.statePatch.completeTaskIds ?? [])];
  const failures = [...new Set(output.statePatch.failTaskIds ?? [])];
  for (const id of [...completions, ...failures]) {
    const task = tasks.get(id);
    if (!task || !task.prerequisiteTaskIds.every((pre) => completed.has(pre))
      || (completions.includes(id) && (failed.has(id) || failures.includes(id)))
      || (failures.includes(id) && completed.has(id))) {
      // Reject the whole turn so prose and state cannot disagree about a skipped task.
      throw new Error('invalid_task_transition');
    }
  }
  completions.forEach((id) => completed.add(id));
  failures.forEach((id) => failed.add(id));
  const facts = new Set([
    ...(input.state.committedFacts ?? []), ...input.state.clues, ...input.state.knownSecrets,
    ...input.state.eventLedger.filter((event) => event.status === 'committed').map((event) => event.result),
    ...(output.statePatch.addClues ?? []), ...(output.statePatch.addKnownSecrets ?? []),
    ...output.statePatch.committedFacts,
  ]);
  const seen = new Set(input.state.reachedEndingIds ?? []);
  const eligible = input.world.endingConditions.filter((condition) => {
    const failedIds = condition.requiredFailedTaskIds ?? [];
    const hasTrigger = condition.requiredTaskIds.length + failedIds.length + condition.requiredFacts.length > 0;
    return hasTrigger && !seen.has(condition.id)
      && (condition.applicableRoleIds === undefined || condition.applicableRoleIds.includes(input.selectedRoleId))
      && condition.requiredTaskIds.every((id) => tasks.has(id) && completed.has(id))
      && failedIds.every((id) => tasks.has(id) && failed.has(id))
      && condition.requiredFacts.every((fact) => facts.has(fact))
      && (condition.forbiddenFacts ?? []).every((fact) => !facts.has(fact));
  });
  const ending = eligible.find((condition) => condition.id === output.ending.endingId)
    ?? eligible.find((condition) => condition.outcome === 'failure') ?? eligible[0];
  if (output.ending.reached && !ending && !seen.has(output.ending.endingId ?? '')) {
    throw new Error('premature_ending');
  }
  const npcNames = input.world.characters.filter((character) => character.id !== input.selectedRoleId).map((character) => character.name);
  const nextChoices = output.nextChoices.filter((choice) => !npcNames.some((name) => choice.label.startsWith(name)))
    .map((choice) => ({ ...choice, label: choice.label.startsWith(role?.name ?? '') ? choice.label : `${role?.name ?? '你'}：${choice.label}` }));
  if (input.interaction?.mode === 'character-chat') {
    const targetId = input.interaction.targetCharacterId;
    const targetLocation = input.state.characterStates[targetId]?.locationId;
    const targetPresent = targetLocation === input.state.location
      || input.world.locations.some((place) => place.id === targetLocation && place.name === input.state.location);
    if (targetPresent && !output.dialogue.some((line) => line.characterId === targetId && line.visibleToRoleIds.includes(input.selectedRoleId) && line.text.trim())) {
      throw new Error('chat_target_missing');
    }
  }
  return {
    ...output,
    // Do not invent prose, dialogue, or off-screen actions to pass length/count tests.
    dialogue: output.dialogue.filter((line) => line.visibleToRoleIds.includes(input.selectedRoleId)),
    nextChoices,
    statePatch: { ...output.statePatch, completeTaskIds: completions, failTaskIds: failures,
      relationshipDeltas: Object.fromEntries(Object.entries(output.statePatch.relationshipDeltas ?? {}).filter(([id, value]) =>
        Number.isFinite(value) && (id === 'world' || (id !== input.selectedRoleId && input.world.characters.some(character => character.id === id))))
        .map(([id, value]) => [id, Math.max(-10, Math.min(10, value))])),
    },
    goalProgress: {
      activeTaskIds: activeTasks(input, completed, failed), completedTaskIds: [...completed],
      summary: ending ? ending.description : output.goalProgress.summary,
    },
    ending: { reached: Boolean(ending), endingId: ending?.id, outcome: ending ? ending.outcome ?? 'success' : undefined, canContinue: true },
  };
}
