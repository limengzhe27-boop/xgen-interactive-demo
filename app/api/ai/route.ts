import { AI_CONTRACT_VERSION } from '@/lib/ai-contracts';
import {
  isCreatorAgentResponse,
  isPersonalAgentResponse,
  isWorldGenerationResponse,
  isWorldTurnRequest,
  isWorldTurnResponse,
} from '@/lib/ai-validation';
import { enforceWorldTurnGuardrails, makeRejectedWorldTurn } from '@/lib/world-agent-guardrails';
import { validateAction } from '@/lib/world-state';

type Operation = 'personal-agent' | 'co-create-world' | 'generate-world' | 'advance-world';
type DeepSeekProvider = { apiKey: string; endpoint: string; model: string };

const operationInstructions: Record<Operation, string> = {
  'personal-agent': `你是用户的个人 Agent，只根据输入中明确给出的偏好和体验记录了解用户，不猜测敏感信息。你必须阅读 availableWorlds，并从中选择最符合用户本轮要求的世界；不得推荐列表外的 worldId。回复中说清匹配的题材、人物关系或意外程度。输出 JSON：
{"reply":"简洁中文回复","memoryCandidates":[{"id":"memory-id","category":"genre|tone|character|interaction|surprise","value":"用户明确表达的偏好","confidence":0.0,"source":"explicit|behavior","requiresConfirmation":false}],"recommendations":[{"worldId":"输入中存在的世界ID","reason":"推荐理由","matchedMemoryIds":["memory-id"]}]}`,
  'co-create-world': `你是创作者的世界创作 Agent。你的任务不是一次性替用户写完剧本，而是通过对话与创作者互相激发，把想法收敛成可运行的世界框架。优先弄清：用户的欲望/情绪钩子、最终奖励、主要阻力、捷径代价、成功/失败条件。不预设“玩几分钟”；长度由任务数量、前置关系、困难与玩家路线决定。不需要设计每一幕，而要产出目标、主/支线任务、前置条件、困难、定时事件和结局条件。保留用户已明确的设定，只改善结构。输出 JSON：
{"reply":"回应本轮想法，解释你收敛了什么","proposal":{"title":"世界名称","premise":"世界设定与冲突","brief":{"coreGoal":"核心目标","successCondition":"成功条件","failureCondition":"失败条件","complexityLevel":2,"tasks":[{"id":"task-id","title":"任务名","description":"任务内容","kind":"main|side","prerequisiteTaskIds":[],"successCondition":"可判定的完成条件","difficulty":"不能一句话跳过的障碍"}],"difficulties":["世界级困难"],"scheduledEvents":[{"title":"事件","trigger":"触发条件","effect":"对世界的影响"}]}},"nextQuestions":["建议继续讨论的问题"],"readiness":"needs_detail|ready"}`,
  'generate-world': `结束条件必须区分 outcome=success 或 failure；失败结束使用 requiredFailedTaskIds 或 requiredFacts，不能要求先完成所有主线。creatorBrief.failureCondition 必须转换为独立的 failure 结束条件。requiredFacts 使用可精确保存的事件事实标签，并说明触发的具体事件。你是统一的世界设计模块，不要把每个角色设定为独立 Agent。根据创作者输入和 creatorBrief 生成局部、可运行、遵守因果的小世界。creatorBrief 中的目标、任务、前置、困难和结局条件是核心；storyOutline 只是可选的推进参考，不能决定故事何时结束。用户的剧情原文和明确设定必须保留。为每个角色生成不同目标、知识和秘密；为主线任务保留 prerequisiteTaskIds，让玩家不能一句话直接跳到终局。开场正文不少于 450 个中文字符，参考推进包含 3—6 个节点。openingScene.choices 是体验者本人可执行的中性动作。输出 JSON：
{"world":{"id":"world-id","title":"标题","premise":"不少于200字的世界前提","timeSetting":"时间","locations":[{"id":"location-id","name":"地点","description":"描述","connectedLocationIds":[]}],"characters":[{"id":"character-id","name":"姓名","identity":"身份","persona":"性格","publicBackground":"公开背景","privateKnowledge":[],"secrets":[],"goal":"目标","startLocationId":"location-id","imagePrompt":"角色立绘提示"}],"relationships":[{"fromCharacterId":"character-id","toCharacterId":"character-id","publicLabel":"关系","privateContext":"私密背景","initialTrust":42}],"rules":[{"id":"rule-id","description":"规则","kind":"physical|social|knowledge|story","immutable":true}],"coreEvent":"核心事件","surpriseLevel":2,"goals":[{"id":"goal-id","title":"目标","description":"成功的定义","scope":"world|role","roleId":"可选角色ID","requiredTaskIds":["task-id"]}],"tasks":[{"id":"task-id","title":"任务","description":"内容","kind":"main|side","assignedRoleIds":["character-id"],"prerequisiteTaskIds":[],"successCondition":"可判定条件","difficulty":"障碍"}],"difficultyConstraints":[{"id":"difficulty-id","description":"困难","blocksTaskId":"task-id","bypassCondition":"克服条件","consequence":"强行跳过的后果"}],"scheduledEvents":[{"id":"event-id","title":"事件","trigger":"触发条件","earliestTurn":2,"effect":"影响"}],"endingConditions":[{"id":"ending-id","description":"结束条件","requiredTaskIds":["task-id"],"requiredFacts":[],"forbiddenFacts":[]}],"openingScene":{"locationId":"location-id","narrative":"不少于450字的开场","presentCharacterIds":[],"choices":[{"id":"choice-id","label":"具体行动","intent":"行动意图"}]}},"storyOutline":[{"id":"beat-id","title":"推进参考","location":"地点","objective":"可能目标","turningPoint":"可能转折"}],"generationNotes":[],"unresolvedQuestions":[]}`,
  'advance-world': `你是统一的世界 Agent。当已发生事实满足任务 successCondition 时必须提交 completeTaskIds，不得不断追加创作者未定义的障碍拖延完成。失败条件使用 endingConditions 中 outcome=failure 的 requiredFailedTaskIds 和 requiredFacts。所有 requiredFacts 是精确事实标签；仅当事件确实发生才原样写入 committedFacts，同时在剧情中说明证据。每回合必须区分行动意图和真实结果，不得因为用户宣告就将结果记为事实。state.reachedEndingIds 中的结局已经展示，用户选择继续后不得重复触发，也不能重置事实、任务或时间。结局后的所有回合默认 ending.reached=false。state.failedTaskIds 是不可逆失败任务，不得再标记 completeTaskIds；后续补救只能是新的行动事实，不能把泡毁的原件说成获救。输出完整的350—650字叙事，避免概括式过短回复。体验者代入 selectedRoleId；其他角色由你依据世界定义统一演绎，不是多个独立 Agent。严格遵守物理规则、角色知识边界、已提交事实、当前状态、tasks 的前置条件和 difficultyConstraints。nextScene 只是创作者的参考方向，不是固定剧情；即使 nextScene 不存在也必须继续动态推演。只有 endingConditions 的 requiredTaskIds 和 requiredFacts 真正满足，或明确失败条件发生时，ending.reached 才能为 true；绝不能因为分幕用完或回合数到达就结束。goalProgress.activeTaskIds 只能包含“尚未完成且所有 prerequisiteTaskIds 已完成”的任务，不能把未解锁任务写入 activeTaskIds。对一句话跳过 Boss/条件的行动，必须根据前置和角色能力判定失败、部分成功或引发代价，不得直接完成所有任务。每轮同步推进至少一名非玩家角色的状态，写入 characterUpdates，但不泄露体验者不应知道的内容。每次 narrative 输出 350—650 个中文字符，生成 2—4 段角色对话和 3—4 个不同策略的下一步建议。自由输入是主行动方式，选项只是灵感。所有 nextChoices.label 必须以体验角色姓名开头。场景或重大事件变化时生成新图，普通对话复用图片。输出 JSON：
{"actionDecision":{"allowed":true,"reason":"可选","suggestedAlternative":"可选"},"narrative":"中文剧情回应","dialogue":[{"characterId":"character-id","text":"台词","visibleToRoleIds":["role-id"]}],"statePatch":{"clock":"可选","locationId":"可选","addInventory":[],"removeInventory":[],"addClues":[],"addKnownSecrets":[],"completeTaskIds":["task-id"],"failTaskIds":[],"taskNotes":{"task-id":"进度说明"},"characterUpdates":{"character-id":{"locationId":"location-id","status":"状态","lastAction":"私下行动的可见摘要"}},"relationshipDeltas":{"character-id":0},"committedFacts":[]},"nextChoices":[{"id":"choice-id","label":"行动文本","intent":"意图"}],"image":{"required":false,"reason":"opening|location_changed|character_changed|major_event|reuse","sceneId":"scene-id","prompt":"可选","reuseAssetId":"可选"},"goalProgress":{"activeTaskIds":["task-id"],"completedTaskIds":[],"summary":"目标进度"},"ending":{"reached":false,"endingId":"可选","canContinue":true}}`,
};

function getDeepSeekProvider(): DeepSeekProvider | null {
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!deepseekKey) return null;
  return {
    apiKey: deepseekKey,
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-flash',
  };
}

function isOperation(value: unknown): value is Operation {
  return value === 'personal-agent' || value === 'co-create-world' || value === 'generate-world' || value === 'advance-world';
}

function isValidOutput(operation: Operation, value: unknown) {
  if (operation === 'personal-agent') return isPersonalAgentResponse(value);
  if (operation === 'co-create-world') return isCreatorAgentResponse(value);
  if (operation === 'generate-world') return isWorldGenerationResponse(value);
  return isWorldTurnResponse(value);
}

function parseModelJSON(content: string): unknown {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(normalized);
}

async function callDeepSeek(provider: DeepSeekProvider, operation: Operation, input: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), operation === 'generate-world' ? 75_000 : 60_000);
  try {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: `你正在驱动一个图文交互小世界 Demo。只输出一个有效 JSON 对象，不使用 Markdown。契约版本：${AI_CONTRACT_VERSION}。${operationInstructions[operation]}` },
          { role: 'user', content: `请处理以下运行时输入，并只返回符合上述结构的 JSON：\n${JSON.stringify(input)}` },
        ],
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        stream: false,
        temperature: operation === 'advance-world' || operation === 'co-create-world' ? 0.7 : 0.5,
        max_tokens: operation === 'generate-world' ? 5600 : operation === 'co-create-world' ? 3000 : 2800,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Provider returned ${response.status}`);
    const result = await response.json() as { choices?: { message?: { content?: unknown } }[] };
    const content = result.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('Provider returned empty content');
    return parseModelJSON(content);
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const configured = Boolean(getDeepSeekProvider());
  return Response.json({ configured, providers: configured ? ['deepseek'] : [] }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 200_000) return Response.json({ error: 'request_too_large' }, { status: 413 });

  let body: { operation?: unknown; input?: unknown };
  try {
    body = await request.json() as { operation?: unknown; input?: unknown };
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!isOperation(body.operation) || !body.input || typeof body.input !== 'object') {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }
  const version = (body.input as { contractVersion?: unknown }).contractVersion;
  if (version !== AI_CONTRACT_VERSION) return Response.json({ error: 'contract_version_mismatch' }, { status: 409 });

  if (body.operation === 'advance-world') {
    if (!isWorldTurnRequest(body.input)) return Response.json({ error: 'invalid_world_turn_request' }, { status: 400 });
    const validation = validateAction(body.input.userAction, body.input.state, body.input.currentScene.choices.map((choice) => choice.label));
    if (!validation.allowed) {
      return Response.json(makeRejectedWorldTurn(body.input, validation), {
        headers: { 'Cache-Control': 'no-store', 'X-AI-Provider': 'rules' },
      });
    }
  }

  const provider = getDeepSeekProvider();
  if (!provider) return Response.json({ error: 'model_not_configured' }, { status: 503 });
  try {
    const output = await callDeepSeek(provider, body.operation, body.input);
    if (!isValidOutput(body.operation, output)) {
      return Response.json({ error: 'invalid_model_output' }, { status: 502 });
    }
    const guardedOutput = body.operation === 'advance-world' && isWorldTurnRequest(body.input) && isWorldTurnResponse(output)
      ? enforceWorldTurnGuardrails(body.input, output)
      : output;
    return Response.json(guardedOutput, {
      headers: { 'Cache-Control': 'no-store', 'X-AI-Provider': 'deepseek' },
    });
  } catch (error) {
    const code = error instanceof Error && ['invalid_task_transition', 'premature_ending'].includes(error.message)
      ? error.message : 'deepseek_failed';
    return Response.json({ error: code }, { status: 502 });
  }
}
