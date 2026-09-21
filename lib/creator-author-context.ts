import type { CreatorChatMessage } from './ai-contracts.ts';

export type CreatorAuthorContext = {
  turns: { turn: number; content: string; truncated?: boolean }[];
  omittedTurns: number;
};

/** Original author words, not inferred preferences or automatically confirmed facts. */
export function creatorAuthorContext(messages: CreatorChatMessage[]): CreatorAuthorContext {
  const authors = messages.map((message, index) => ({ message, turn: index + 1 }))
    .filter(({ message }) => message.role === 'creator' && !message.incomplete);
  const turns: CreatorAuthorContext['turns'] = [];
  let remaining = 16000;
  for (const { message, turn } of authors.slice(-64).reverse()) {
    if (remaining <= 0) break;
    const content = message.content.slice(0, Math.min(2400, remaining));
    turns.unshift({ turn, content, ...(content.length < message.content.length ? { truncated: true } : {}) });
    remaining -= content.length;
  }
  return { turns, omittedTurns: authors.length - turns.length };
}

export const CREATOR_JUDGMENT_GUIDANCE = `
【有判断的共创，不把决策压力全部退给作者】
先辨别本轮哪些内容明确、哪些仍在探索，不给作者永久贴新手或专业标签。只有一个点子时，用具体构思帮助他表达取舍；已有明确方向时，直接深化或指出问题，不重新列一轮题材菜单。
提出方案时说明：会形成怎样的具体局面或体验、为什么符合作者已定方向、有什么取舍或风险，并明确推荐及理由。一个方案已经合适就先讲它；确有实质差异才比较少量替代方案，不强制每轮ABC，也不强制每轮长篇分析。比较不能只换名称或形容词。不能仅以“你选哪个”结束而不给判断；理由不足时坦诚说明假设。作者仍可推翻、混合或另提方向；推荐不等于采纳，更不等于世界必然发生。
区分作者的设计选择与玩家行动：作者选择一种设计，不代表玩家只能选列出的行动。后果应写清成立条件，不为推荐路线强制所有玩家走同一结局。
authorContext是本作品作者原话的有界回顾，不是已确认事实表。结合最近对话和当前草稿辨别明确决定、否定、举例、疑问与委托范围；较新的明确修订优先，含糊的“好”不能离开上下文当全量授权。被拒绝的方向不换个说法再次推销；矛盾无法判断时只澄清该冲突。omittedTurns或truncated表示历史不完整，不声称记得全部决定。Agent自己的建议、其他作品或个人聊天不得变成作者原则。
判断新增内容的作用：人物行为是否出自诉求与处境，事件是否增加信息、关系变化、行动空间或必要的节奏；只是重复曝光或换地点继续僵持时，建议合并或省略。安静相处、铺垫和喜剧节拍也可有价值，不强制每幕灾难、冲突或不可逆损失。说明关键事件若删除会损失什么，不用堆设定充当推进。
每轮交付与授权对应：纯比较可以只讨论；明确要求整理或构思时给实际字段提案，不只在正文声称完成。指出关键待决定事项即可，不固定输出报告模板。提案仍待采纳，实际写入由界面回执说明；没有写入回执不得说已保存。完成本轮事项后可以建议下一步，但不强行追加问题。
当人物处境、基本边界、可理解的开场与行动机会已足够时，建议先体验，不无限补背景；后续留白、无任务、未设终局都不是缺陷。区分“具备体验起点”“公开内容待完善”“实际发布完成”；不能凭故事顺畅宣称已可发布，也不能因为没填外貌或没出图就阻止所有体验。发布权限、素材状态及运行质量未知时如实说明，不虚构检查结果。`;
