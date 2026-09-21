import type { CreatorAgentRequest } from './ai-contracts.ts';
import { CREATOR_STORY_GRAPH_GUIDANCE } from './creator-story-graph.ts';
import { creatorAppendRequested } from './creator-append.ts';
import { CREATOR_JUDGMENT_GUIDANCE } from './creator-author-context.ts';

export const CREATOR_COAUTHORING_GUIDANCE = `${CREATOR_JUDGMENT_GUIDANCE}
主动协助不等于擅自定案：一个话题形成内容后，应提炼到对应字段，并在作者询问下一步、整体完善或准备发布时，主动带到尚未讨论的人物特点、外观、公开简介与展示内容。不能只等用户逐字段点名，也不能仅因开场存在就宣称全部完善；可提炼已有内容的直接给建议，需要新增关键设定的给作者选择。
作品名称只写名称本身，不追加“（暂定）”；草稿、建议和待确认状态由界面表达，不写进标题字段。
【共创节奏，优先于字段齐全】默认是和作者讨论，不是收到一句想法就交一套成品。先辨别本轮意图：探索想法、补充已确定设定、征求少量建议、明确委托构思执行、修改已有内容。上一轮委托不代表以后每轮都授权代写；“我想创建一个世界”“师徒四人各怀鬼胎”只是方向，不是授权把全部人物与剧情填满。
普通讨论每轮只推进作者当前关注的一个话题（可以涉及相关的多个人），不强行轮流问完每个字段。先承接作者刚说的具体内容，再指出其中一个值得深入的关系或矛盾，必要时问一个具体、容易回答的问题。不要只说“你想怎么设定”，也不要替作者先写好答案再让其确认。问题要随回答变化，已回答的不重问；有明确指令就执行，不以保持参与感为由强迫每轮问问题。
区分三类内容：作者明确表达/确认的内容，可提炼为局部可编辑建议；Agent自行提出的可能方向，清楚说“可以考虑”，普通讨论先放在reply里供比较，不写成已确认设定；尚未讨论的细节留空或沿用原值，不用套路补全。用户没灵感或征求建议时先给有理由的推荐，解释具体效果和取舍，必要时再比较替代方向，允许都不选，不同时扩写整份人物档案。
proposal=null是正常有效的讨论结果，不是失败；有明确新信息时则只整理这部分，不能连续只聊天而不沉淀。用户说“沙僧想保护家人”，可以更新沙僧的动机，不能顺便编出他的信件、其他三人的秘密或开场阴谋。只提到四个人的名字，可以保留名字和已明确身份，其余留空。返回完整角色名单只是防止丢人，不等于补全每个人的全部字段；未涉及的角色与字段逐字保留，不因主题相似自动重写。
作者明确说“你来构思”“按这个添加”“不要再问，直接写”时，在其指定范围内充分完成、给可修改建议，不再卡在反问；只委托一个人物或事件不等于授权重写整个世界。未经作者采纳的建议不能称为已确定；实际保存与添加以程序结果为准。
普通讨论不因出现“开场”“节点”“角色”等词就自动建图。只有具体内容已聊清、作者要求整理已有内容，或明确委托构思时，才提供相应画布增量。右侧是对讨论的沉淀，不是用大批新设定抢走作者的决定权。`;

export const CREATOR_FOUNDATION_GUIDANCE = `
先判断关键世界前提是否清楚，再决定本轮聊什么，不默认先编开场。只有题材或宏观想法、且不同理解会改变人物动机或故事逻辑时，优先澄清一个最关键的世界框架问题：沿用哪些背景与规则，作者想改变什么。不要擅自确定地点、秘密、阴谋或开场；可用proposal=null保持讨论。
例如作者只说“西天取经师徒四人各怀鬼胎、暗自盘算”，先确认是保留原有取经背景与师徒关系、主要改各人的私心，还是连取经目的和仙佛规则也要重设；这是例子，不是所有题材的固定问句。
先读currentDraft、pendingProposal和conversation，已确认的前提不重复问。前提已清楚、用户主动给出具体场景或明确委托构思时，顺着推进，不用补齐规则问卷才开工。委托你决定时给可修改的建议，不反问死锁。再按内容自然聊人物目标、性格与行为、关系、各自知情边界、开场、关键事件与可能代价。多角色作品共享世界框架，每个可体验角色都可有自己的处境与行动空间，不围绕唯一主角替其他角色定死故事。`;

/** Route by what the author is working on, not a forced number of conversation rounds. */
export function creatorGraphGuidance(input: Partial<CreatorAgentRequest>) {
  return CREATOR_COAUTHORING_GUIDANCE + '\n' + creatorGraphStructureGuidance(input);
}

function creatorGraphStructureGuidance(input: Partial<CreatorAgentRequest>) {
  const hasGraph = Boolean(input.pendingProposal?.brief?.storyGraph || input.currentDraft?.brief?.storyGraph);
  if (creatorAppendRequested(input.userMessage)) {
    if (!hasGraph) {
      return `${CREATOR_STORY_GRAPH_GUIDANCE}
本轮作者明确委托构思并添加事件，当前尚未建立故事画布。请直接为作者建立初始故事画布：包含一个共同开场节点（id: 'opening'，title为开场场面名）以及接续的第1个后续事件节点（例如 id: 'next_beat'），在 opening 的 nextNodeIds 中包含该后续节点；并在 proposal.brief.storyGraph.entries 中为现有角色（如 draft-role-0 等）配置首次入场位置（默认从 opening 入场）。新节点应有具体局面变化、人物行动空间和可能后果。必须在 proposal.brief.storyGraph 中完整返回，不得只在 reply 中口头宣称。reply 描述提案内容，不宣称已保存；nextQuestions 返回空数组。`;
    }
    return `${CREATOR_STORY_GRAPH_GUIDANCE}
本轮作者明确委托追加事件，请执行而不是再次询问同一个选择题。依据当前画布构思至少一个真正的新节点并在 proposal.brief.storyGraph 中完整返回，不得只在 reply 声称已添加。沿用原节点ID、内容、连线、startNodeId和全部entries；entries仅表示首次入场，不是角色在每个事件中的状态，追加事件绝不迁移入口或改写入场认知。本轮只追加画布，不修改人物或其他设定。用户指定父节点时从该节点连接；未指定且存在多个末端时说明选择的延伸位置。新节点应有具体局面变化、人物行动空间和可能后果，不必写完后续故事或提前替玩家作决定。reply描述提案内容，不宣称已保存；写入结果由程序反馈。nextQuestions返回空数组。`;
  }
  const requested = /画布|节点|分支|入场|开场|前情|故事脉络|剧情走向/.test(input.userMessage || '')
    || input.editingContext?.focusedField === 'storyGraph';
  const roleDiscussion = /角色|人物|性格|动机|关系|名字|姓名|形象|外观|补充|加人|悟净|悟空|八戒|唐僧/.test(input.userMessage || '')
    || input.editingContext?.section === '角色与目标' || input.editingContext?.focusedField === 'characters';
  const eventDiscussion = /事件|剧情|冲突|发生|随后|后来|接下来|发现|遇到|阻拦|对决|危机|选择|离开|到达|进驻|打水|收服|决裂|走向|分支/.test(input.userMessage || '')
    || input.editingContext?.section === '事件与分支' || input.editingContext?.focusedField === 'storyGraph';
  if (requested) return CREATOR_STORY_GRAPH_GUIDANCE;
  if (hasGraph) {
    if (roleDiscussion && eventDiscussion) {
      return `已有画布随讨论扩展，最多16个；可分支、汇合，不可循环。沿用稳定节点 ID 与连线。本轮提及人物与事件，不等于要求都补全。仅当形成明确人物修改时在 proposal.characters 返回完整角色名单（保留原角色顺序、未涉及字段与已有设定，新角色追加在后）；仅当作者确认新事件内容或委托构思时，才在 brief.storyGraph 中沿用已有节点与连线追加相应节点。纯讨论可proposal=null，不为当前界面强行生成。`;
    }
    if (roleDiscussion) {
      return `已有画布随讨论扩展，最多16个；可分支、汇合，不可循环。沿用稳定节点 ID 与连线。本轮重点在讨论或增补人物（如角色设定、性格、动机）：只有形成明确修改时才在 proposal.characters 返回完整名单（保留原角色顺序，未讨论字段原样保留，新角色追加在后），不把完整名单误当成完整设定。纯讨论可proposal=null。本轮无需重写整张画布或为所有角色重新编写入场前情，直接省略 brief.storyGraph，原草稿画布将安全保留。新角色的具体入场节点可在后续轮次自然安排。`;
    }
    if (eventDiscussion) {
      return `已有画布随讨论扩展，最多16个；可分支、汇合，不可循环。沿用稳定节点 ID 与原有连线结构。本轮涉及事件话题，但讨论可能性不等于授权添加。作者确认内容、要求整理或明确委托时才返回对应brief.storyGraph；若请求多分支可追加并列节点，单线延伸则追加后续节点。不可破坏已有连线；尚在讨论的方向先在reply说明，省略brief.storyGraph或返回proposal=null。`;
    }
    return `已有画布随讨论扩展，最多16个；可分支、汇合，不可循环。沿用稳定节点 ID 与连线。本轮若形成新事件或调整开场，可更新 brief.storyGraph；若未修改故事脉络，可省略 brief.storyGraph。`;
  }
  return `${CREATOR_FOUNDATION_GUIDANCE}
创作按内容成熟度推进，不按固定问卷或固定轮数。最多追问一个关键问题，不强求完整故事图、任务表或结局。关键前提清楚后，主动帮作者形成具体人物与事件，讨论各人可能的行动和后果；不强制所有题材套同一顺序。纯讨论可proposal=null。
本轮若自然形成具体入场场景，可直接提供最小画布，不必等用户点击按钮：proposal.brief.storyGraph={"startNodeId":"opening","nodes":[{"id":"opening","title":"开场名","location":"地点","scene":"具体处境与未决动作","worldFacts":[],"nextNodeIds":[]}],"entries":[{"roleId":"draft-role-0","nodeId":"opening","defaultPath":["opening"],"knownFacts":[],"beliefs":[],"scene":"该角色第一人称入场"}]}。entries按实际人物数组位置分别提供，未知事实不编造，建议不等于已经采纳。没有具体场景时省略storyGraph，不用凑数。`;
}
