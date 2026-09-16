/** Presentation helpers: never manufacture a story outcome after a failed request. */
export function actionServiceError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/超时|timeout|504/i.test(message)) return '剧情服务响应超时，这次行动尚未执行。';
  if (/格式|截断|invalid.*output/i.test(message)) return '剧情回复未能通过格式检查，这次行动尚未执行。';
  if (/请求过多|429/.test(message)) return '剧情服务当前请求较多，这次行动尚未执行。';
  if (/登录|账号/.test(message)) return '登录状态需要确认，这次行动尚未执行。';
  return '剧情服务暂时未能完成响应，这次行动尚未执行。';
}

export function visibleInteractionGoal(task: string | undefined, goal: string | undefined, roleGoal: string): string {
  return [task, goal, roleGoal].find(value => value?.trim() && !/^(事件发生|推进剧情|继续探索|世界核心目标|未设置|待补充)$/.test(value.trim()))?.trim() ?? '';
}

export function actionLabel(label: string, roleName: string): string {
  const prefix = `${roleName}：`, asciiPrefix = `${roleName}:`;
  return (label.startsWith(prefix) ? label.slice(prefix.length) : label.startsWith(asciiPrefix) ? label.slice(asciiPrefix.length) : label).trim();
}

export const INTERACTION_CLARITY_GUIDANCE = `
互动清晰度：先回应userAction实际授权的动作及可感知结果，再展示局面的具体变化，最后停在玩家可以回应的时刻。退回屋内不能写成起身出门；观察、装睡、等待都是有效行动，应让合理时长经过，按NPC动机或环境变化给出具体反馈，不要求玩家不断主动制造冲突，也不强行制造危机。结果可以平静或暂无线索，但要简短说明观察所得与可继续的方向，避免连续几轮只写树影、风声和“什么也看不清”。不能替玩家作下一项决定或泄露他人秘密。
nextChoices提供3个基于当前现场、执行方式或意图不同的具体行动。每项用简短动词短句，不预告隐藏结果，不用“继续探索”等空泛选项，不把所有选项写成同一种追问；自由输入同样有效。行动带来的信息、关系变化或实际代价应自然呈现，不使用通关输赢评价。画面与文字使用相同的互动原则，不能用环境描写代替行动反馈。`;
