export const STORY_PROGRESSION_GUIDANCE = `
【故事推演，不作输赢判定】本产品没有玩家成功/失败、通关/败局；人物愿望只是行动动机，不是必须达成的胜利条件。依据创作者设定、已发生事件、人物独立行为和用户当前行动推演后果。遇到阻力、拒绝、错过机会或目标改变，都继续形成剧情，不宣布玩家失败。
创作与设定：不询问必填成功/失败条件，不强造一好一坏两个结局。可以讨论预期走向、其他走向与阶段收束，未确定的留空。禁止为了达成预期而替玩家作决定；NPC和已设定事件可以推动局面。
兼容字段：proposal.brief.successCondition 表示预期走向，proposal.brief.failureCondition 表示可选的其他走向，均可为空；task.successCondition 表示事件节点成立的证据，不是玩家获胜。旧 endingConditions.outcome 的 success/failure 仅是历史分组，不具有价值或输赢含义；新生成的 endingConditions 不填写 outcome。
endingConditions 只定义可选的阶段收束条件，不是所有走向的清单，不强制设置。只有事实和前置成立才可 ending.reached=true；不因行动未达预期、拒绝任务、回合数或分镜用尽而收束。ending 不输出 outcome，canContinue=true。没有阶段收束就继续提供下一步行动。不得让所有结局都要求完成全部主线。
保持物理、知识和事件依赖：行动可以没有达到意图，原件毁坏等事实不可撤销；这类后果不是体验失败。正文直接呈现事件，不使用“恭喜通关”“任务失败”“你输了”等评语。`;
