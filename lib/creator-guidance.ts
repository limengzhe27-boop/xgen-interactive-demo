import type { CreatorAgentRequest } from './ai-contracts.ts';
import { CREATOR_STORY_GRAPH_GUIDANCE } from './creator-story-graph.ts';
import { creatorAppendRequested } from './creator-append.ts';

/** Route by what the author is working on, not a forced number of conversation rounds. */
export function creatorGraphGuidance(input: Partial<CreatorAgentRequest>) {
  if (creatorAppendRequested(input.userMessage)) return `${CREATOR_STORY_GRAPH_GUIDANCE}
本轮作者明确委托追加事件，请执行而不是再次询问同一个选择题。依据当前画布构思至少一个真正的新节点并返回完整 storyGraph，不得只在reply声称已添加。沿用原节点ID、内容、连线、startNodeId和全部entries；entries仅表示首次入场，不是角色在每个事件中的状态，追加事件绝不迁移入口或改写入场认知。本轮只追加画布，不修改人物或其他设定。用户指定父节点时从该节点连接；未指定且存在多个末端时说明选择的延伸位置。新节点应有具体局面变化、人物行动空间和可能后果，不必写完后续故事或提前替玩家作决定。reply描述提案内容，不宣称已保存；写入结果由程序反馈。nextQuestions返回空数组。`;
  const requested = /画布|节点|分支|入场|开场|前情|故事脉络|剧情走向/.test(input.userMessage || '')
    || input.editingContext?.focusedField === 'storyGraph';
  const roleDiscussion = /角色|人物|性格|动机|关系|名字|姓名|形象|外观|补充|加人|悟净|悟空|八戒|唐僧/.test(input.userMessage || '')
    || input.editingContext?.section === '角色与目标' || input.editingContext?.focusedField === 'characters';
  const eventDiscussion = /事件|剧情|冲突|发生|随后|后来|接下来|发现|遇到|阻拦|对决|危机|选择|离开|到达|进驻|打水|收服|决裂|走向|分支/.test(input.userMessage || '')
    || input.editingContext?.section === '事件与分支' || input.editingContext?.focusedField === 'storyGraph';
  if (requested) return CREATOR_STORY_GRAPH_GUIDANCE;
  const hasGraph = input.pendingProposal?.brief?.storyGraph || input.currentDraft?.brief?.storyGraph;
  if (hasGraph) {
    if (roleDiscussion && eventDiscussion) {
      return `已有画布随讨论扩展，最多16个；可分支、汇合，不可循环。沿用稳定节点 ID 与连线。本轮同时涉及人物与剧情事件延伸：请在 proposal.characters 中返回完整角色名单（保留原角色顺序与已有设定，新角色追加在后）；同时若产生新事件节点，请在 brief.storyGraph 中严格沿用已有所有节点 ID 与原有连线结构不变，在末尾或分支追加 1 个新后续节点并连接，可提供新角色入场 entry，切勿推翻或重写已有节点。`;
    }
    if (roleDiscussion) {
      return `已有画布随讨论扩展，最多16个；可分支、汇合，不可循环。沿用稳定节点 ID 与连线。本轮重点在讨论或增补人物（如角色设定、性格、动机）：请聚焦在 proposal.characters 中返回完整名单（保留原角色顺序与已有设定，新角色追加在后）。本轮无需重写整张画布或为所有角色重新编写入场前情，直接省略 brief.storyGraph，原草稿画布将安全保留。新角色的具体入场节点可在后续轮次自然安排，避免单次输出过长导致超时。`;
    }
    if (eventDiscussion) {
      return `已有画布随讨论扩展，最多16个；可分支、汇合，不可循环。沿用稳定节点 ID 与原有连线结构。本轮涉及剧情事件延伸：若要求多分支或不同选择，可为指定父节点追加 2 个及以上的并列分支节点（如该节点的 nextNodeIds 数组包含多个新节点 ID）；若为单线延伸，在末尾追加 1 个新后续节点；不可破坏已有连线，若未修改故事脉络，可省略 brief.storyGraph。`;
    }
    return `已有画布随讨论扩展，最多16个；可分支、汇合，不可循环。沿用稳定节点 ID 与连线。本轮若形成新事件或调整开场，可更新 brief.storyGraph；若未修改故事脉络，可省略 brief.storyGraph。`;
  }
  return `创作按内容成熟度推进，不按固定问卷或固定轮数。只有一句想法时先给少量具体人物动机、关系或场面建议，最多追问一个关键问题，不强求完整故事图、任务表或结局。人物与处境逐渐清楚后，主动帮作者形成关键事件，讨论各人可能的行动和后果，再补影响这些选择的世界边界；不强制所有题材套同一顺序。纯讨论可proposal=null。
本轮若自然形成具体入场场景，可直接提供最小画布，不必等用户点击按钮：proposal.brief.storyGraph={"startNodeId":"opening","nodes":[{"id":"opening","title":"开场名","location":"地点","scene":"具体处境与未决动作","worldFacts":[],"nextNodeIds":[]}],"entries":[{"roleId":"draft-role-0","nodeId":"opening","defaultPath":["opening"],"knownFacts":[],"beliefs":[],"scene":"该角色第一人称入场"}]}。entries按实际人物数组位置分别提供，未知事实不编造，建议不等于已经采纳。没有具体场景时省略storyGraph，不用凑数。`;
}
