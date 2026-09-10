import type { WorldTurnRequest } from './ai-contracts';

export const PROGRESSION_GUIDANCE = `世界自主推进：progression 是服务端整理的候选，不是已经发生的事实。玩家持续观察、等待或不触发关键行动时，NPC仍可按创作者目标行动，环境与已满足条件的预定事件继续发展；不要每轮都等待玩家替NPC完成任务。停滞回合增加时优先推进一个有因果依据的变化，不凭空添加危机或强迫玩家行动。dueEvents只达到最早回合，仍须判断trigger；不能因到时就跳过前置。实际发生后在committedFacts加入对应commitMarker，未发生绝不可标记。已标记事件不重演。后台角色行动写入characterUpdates和必要世界事实，只有被当前角色看到、听到或收到消息的部分才进入narrative/dialogue/addKnownSecrets。未更新的角色维持原状态，不自动移动或复活。每个成功回合最多推进与本次时间跨度相称的事件；页面等待、刷新、切换角色不推进时间、不触发生成。创作者明确的结果由符合角色动机的因果链实现，不代写玩家的承诺或伤害行为，不把预期结果当作已发生事实。`;

export function worldProgression(input: WorldTurnRequest) {
  if (input.interaction?.mode === 'character-chat') return undefined;
  const completed = new Set(input.state.completedTaskIds);
  const failed = new Set(input.state.failedTaskIds);
  const facts = new Set(input.state.committedFacts ?? []);
  return {
    stalledTurns: input.state.stalledTurns ?? 0,
    dueEvents: input.world.scheduledEvents
      .filter(event => event.earliestTurn <= input.state.turn + 1 && !facts.has(`scheduled-event:${event.id}`))
      .map(event => ({ ...event, commitMarker: `scheduled-event:${event.id}` })),
    otherCharacters: input.world.characters.filter(c => c.id !== input.selectedRoleId).map(c => ({
      id: c.id, goal: c.goal, state: input.state.characterStates[c.id] ?? { locationId: c.startLocationId },
      availableTaskIds: input.world.tasks.filter(t => t.assignedRoleIds.includes(c.id)
        && !completed.has(t.id) && !failed.has(t.id) && t.prerequisiteTaskIds.every(id => completed.has(id))).map(t => t.id),
    })),
  };
}
