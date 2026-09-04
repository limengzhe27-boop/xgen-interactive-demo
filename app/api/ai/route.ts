import { AI_CONTRACT_VERSION } from '@/lib/ai-contracts';
import {
  isPersonalAgentResponse,
  isWorldGenerationResponse,
  isWorldTurnResponse,
} from '@/lib/ai-validation';

type Operation = 'personal-agent' | 'generate-world' | 'advance-world';
type DeepSeekProvider = { apiKey: string; endpoint: string; model: string };

const operationInstructions: Record<Operation, string> = {
  'personal-agent': `你是用户的个人 Agent，只根据输入中明确给出的偏好和体验记录了解用户，不猜测敏感信息。输出 JSON：
{"reply":"简洁中文回复","memoryCandidates":[{"id":"memory-id","category":"genre|tone|character|interaction|surprise","value":"用户明确表达的偏好","confidence":0.0,"source":"explicit|behavior","requiresConfirmation":false}],"recommendations":[{"worldId":"输入中存在的世界ID","reason":"推荐理由","matchedMemoryIds":["memory-id"]}]}`,
  'generate-world': `你是统一的世界设计模块，不要把每个角色设定为独立 Agent。根据创作者输入生成一个局部、可运行、遵守因果的小世界，而不是套用灯塔、山庄等固定剧情。开场正文不少于 450 个中文字符，剧情草案包含 4—6 幕，每一幕都由输入角色、关系和故事种子推导。openingScene.choices 是所有可选角色共用的入场动作，只能用“观察、询问、检查、暂不表态”等体验者本人可以执行的中性动作，不能把某个具体角色写成行动主体。输出 JSON：
{"world":{"id":"world-id","title":"标题","premise":"不少于200字的世界前提","timeSetting":"时间","locations":[{"id":"location-id","name":"地点","description":"描述","connectedLocationIds":[]}],"characters":[{"id":"character-id","name":"姓名","identity":"身份","persona":"性格","publicBackground":"公开背景","privateKnowledge":[],"secrets":[],"goal":"目标","startLocationId":"location-id","imagePrompt":"包含固定年龄发型服装配饰的角色立绘提示"}],"relationships":[{"fromCharacterId":"character-id","toCharacterId":"character-id","publicLabel":"关系","privateContext":"私密背景","initialTrust":42}],"rules":[{"id":"rule-id","description":"规则","kind":"physical|social|knowledge|story","immutable":true}],"coreEvent":"核心事件","surpriseLevel":2,"endingConditions":[{"id":"ending-id","description":"结束条件","requiredFacts":[],"forbiddenFacts":[]}],"openingScene":{"locationId":"location-id","narrative":"不少于450字的开场","presentCharacterIds":[],"choices":[{"id":"choice-id","label":"具体行动","intent":"行动意图"}]}},"storyOutline":[{"id":"beat-id","title":"幕标题","location":"地点","objective":"本幕目标","turningPoint":"由角色关系推动的转折"}],"generationNotes":[],"unresolvedQuestions":[]}`,
  'advance-world': `你是统一的世界演绎模块。体验者代入 selectedRoleId；其他角色都由你依据世界定义统一演绎，而不是多个独立 Agent。严格遵守物理规则、角色知识边界、已提交事实和当前状态。nextScene 只是创作者确认过的剧情草案方向，不是要照抄的固定正文；必须根据用户当前行动生成新的过程、对话和结果。每次 narrative 输出 350—650 个中文字符，包含环境变化、行动结果和可继续追问的信息；生成 2—4 段符合 Persona 的角色对话和 3—4 个真正不同的下一步选项。所有 nextChoices 的行动主体必须是 selectedRoleId 对应的体验角色，label 必须以该角色姓名开头；绝不能让其他角色成为选项中的行动主体，其他角色只能作为询问、观察、帮助或对抗的对象。场景地点变化、主要在场角色发生明显变化或重大事件发生时，将 image.required 设为 true，并给出一段不含文字、水印和界面元素的电影感场景图提示词；普通对话尽量复用上一张图。输出 JSON：
{"actionDecision":{"allowed":true,"reason":"可选","suggestedAlternative":"可选"},"narrative":"中文剧情回应","dialogue":[{"characterId":"character-id","text":"台词","visibleToRoleIds":["role-id"]}],"statePatch":{"clock":"可选","locationId":"可选","addInventory":[],"removeInventory":[],"addClues":[],"addKnownSecrets":[],"relationshipDeltas":{"character-id":0},"committedFacts":[]},"nextChoices":[{"id":"choice-id","label":"行动文本","intent":"意图"}],"image":{"required":false,"reason":"opening|location_changed|character_changed|major_event|reuse","sceneId":"scene-id","prompt":"可选","reuseAssetId":"可选"},"ending":{"reached":false,"endingId":"可选","canContinue":true}}`,
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
  return value === 'personal-agent' || value === 'generate-world' || value === 'advance-world';
}

function isValidOutput(operation: Operation, value: unknown) {
  if (operation === 'personal-agent') return isPersonalAgentResponse(value);
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
        temperature: operation === 'advance-world' ? 0.7 : 0.5,
        max_tokens: operation === 'generate-world' ? 5000 : 2600,
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

  const provider = getDeepSeekProvider();
  if (!provider) return Response.json({ error: 'model_not_configured' }, { status: 503 });
  try {
    const output = await callDeepSeek(provider, body.operation, body.input);
    if (!isValidOutput(body.operation, output)) {
      return Response.json({ error: 'invalid_model_output' }, { status: 502 });
    }
    return Response.json(output, {
      headers: { 'Cache-Control': 'no-store', 'X-AI-Provider': 'deepseek' },
    });
  } catch {
    // Do not expose prompts, keys, or provider responses. The client falls back to Mock AI.
    return Response.json({ error: 'deepseek_failed' }, { status: 502 });
  }
}
