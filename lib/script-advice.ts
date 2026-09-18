/**
 * Dynamic dramatic script advice engine based on xgen-craft-7 screenwriting principles.
 * Analyzes world title, discovery genre, premise crisis, characters, and plot structure
 * to generate actionable, context-aware dramatic suggestions.
 */

export interface ScriptAdviceItem {
  id: string;
  category: 'conflict' | 'character' | 'stakes' | 'genre';
  badge: string;
  title: string;
  content: string;
  prompt: string;
}

export interface ScriptAdviceContext {
  title?: string;
  genre?: string;
  premise?: string;
  roles?: Array<{
    name: string;
    identity?: string;
    personality?: string;
    relationship?: string;
    goal?: string;
  }>;
  hasGraph?: boolean;
}

export function generateScriptAdvice(context: ScriptAdviceContext): ScriptAdviceItem[] {
  const { title = '', genre = '', premise = '', roles = [], hasGraph = false } = context;
  const items: ScriptAdviceItem[] = [];

  const rawTitle = title.trim() || '这部作品';
  const rawGenre = genre.trim() || '当前故事';
  const roleCount = roles.length;
  const premiseText = premise.trim();

  // 1. Conflict & Urgency (反常处境与危机倒计时)
  const hasCountdown = /倒计时|限时|截止|黎明|天亮|今夜|午夜|几日|小时|即将|最后|期限/.test(premiseText);
  if (!premiseText) {
    items.push({
      id: 'conflict-empty',
      category: 'conflict',
      badge: '【反常处境起步】',
      title: '缺少具体的开局冲突处境',
      content: `当前尚未确立开局背景。编剧法则建议：先抓一个具体的反常处境（谁正在争什么、谁会因此失去什么、为什么现在必须行动），而不是空泛的世界史。`,
      prompt: `请帮《${rawTitle}》设计一个抓人眼球的开局反常处境，交代谁正在争夺关键利益、谁面临致命威胁，以及主角入场第一步必须做什么。`,
    });
  } else if (!hasCountdown) {
    items.push({
      id: 'conflict-urgency',
      category: 'conflict',
      badge: '【危机倒计时】',
      title: '为当前危机增加硬性时间压迫',
      content: `当前背景交代了冲突事件，但缺少迫使主角“为什么不得不在此刻行动”的紧迫倒计时。建议引入一个自然或人为的时间锁（如暴雨倒灌、潮汐封路、解药时限），倒逼第一步抉择。`,
      prompt: `围绕当前开局危机（${premiseText.slice(0, 60)}…），请为《${rawTitle}》设计一个具有紧迫压力的“时间锁/倒计时机制”，并给出第一幕的冲突升级方案。`,
    });
  } else {
    items.push({
      id: 'conflict-escalation',
      category: 'conflict',
      badge: '【危机次生连锁】',
      title: '设计表层危机背后的深层异变',
      content: `已有倒计时机制，但单一危机容易走向机械通关。建议设计“解决表层危机却意外触碰更大禁忌”的次生反转，让阶段性胜利转化为更艰险的处境。`,
      prompt: `在当前危机倒计时框架下，请为《${rawTitle}》设计一次出人意料的次生危机反转：当主角完成初步行动后，局势反而因何种秘密暴露而陷入更深绝境？`,
    });
  }

  // 2. Cast Dynamics (角色博弈与对立暗流)
  if (roleCount === 0) {
    items.push({
      id: 'char-empty',
      category: 'character',
      badge: '【核心主角设立】',
      title: '确立具有强烈欲望与软肋的核心角色',
      content: `故事尚未登场角色。建议先设定 1 名核心体验角色，明确他不可退让的核心欲望、致命软肋，以及开局必须达成的直接目标。`,
      prompt: `请为《${rawTitle}》（题材：${rawGenre}）设计 1 位具有反差魅力和强烈动机的核心主角，给出姓名、身份、性格反差、不可告人的秘密及第一目标。`,
    });
  } else if (roleCount === 1) {
    const mainRole = roles[0];
    items.push({
      id: 'char-antagonist',
      category: 'character',
      badge: '【对立面引入】',
      title: `为${mainRole.name || '主角'}引入互为镜像的对立角色`,
      content: `单人行缺乏戏剧张力。优秀剧本需要对手戏：建议引入一个利益截然相反的制约者，或一个掌握关键真相的神秘盟友，与主角形成信息差和试探博弈。`,
      prompt: `请为《${rawTitle}》中的角色「${mainRole.name || '主角'}」设计一个立场对立或暗中制约的重要新角色，说明二人的利益冲突、对立原因与初次交锋场面。`,
    });
  } else {
    items.push({
      id: 'char-secrets',
      category: 'character',
      badge: '【隐秘利益与背刺风险】',
      title: '为现有角色注入互不相容的秘密目标',
      content: `当前已有 ${roleCount} 位角色。建议避免将他们写成单纯的“主角跟班”或“纯粹恶人”，让每个人都有属于自己的代价账本与隐瞒事项，促使对话充满要价与试探。`,
      prompt: `请针对现有角色名单（${roles.map(r => r.name).filter(Boolean).join('、')}），为他们各自梳理出一条未公开的隐藏动机，并设计一场利益冲突激化的对手戏。`,
    });
  }

  // 3. Stakes & Dilemma (核心代价与两难抉择)
  if (!hasGraph) {
    items.push({
      id: 'stakes-dilemma',
      category: 'stakes',
      badge: '【两难抉择与代价】',
      title: '设计不可两全的戏剧高潮抉择',
      content: `好故事不靠无伤通关。建议为剧情转折点设计一个必须付出代价的抉择：例如在“保全至亲”与“守住全岛安危”之间，任何选择都伴随着不可挽回的失去。`,
      prompt: `请为《${rawTitle}》设计一个戏剧高潮处的“残酷两难抉择”：列出两个不可兼得的选项、各自的不可挽回代价，以及由此引向的截然不同的故事走向。`,
    });
  } else {
    items.push({
      id: 'stakes-payoff',
      category: 'stakes',
      badge: '【伏笔回收与高潮兑现】',
      title: '将前期线索收拢至终局对决',
      content: `故事画布已建立分支。检查此前埋下的不可变规则与角色弱点，是否在最终节点得到戏剧性爆发。反转应当让读者恍然大悟，而非天降神力。`,
      prompt: `请梳理《${rawTitle}》的故事画布，指出终局节点如何回收开局伏笔，并结合既有角色的隐秘弱点，设计一场逻辑自洽又震撼的高潮戏。`,
    });
  }

  // 4. Genre Specific Breakthrough (题材专属破局点)
  if (genre.includes('悬疑') || genre.includes('惊悚')) {
    items.push({
      id: 'genre-mystery',
      category: 'genre',
      badge: '【悬疑破局·不可靠叙述】',
      title: '制造一条关键证物的认知偏差',
      content: `悬疑剧的核心在于信息差。建议设定开局人人都深信不疑的某个“铁证”，其实早已被调包或存在误读，以此掀起真正的心理惊悚风暴。`,
      prompt: `结合《${rawTitle}》的悬疑氛围，设计一条贯穿始终但被全员误读的“关键证物”或“伪不在场证明”，说明真相揭晓时的反转逻辑。`,
    });
  } else if (genre.includes('古风') || genre.includes('历史')) {
    items.push({
      id: 'genre-historical',
      category: 'genre',
      badge: '【古风破局·皇权与暗流】',
      title: '将个人恩怨与更大棋局相绑定',
      content: `古风剧本最忌格局偏仄。建议将主角当下的遭遇与朝堂党争、藩王博弈或尘封前朝旧案暗中绑定，让眼前的每一次抗争都成为风暴中心的棋子搏命。`,
      prompt: `请为《${rawTitle}》注入一层更深厚的古风权谋/暗流背景：主角眼前遭遇的危机背后，究竟牵扯着朝廷或江湖哪个大势力的博弈？`,
    });
  } else if (genre.includes('爽剧') || genre.includes('逆袭')) {
    items.push({
      id: 'genre-face-slap',
      category: 'genre',
      badge: '【爽感破局·压迫与打脸】',
      title: '强化前期压迫感与破局反击底牌',
      content: `逆袭爽剧要极致释放，必须先让压迫感真实窒息。设计反派全方位的资源剥夺，同时为主角埋下一张不为人知、需要特定条件才能触发的翻盘王牌。`,
      prompt: `请为《${rawTitle}》设计一段极具戏剧反差的逆袭打脸桥段：反派如何在众目睽睽下步步紧逼，主角又是如何借由隐秘底牌完成惊天逆转。`,
    });
  }

  return items.slice(0, 3);
}
