import {
  AI_CONTRACT_VERSION,
  type AgentMemory,
  type AIAdapter,
  type CreatorAgentRequest,
  type CreatorAgentResponse,
  type CreatorBrief,
  type PersonalAgentRequest,
  type PersonalAgentResponse,
  type WorldGenerationRequest,
  type WorldGenerationResponse,
  type WorldTurnRequest,
  type WorldTurnResponse,
} from '@/lib/ai-contracts';
import { selectIncident } from '@/lib/surprise-engine';
import { validateAction } from '@/lib/world-state';

function createMemory(message: string, existing: AgentMemory[]): AgentMemory {
  const category = /悬疑|推理|谜/.test(message)
    ? 'genre'
    : /关系|角色|人物/.test(message)
      ? 'character'
      : /意外|随机|平稳/.test(message)
        ? 'surprise'
        : 'interaction';
  return {
    id: `memory-${existing.length + 1}`,
    category,
    value: message,
    confidence: 1,
    source: 'explicit',
    requiresConfirmation: false,
  };
}

function recommendationReason(message: string) {
  if (/关系|角色|人物/.test(message)) return '因为你希望从人物关系和各自隐瞒的信息中推进故事';
  if (/平稳|日常/.test(message)) return '因为你更看重人物和线索的稳定展开，而不是连续突发事件';
  if (/意外|随机|离谱/.test(message)) return '因为你愿意让合理的突发事件改变原本的调查路线';
  return '因为这个世界允许你通过观察、询问和自由行动真正改变结果';
}

function chooseWorld(message: string, input: PersonalAgentRequest) {
  const preferredId = /合租|都市|日常|室友|关系/.test(message)
    ? 'sixth-roommate'
    : /海上|列车|冒险|旅行/.test(message)
      ? 'sea-train'
      : 'storm-manor';
  return input.availableWorlds.find((world) => world.id === preferredId)
    ?? input.availableWorlds[0]
    ?? { id: input.availableWorldIds[0] || 'storm-manor', title: '暴雨山庄：缺席的继承人' };
}

function slug(value: string, index: number) {
  return value.trim().toLowerCase().replace(/\s+/g, '-') || `character-${index + 1}`;
}

function buildCreatorBrief(input: CreatorAgentRequest): CreatorBrief {
  const current = input.currentDraft.brief;
  const names = input.characters.map((character) => character.name || character.identity).filter(Boolean);
  const subject = input.currentDraft.premise.trim() || input.userMessage.trim() || `${names.join('、')}进入同一场冲突`;
  const existingTasks = current.tasks.length > 0 ? current.tasks : [
    {
      id: 'task-establish',
      title: '确认各方真实诉求',
      description: '通过观察或对话，找出每个人最想得到与最害怕失去的东西。',
      kind: 'main' as const,
      prerequisiteTaskIds: [],
      successCondition: '至少确认两名角色的真实立场',
      difficulty: '角色会因自身利益保留关键信息',
    },
    {
      id: 'task-breakthrough',
      title: '突破关系或现实障碍',
      description: `找到推动“${subject.slice(0, 42)}”的条件，不能只用一句宣告跳到结果。`,
      kind: 'main' as const,
      prerequisiteTaskIds: ['task-establish'],
      successCondition: '获得至少一个可验证的关键条件',
      difficulty: '快速捷径会引发代价，需要交换信任、资源或风险',
    },
    {
      id: 'task-final-choice',
      title: '完成目标并承担代价',
      description: '在条件具备后作出最终行动，让世界根据之前的事实给出结局。',
      kind: 'main' as const,
      prerequisiteTaskIds: ['task-breakthrough'],
      successCondition: '核心目标达成，且一个关键代价已被确认',
      difficulty: '不同角色的目标存在冲突，不会所有人同时满意',
    },
  ];
  return {
    coreGoal: current.coreGoal || `推动“${subject.slice(0, 52)}”并让所选角色达成自己的目标`,
    preferredDirection: current.preferredDirection || '',
    alternativeDirection: current.alternativeDirection || '',
    complexityLevel: current.complexityLevel || 2,
    tasks: existingTasks,
    difficulties: current.difficulties.length > 0
      ? current.difficulties
      : ['信息分散在不同角色手中', '关键行动需要先取得信任或工具', '捷径可行，但会引发明确代价'],
    scheduledEvents: current.scheduledEvents.length > 0
      ? current.scheduledEvents
      : [{ title: '外部压力逼近', trigger: '当玩家停滞或接近关键任务时', effect: '改变可用路线与角色立场，但不直接交付答案' }],
  };
}

class MockAIAdapter implements AIAdapter {
  async talkToPersonalAgent(input: PersonalAgentRequest): Promise<PersonalAgentResponse> {
    const memory = createMemory(input.userMessage, input.currentMemories);
    const chosenWorld = chooseWorld(input.userMessage, input);
    const reason = `${recommendationReason(input.userMessage)}，所以我更推荐《${chosenWorld.title}》`;
    return Promise.resolve({
      reply: `我记下了“${input.userMessage}”。${reason}。你也可以继续告诉我更在意角色、节奏还是意外。`,
      memoryCandidates: [memory],
      recommendations: [{
        worldId: chosenWorld.id,
        reason,
        matchedMemoryIds: [memory.id],
      }],
    });
  }

  async coCreateWorld(input: CreatorAgentRequest): Promise<CreatorAgentResponse> {
    const brief = buildCreatorBrief(input);
    const title = input.currentDraft.title.trim() || `${input.characters[0]?.name || '主角'}的选择`;
    const premise = input.currentDraft.premise.trim() || input.userMessage.trim();
    return Promise.resolve({
      reply: `我把你刚才的想法先收敛成“目标—条件—代价”。核心不是预先定好玩多久，而是让玩家必须完成 ${brief.tasks.filter((task) => task.kind === 'main').length} 个主线条件才能抵达结局。你可以先采纳，再继续让我加副线、时限或角色冲突。`,
      proposal: { title, premise, brief },
      nextQuestions: ['玩家最终获得什么？', '哪个角色最希望阻止他？', '走捷径应该付出什么代价？'],
      readiness: premise ? 'ready' : 'needs_detail',
    });
  }

  async generateWorld(input: WorldGenerationRequest): Promise<WorldGenerationResponse> {
    const roleNames = input.characters.map((character, index) => character.name.trim() || `角色 ${index + 1}`);
    const leadName = roleNames[0] ?? '主角';
    const counterpartName = roleNames[1] ?? '另一位当事人';
    const seed = input.storySeed?.trim() || `${roleNames.join('、')}被卷入同一场尚未解决的事件，每个人都知道一部分真相。`;
    const title = input.creatorIntent?.trim() || `${leadName}与${counterpartName}的一天`;
    const characters = input.characters.map((character, index) => ({
      id: slug(character.name, index),
      name: character.name || `角色 ${index + 1}`,
      identity: character.identity || '身份待补全',
      persona: character.persona || '性格待补全',
      publicBackground: `${character.name || `角色 ${index + 1}`}以${character.identity || '当事人'}的身份身处事件中心，与其他人存在尚未说清的关系。`,
      privateKnowledge: [`${character.name || `角色 ${index + 1}`}知道一条会改变大家对“${seed.slice(0, 42)}”判断的信息。`],
      secrets: [`一件与${input.relationshipNotes[index] || '当前人物关系'}有关、暂时不能公开的往事。`],
      goal: index === 0
        ? `弄清“${seed.slice(0, 52)}”背后的真实动机，并决定是否帮助${counterpartName}。`
        : `在事件失控前保护自己的核心利益，同时判断是否能够信任${leadName}。`,
      startLocationId: 'opening-location',
      imagePrompt: `${character.identity || '事件当事人'}，${character.persona || '神情克制而警觉'}，${character.name || `角色 ${index + 1}`}，现代现实主义电影角色立绘，明确年龄、发型、服装和随身物品，半身像，无文字无水印`,
    }));
    const premise = `${seed}\n\n故事从一次无法回避的正面相遇开始。${roleNames.join('、')}都带着各自的目标进入现场：表面上，他们需要一起处理眼前的问题；实际上，每个人都在衡量应该公开多少真相。体验者选择其中任意角色后，都将从这个角色掌握的信息和关系位置出发，经历不同的调查、对话与抉择。`;
    const draftTasks = input.creatorBrief.tasks.length > 0
      ? input.creatorBrief.tasks
      : buildCreatorBrief({
        contractVersion: AI_CONTRACT_VERSION,
        userMessage: seed,
        conversation: [],
        characters: input.characters,
        relationshipNotes: input.relationshipNotes,
        currentDraft: { title, premise: seed, surpriseLevel: input.surpriseLevel, brief: input.creatorBrief },
      }).tasks;
    const tasks = draftTasks.map((task) => ({
      ...task,
      assignedRoleIds: characters.map((character) => character.id),
    }));
    const mainTaskIds = tasks.filter((task) => task.kind === 'main').map((task) => task.id);
    return Promise.resolve({
      world: {
        id: `draft-${slug(title, 0)}`,
        title,
        premise,
        timeSetting: '事件矛盾即将公开化的当天',
        locations: [
          { id: 'opening-location', name: '最初的会面现场', description: '所有角色第一次正面面对核心矛盾的地方。', connectedLocationIds: ['private-space', 'truth-location'] },
          { id: 'private-space', name: '可以私下交谈的空间', description: '角色能够结盟、试探或交换秘密的地方。', connectedLocationIds: ['opening-location', 'truth-location'] },
          { id: 'truth-location', name: '关键证据所在处', description: '一条足以改变人物关系的事实将在这里被发现。', connectedLocationIds: ['opening-location', 'private-space'] },
        ],
        characters,
        relationships: characters.slice(1).map((character, index) => ({
          fromCharacterId: characters[0]?.id ?? 'character-1',
          toCharacterId: character.id,
          publicLabel: input.relationshipNotes[index] || '彼此有所隐瞒的同行者',
          initialTrust: 42,
        })),
        rules: [
          { id: 'physical-consistency', description: '所有事件遵守现实物理规律，不能瞬移、穿墙或凭空获得物品。', kind: 'physical', immutable: true },
          { id: 'limited-knowledge', description: '角色只能根据身份、经历、对话和已发现线索行动。', kind: 'knowledge', immutable: true },
          { id: 'surprise-boundary', description: '意外可以改变路线和压力，但不能推翻已经发生的事实。', kind: 'story', immutable: true },
        ],
        coreEvent: seed,
        surpriseLevel: input.surpriseLevel,
        goals: [{
          id: 'world-goal',
          title: input.creatorBrief.coreGoal || '解决核心事件',
          description: input.creatorBrief.preferredDirection || '根据人物与事件继续推演',
          scope: 'world',
          requiredTaskIds: mainTaskIds,
        }],
        tasks,
        difficultyConstraints: input.creatorBrief.difficulties.map((description, index) => ({
          id: `difficulty-${index + 1}`,
          description,
          blocksTaskId: mainTaskIds[Math.min(index, mainTaskIds.length - 1)],
          bypassCondition: draftTasks[Math.min(index, draftTasks.length - 1)]?.successCondition || '找到合理条件',
          consequence: '强行跳过会失败、损失信任或触发新风险',
        })),
        scheduledEvents: input.creatorBrief.scheduledEvents.map((event, index) => ({
          id: `scheduled-${index + 1}`,
          ...event,
          earliestTurn: Math.max(2, index + 2),
        })),
        endingConditions: [input.creatorBrief.preferredDirection, input.creatorBrief.alternativeDirection].flatMap((description, index) => description ? [{ id: `core-direction-${index}`, description, requiredTaskIds: [], requiredFacts: [description] }] : []),
        openingScene: {
          locationId: 'opening-location',
          narrative: `${premise}\n\n此刻，${leadName}先察觉到现场气氛不对：${counterpartName}的反应与平时不同，而另一名在场者似乎故意把一个重要细节轻描淡写地带过。没有超自然力量替任何人解释动机，也没有凭空出现的答案；能推动故事的，只有体验者接下来选择相信谁、追问什么，以及愿意承担怎样的关系后果。`,
          presentCharacterIds: characters.map((character) => character.id),
          choices: [
            { id: 'ask-directly', label: `直接追问${counterpartName}刚才隐瞒了什么`, intent: '从即时反应中判断对方的真实立场' },
            { id: 'observe-room', label: '先不表态，观察每个人在意的细节', intent: '找出谁最害怕某个事实被发现' },
            { id: 'seek-private-talk', label: `邀请${counterpartName}单独谈谈`, intent: '建立临时同盟并交换有限的信息' },
          ],
        },
      },
      storyOutline: [
        { id: 'outline-1', title: '无法回避的会面', location: '最初的会面现场', objective: '确认每个人公开表达的诉求', turningPoint: `${counterpartName}的说法与一个可验证的细节发生冲突` },
        { id: 'outline-2', title: '各自保留的真相', location: '可以私下交谈的空间', objective: `决定是否与${counterpartName}交换信息`, turningPoint: '一次私下谈话暴露了人物关系中长期存在的不平衡' },
        { id: 'outline-3', title: '意外打乱原计划', location: '关键证据所在处', objective: '在合理的突发事件后重新找到关键线索', turningPoint: `新证据表明“${seed.slice(0, 45)}”并非所有人的真实目的` },
        { id: 'outline-4', title: '关系与真相的选择', location: '最初的会面现场', objective: '决定公开真相、保护某人，或寻找第三种解决方法', turningPoint: '最后的选择将决定人物关系是否还能维持' },
      ],
      generationNotes: ['已根据输入的角色、关系和故事种子动态补全目标、秘密、场景连接和结局条件。', '意外只改变过程，不破坏世界规则。'],
      unresolvedQuestions: [],
    });
  }

  async advanceWorld(input: WorldTurnRequest, signal?: AbortSignal): Promise<WorldTurnResponse> {
    if (signal?.aborted) throw new DOMException('Generation aborted', 'AbortError');
    const validation = validateAction(input.userAction, input.state, input.currentScene.choices.map((choice) => choice.label));
    const selectedChoice = input.currentScene.choices.find((choice) => choice.label === input.userAction);
    if (!validation.allowed) {
      const completedTaskIds = input.state.completedTaskIds ?? [];
      return Promise.resolve({
        actionDecision: { allowed: false, reason: validation.reason, suggestedAlternative: validation.suggestion },
        narrative: '',
        dialogue: [],
        statePatch: { committedFacts: [] },
        nextChoices: input.currentScene.choices,
        image: { required: false, reason: 'reuse', sceneId: input.currentScene.id },
        goalProgress: {
          activeTaskIds: input.world.tasks
            .filter((task) => task.kind === 'main'
              && !completedTaskIds.includes(task.id)
              && task.prerequisiteTaskIds.every((id) => completedTaskIds.includes(id)))
            .map((task) => task.id),
          completedTaskIds,
          summary: '行动未通过，任务进度未改变',
        },
        ending: { reached: false, canContinue: true },
      });
    }

    const nextTurn = input.state.turn + 1;
    const worldKind = input.world.id === 'storm-manor' ? 'storm' : 'draft';
    const incident = selectIncident(worldKind, input.world.surpriseLevel, nextTurn);
    const actionResult = selectedChoice?.outcomeHint || `你选择了“${input.userAction}”，世界记住了这个行动。`;
    const sceneChanged = Boolean(input.nextScene && input.nextScene.id !== input.currentScene.id);
    const imageRequired = sceneChanged || incident?.impact === 'major';
    const imageReason = incident?.impact === 'major' ? 'major_event' : sceneChanged ? 'location_changed' : 'reuse';
    const visibleCharacters = input.world.characters
      .map((character) => `${character.name}（${character.identity}，${character.persona}）`)
      .join('、');
    const completedBefore = input.state.completedTaskIds ?? [];
    const availableTasks = input.world.tasks.filter((task) => task.kind === 'main'
      && !completedBefore.includes(task.id)
      && task.prerequisiteTaskIds.every((id) => completedBefore.includes(id)));
    const completedNow = availableTasks[0] ? [availableTasks[0].id] : [];
    const completedAfter = [...new Set([...completedBefore, ...completedNow])];
    const requiredTaskIds = input.world.goals[0]?.requiredTaskIds ?? input.world.tasks.filter((task) => task.kind === 'main').map((task) => task.id);
    const endingReached = requiredTaskIds.length > 0 && requiredTaskIds.every((id) => completedAfter.includes(id));
    const remainingTasks = input.world.tasks.filter((task) => task.kind === 'main' && !completedAfter.includes(task.id));
    const selectedCharacter = input.world.characters.find((character) => character.id === input.selectedRoleId) ?? input.world.characters[0];
    const nonPlayerCharacters = input.world.characters.filter((character) => character.id !== input.selectedRoleId);
    const counterpart = nonPlayerCharacters[0] ?? selectedCharacter;
    const activeTask = availableTasks[0];
    const nextTask = remainingTasks.find((task) => task.prerequisiteTaskIds.every((id) => completedAfter.includes(id)));
    const narrative = `${actionResult}\n\n${input.nextScene?.narrative ?? `行动发生在${input.currentScene.title}。${selectedCharacter?.name ?? '体验者'}没有被送往一段预先写好的下一幕；现场的人依据自己的身份、目标和已经发生的事实作出回应。${counterpart?.name ?? '另一名角色'}先观察你的准备是否真实，再决定公开多少信息。空气中的迟疑并没有消失，反而让一个此前被忽略的现实条件变得清楚：任何捷径都会损失信任、证据或可用时间。`}\n\n当前可推进的是“${activeTask?.title ?? nextTask?.title ?? '处理行动造成的新局面'}”。你的选择带来了可以继续验证的结果，但没有自动替你完成尚未满足的条件。与此同时，${nonPlayerCharacters.map((character) => character.name).join('、') || '其他角色'}也在看不见的时间里调整各自计划；他们可能合作，也可能利用你刚暴露的信息抢先行动。下一步需要决定继续核对事实、与关键人物交换条件，还是承担代价改变路线。`;
    const dialogueCharacters = nonPlayerCharacters.length > 0 ? nonPlayerCharacters : [selectedCharacter].filter(Boolean);
    const dialogue = [
      { characterId: dialogueCharacters[0]?.id ?? input.selectedRoleId, text: `“你可以这样做，但别把行动当成结果。先让我看看你能拿出什么条件。”`, visibleToRoleIds: [input.selectedRoleId] },
      { characterId: dialogueCharacters[1]?.id ?? dialogueCharacters[0]?.id ?? input.selectedRoleId, text: `“世界已经记下刚才的变化。再走一步，其他人的立场也会跟着变。”`, visibleToRoleIds: [input.selectedRoleId] },
    ];
    const nextChoices = input.nextScene?.choices && input.nextScene.choices.length >= 3
      ? input.nextScene.choices
      : [
        { id: `verify-${nextTurn}`, label: `${selectedCharacter?.name ?? '体验者'}：核对刚获得的信息，确认它能否推进当前任务`, intent: '验证事实并避免被误导' },
        { id: `negotiate-${nextTurn}`, label: `${selectedCharacter?.name ?? '体验者'}：找${counterpart?.name ?? '关键人物'}交换有限条件`, intent: '在不泄露底牌的情况下建立合作' },
        { id: `observe-${nextTurn}`, label: `${selectedCharacter?.name ?? '体验者'}：暂缓表态，观察其他角色正在推进什么`, intent: '识别非玩家角色的下一步' },
      ];
    return Promise.resolve({
      actionDecision: { allowed: true },
      narrative: incident ? `${narrative}\n\n意外发生·${incident.title}\n${incident.narrative}` : narrative,
      dialogue,
      statePatch: {
        locationId: input.nextScene?.title,
        addClues: selectedChoice?.statePatchHint?.addClues ?? (selectedChoice ? [selectedChoice.intent] : ['你的自由行动改变了调查方向']),
        completeTaskIds: completedNow,
        taskNotes: availableTasks[0] ? { [availableTasks[0].id]: `通过行动“${input.userAction}”推进` } : {},
        characterUpdates: Object.fromEntries(input.world.characters
          .filter((character) => character.id !== input.selectedRoleId)
          .map((character) => [character.id, { status: '同步推进个人目标', lastAction: '根据当前信息调整下一步' }])),
        relationshipDeltas: selectedChoice?.statePatchHint?.relationshipDeltas ?? { world: selectedChoice ? 5 : 3 },
        committedFacts: [actionResult],
      },
      nextChoices,
      incident: incident ?? undefined,
      image: {
        required: imageRequired,
        reason: imageReason,
        sceneId: input.nextScene?.id ?? `ending-${nextTurn}`,
        prompt: imageRequired
          ? `${input.world.title}，${input.nextScene?.title ?? '结局场景'}。${narrative}${incident ? ` ${incident.title}：${incident.narrative}` : ''}。角色：${visibleCharacters}。电影感叙事插画，横向构图，暗色氛围，人物外观连续一致，无文字无水印。`
          : undefined,
        reuseAssetId: imageRequired ? undefined : `${worldKind}-cover`,
      },
      goalProgress: {
        activeTaskIds: remainingTasks.filter((task) => task.prerequisiteTaskIds.every((id) => completedAfter.includes(id))).map((task) => task.id),
        completedTaskIds: completedAfter,
        summary: endingReached ? '核心目标的所有必要条件已达成' : `已完成 ${completedAfter.length}/${requiredTaskIds.length} 个主线条件`,
      },
      ending: { reached: endingReached, endingId: endingReached ? `${worldKind}-ending-${nextTurn}` : undefined, canContinue: true },
    });
  }
}

export const mockAIAdapter: AIAdapter = new MockAIAdapter();
export { AI_CONTRACT_VERSION };
