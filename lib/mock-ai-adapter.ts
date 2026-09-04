import {
  AI_CONTRACT_VERSION,
  type AgentMemory,
  type AIAdapter,
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

function slug(value: string, index: number) {
  return value.trim().toLowerCase().replace(/\s+/g, '-') || `character-${index + 1}`;
}

class MockAIAdapter implements AIAdapter {
  async talkToPersonalAgent(input: PersonalAgentRequest): Promise<PersonalAgentResponse> {
    const memory = createMemory(input.userMessage, input.currentMemories);
    return Promise.resolve({
      reply: `我记下了“${input.userMessage}”。${recommendationReason(input.userMessage)}。你也可以继续告诉我更在意角色、节奏还是意外。`,
      memoryCandidates: [memory],
      recommendations: [{
        worldId: 'storm-manor',
        reason: recommendationReason(input.userMessage),
        matchedMemoryIds: [memory.id],
      }],
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
        endingConditions: [{ id: 'core-choice', description: '确认关键事实，并对核心关系或事件作出明确选择。', requiredFacts: ['核心事件的真实动机', '至少一名角色隐瞒的信息'] }],
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
      return Promise.resolve({
        actionDecision: { allowed: false, reason: validation.reason, suggestedAlternative: validation.suggestion },
        narrative: '',
        dialogue: [],
        statePatch: { committedFacts: [] },
        nextChoices: input.currentScene.choices,
        image: { required: false, reason: 'reuse', sceneId: input.currentScene.id },
        ending: { reached: false, canContinue: true },
      });
    }

    const nextTurn = input.state.turn + 1;
    const worldKind = input.world.id === 'storm-manor' ? 'storm' : 'draft';
    const incident = input.nextScene ? selectIncident(worldKind, input.world.surpriseLevel, nextTurn) : null;
    const actionResult = selectedChoice?.outcomeHint || `你选择了“${input.userAction}”，世界记住了这个行动。`;
    const narrative = input.nextScene ? `${actionResult}\n\n${input.nextScene.narrative}` : actionResult;
    const sceneChanged = Boolean(input.nextScene && input.nextScene.id !== input.currentScene.id);
    const imageRequired = sceneChanged || incident?.impact === 'major';
    const imageReason = incident?.impact === 'major' ? 'major_event' : sceneChanged ? 'location_changed' : 'reuse';
    const visibleCharacters = input.world.characters
      .map((character) => `${character.name}（${character.identity}，${character.persona}）`)
      .join('、');
    return Promise.resolve({
      actionDecision: { allowed: true },
      narrative: incident ? `${narrative}\n\n意外发生·${incident.title}\n${incident.narrative}` : narrative,
      dialogue: input.nextScene?.dialogue && input.nextScene.speakerCharacterId
        ? [{ characterId: input.nextScene.speakerCharacterId, text: input.nextScene.dialogue, visibleToRoleIds: [input.selectedRoleId] }]
        : [],
      statePatch: {
        locationId: input.nextScene?.title,
        addClues: selectedChoice?.statePatchHint?.addClues ?? (selectedChoice ? [selectedChoice.intent] : ['你的自由行动改变了调查方向']),
        relationshipDeltas: selectedChoice?.statePatchHint?.relationshipDeltas ?? { world: selectedChoice ? 5 : 3 },
        committedFacts: [actionResult],
      },
      nextChoices: input.nextScene?.choices ?? [],
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
      ending: { reached: !input.nextScene, endingId: input.nextScene ? undefined : `${worldKind}-ending-${nextTurn}`, canContinue: true },
    });
  }
}

export const mockAIAdapter: AIAdapter = new MockAIAdapter();
export { AI_CONTRACT_VERSION };
