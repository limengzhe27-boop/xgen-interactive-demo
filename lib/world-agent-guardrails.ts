import type { WorldTurnRequest, WorldTurnResponse } from '@/lib/ai-contracts';
import type { ActionValidation } from '@/lib/world-state';

function activeTasks(input: WorldTurnRequest, completed: Set<string>, failed: Set<string>) {
  return input.world.tasks.filter((task) => task.kind === 'main'
    && !completed.has(task.id) && !failed.has(task.id)
    && task.prerequisiteTaskIds.every((id) => completed.has(id))).map((task) => task.id);
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
  const completed = new Set(input.state.completedTaskIds ?? []);
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
  const role = input.world.characters.find((character) => character.id === input.selectedRoleId);
  const npcNames = input.world.characters.filter((character) => character.id !== input.selectedRoleId).map((character) => character.name);
  const nextChoices = output.nextChoices.filter((choice) => !npcNames.some((name) => choice.label.startsWith(name)))
    .map((choice) => ({ ...choice, label: choice.label.startsWith(role?.name ?? '') ? choice.label : `${role?.name ?? '你'}：${choice.label}` }));
  return {
    ...output,
    // Do not invent prose, dialogue, or off-screen actions to pass length/count tests.
    dialogue: output.dialogue.filter((line) => line.visibleToRoleIds.includes(input.selectedRoleId)),
    nextChoices,
    statePatch: { ...output.statePatch, completeTaskIds: completions, failTaskIds: failures },
    goalProgress: {
      activeTaskIds: activeTasks(input, completed, failed), completedTaskIds: [...completed],
      summary: ending ? ending.description : output.goalProgress.summary,
    },
    ending: { reached: Boolean(ending), endingId: ending?.id, outcome: ending ? ending.outcome ?? 'success' : undefined, canContinue: true },
  };
}
