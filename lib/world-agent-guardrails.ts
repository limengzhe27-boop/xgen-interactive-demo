import type { WorldTurnRequest, WorldTurnResponse } from '@/lib/ai-contracts';
import type { ActionValidation } from '@/lib/world-state';

function unique(values: string[]) {
  return [...new Set(values)];
}

function activeMainTaskIds(input: WorldTurnRequest, completedTaskIds: Set<string>, failedTaskIds: Set<string>) {
  return input.world.tasks
    .filter((task) => task.kind === 'main'
      && !completedTaskIds.has(task.id)
      && !failedTaskIds.has(task.id)
      && task.prerequisiteTaskIds.every((id) => completedTaskIds.has(id)))
    .map((task) => task.id);
}

export function makeRejectedWorldTurn(input: WorldTurnRequest, validation: ActionValidation): WorldTurnResponse {
  const completedTaskIds = new Set(input.state.completedTaskIds ?? []);
  const failedTaskIds = new Set(input.state.failedTaskIds ?? []);
  return {
    actionDecision: {
      allowed: false,
      reason: validation.reason ?? '这个行动不符合当前世界规则。',
      suggestedAlternative: validation.suggestion,
    },
    narrative: '',
    dialogue: [],
    statePatch: { committedFacts: [] },
    nextChoices: input.currentScene.choices.map(({ id, label, intent }) => ({ id, label, intent })),
    image: {
      required: false,
      reason: 'reuse',
      sceneId: input.currentScene.id,
      reuseAssetId: input.currentScene.id,
    },
    goalProgress: {
      activeTaskIds: activeMainTaskIds(input, completedTaskIds, failedTaskIds),
      completedTaskIds: [...completedTaskIds],
      summary: '行动未通过世界规则检查，任务进度未改变',
    },
    ending: { reached: false, canContinue: true },
  };
}

export function enforceWorldTurnGuardrails(input: WorldTurnRequest, output: WorldTurnResponse): WorldTurnResponse {
  if (!output.actionDecision.allowed) {
    return makeRejectedWorldTurn(input, {
      allowed: false,
      reason: output.actionDecision.reason,
      suggestion: output.actionDecision.suggestedAlternative,
    });
  }

  const taskById = new Map(input.world.tasks.map((task) => [task.id, task]));
  const characterIds = new Set(input.world.characters.map((character) => character.id));
  const completedBefore = new Set(input.state.completedTaskIds ?? []);
  const failedBefore = new Set(input.state.failedTaskIds ?? []);
  const permittedCompletions = unique(output.statePatch.completeTaskIds ?? []).filter((taskId) => {
    const task = taskById.get(taskId);
    return Boolean(task)
      && !failedBefore.has(taskId)
      && task?.prerequisiteTaskIds.every((id) => completedBefore.has(id));
  });
  const permittedFailures = unique(output.statePatch.failTaskIds ?? []).filter((taskId) => taskById.has(taskId) && !completedBefore.has(taskId));
  const completedAfter = new Set([...completedBefore, ...permittedCompletions]);
  const failedAfter = new Set([...failedBefore, ...permittedFailures]);
  const committedFacts = unique(output.statePatch.committedFacts ?? []);
  const visibleFacts = new Set([
    ...(input.state.clues ?? []),
    ...(input.state.knownSecrets ?? []),
    ...input.state.eventLedger.map((event) => event.result),
    ...(output.statePatch.addClues ?? []),
    ...(output.statePatch.addKnownSecrets ?? []),
    ...committedFacts,
  ]);
  const satisfiedEnding = input.world.endingConditions.find((condition) => condition.requiredTaskIds.every((id) => completedAfter.has(id))
    && condition.requiredFacts.every((fact) => visibleFacts.has(fact))
    && (condition.forbiddenFacts ?? []).every((fact) => !visibleFacts.has(fact)));
  const endingReached = output.ending.reached && Boolean(satisfiedEnding);
  const taskNotes = Object.fromEntries(Object.entries(output.statePatch.taskNotes ?? {}).filter(([taskId]) => taskById.has(taskId)));
  const characterUpdates = Object.fromEntries(Object.entries(output.statePatch.characterUpdates ?? {}).filter(([characterId]) => characterIds.has(characterId)));
  const selectedCharacter = input.world.characters.find((character) => character.id === input.selectedRoleId) ?? input.world.characters[0];
  const nonPlayerCharacters = input.world.characters.filter((character) => character.id !== input.selectedRoleId);
  const counterpart = nonPlayerCharacters[0] ?? selectedCharacter;
  const activeTaskIds = activeMainTaskIds(input, completedAfter, failedAfter);
  const activeTask = input.world.tasks.find((task) => task.id === activeTaskIds[0]);
  const locationName = input.world.locations.find((location) => location.id === (output.statePatch.locationId ?? input.state.location))?.name
    ?? output.statePatch.locationId
    ?? input.state.location;
  let narrative = output.narrative.trim();
  if (narrative.length < 300) {
    narrative += `\n\n行动之后，${locationName}里的局势没有停在这一刻。${nonPlayerCharacters.map((character) => character.name).join('、') || '其他角色'}各自依据已经掌握的信息调整计划；他们只会公开符合自身利益的部分，不会因为体验者提出要求就交出全部答案。当前真正能推进的是“${activeTask?.title ?? '处理行动造成的新局面'}”，完成标准仍是“${activeTask?.successCondition ?? '形成可以被世界验证的新事实'}”。这意味着下一步需要继续核对证据、交换条件或承担一次明确代价，而尚未满足前置的任务和结局不会因此自动发生。`;
  }
  if (narrative.length < 300) {
    narrative += `\n\n与此同时，${counterpart?.name ?? '关键人物'}已经注意到${selectedCharacter?.name ?? '体验者'}的选择，并开始准备自己的下一步。世界会记住这次行动带来的关系变化、线索和时间消耗。`;
  }

  const dialogue = [...output.dialogue];
  const dialogueCharacters = nonPlayerCharacters.length > 0 ? nonPlayerCharacters : [selectedCharacter].filter(Boolean);
  while (dialogue.length < 2) {
    const character = dialogueCharacters[dialogue.length % dialogueCharacters.length];
    dialogue.push({
      characterId: character?.id ?? input.selectedRoleId,
      text: dialogue.length === 0
        ? `“我会回应你的行动，但你还需要拿出能推进‘${activeTask?.title ?? '当前目标'}’的条件。”`
        : '“别只看眼前的回答。你刚才的选择已经让其他人的计划发生了变化。”',
      visibleToRoleIds: [input.selectedRoleId],
    });
  }

  const rolePrefix = `${selectedCharacter?.name ?? '体验者'}：`;
  const nextChoices = output.nextChoices.map((choice) => ({
    ...choice,
    label: choice.label.startsWith(selectedCharacter?.name ?? '体验者') ? choice.label : `${rolePrefix}${choice.label}`,
  }));
  const fallbackChoices = [
    { id: `verify-${input.state.turn + 1}`, label: `${rolePrefix}核对刚获得的信息，确认它能否推进当前任务`, intent: '验证事实并避免被误导' },
    { id: `negotiate-${input.state.turn + 1}`, label: `${rolePrefix}找${counterpart?.name ?? '关键人物'}交换有限条件`, intent: '在不泄露底牌的情况下建立合作' },
    { id: `observe-${input.state.turn + 1}`, label: `${rolePrefix}观察其他角色正在暗中推进什么`, intent: '识别非玩家角色的下一步' },
  ];
  for (const choice of fallbackChoices) {
    if (nextChoices.length >= 3) break;
    nextChoices.push(choice);
  }

  if (nonPlayerCharacters.length > 0 && !Object.keys(characterUpdates).some((id) => id !== input.selectedRoleId)) {
    characterUpdates[nonPlayerCharacters[0].id] = {
      locationId: output.statePatch.locationId ?? input.state.location,
      status: '根据当前局势调整立场',
      lastAction: `注意到${selectedCharacter?.name ?? '体验者'}的行动后准备下一步`,
    };
  }

  return {
    ...output,
    narrative,
    dialogue,
    nextChoices,
    statePatch: {
      ...output.statePatch,
      completeTaskIds: permittedCompletions,
      failTaskIds: permittedFailures,
      taskNotes,
      characterUpdates,
      committedFacts,
    },
    goalProgress: {
      activeTaskIds,
      completedTaskIds: [...completedAfter],
      summary: output.goalProgress.summary,
    },
    ending: {
      reached: endingReached,
      endingId: endingReached ? satisfiedEnding?.id : undefined,
      canContinue: true,
    },
  };
}
