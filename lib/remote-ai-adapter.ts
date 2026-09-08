import type {
  AIAdapter,
  CreatorAgentRequest,
  CreatorAgentResponse,
  PersonalAgentRequest,
  PersonalAgentResponse,
  WorldGenerationRequest,
  WorldGenerationResponse,
  WorldTurnRequest,
  WorldTurnResponse,
} from '@/lib/ai-contracts';
import {
  isCreatorAgentResponse,
  isPersonalAgentResponse,
  isWorldGenerationResponse,
  isWorldTurnResponse,
} from '@/lib/ai-validation';

type AIOperation = 'personal-agent' | 'co-create-world' | 'generate-world' | 'advance-world';

async function callRemote<T>(
  operation: AIOperation,
  input: unknown,
  validate: (value: unknown) => value is T,
  signal?: AbortSignal,
  accountScope = 'guest',
): Promise<T> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-xgen-account': accountScope },
    body: JSON.stringify({ operation, input }),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    const messages: Record<string, string> = {
      model_output_truncated: '这次角色与任务较多，模型输出被截断，未覆盖你的草稿。请重试，或先讨论角色再细化任务。',
      invalid_model_output: '模型返回的设定格式不完整，未覆盖你的草稿。可以重试或手动编辑。',
      model_timeout: '模型响应超时，未覆盖你的草稿。请稍后重试。',
      model_rate_limited: '公司模型当前请求过多，请稍后重试。',
      model_not_configured: '服务端尚未配置文字模型，请联系维护者。',
      model_access_denied: '公司模型访问被拒绝，请维护者检查网关权限与额度。',
      account_changed_or_unavailable: '登录状态发生变化或暂时无法验证，请刷新后重试。',
    };
    throw new Error(messages[body.error || ''] || `创作服务暂时不可用（${response.status}），你的内容已保留。`);
  }
  const body: unknown = await response.json();
  if (!validate(body)) throw new Error('AI response did not match the contract');
  return body;
}

class RemoteAIAdapter implements AIAdapter {
  private accountScope: string;
  constructor(accountScope = 'guest') { this.accountScope = accountScope; }
  talkToPersonalAgent(input: PersonalAgentRequest): Promise<PersonalAgentResponse> {
    return callRemote('personal-agent', input, isPersonalAgentResponse, undefined, this.accountScope);
  }

  coCreateWorld(input: CreatorAgentRequest, signal?: AbortSignal): Promise<CreatorAgentResponse> {
    return callRemote('co-create-world', input, isCreatorAgentResponse, signal, this.accountScope);
  }

  generateWorld(input: WorldGenerationRequest, signal?: AbortSignal): Promise<WorldGenerationResponse> {
    return callRemote('generate-world', input, isWorldGenerationResponse, signal, this.accountScope);
  }

  advanceWorld(input: WorldTurnRequest, signal?: AbortSignal): Promise<WorldTurnResponse> {
    return callRemote('advance-world', input, isWorldTurnResponse, signal, this.accountScope);
  }
}

export const remoteAIAdapter: AIAdapter = new RemoteAIAdapter();
export const createRemoteAIAdapter = (scope: string): AIAdapter => new RemoteAIAdapter(scope);

export async function getRemoteAIStatus(): Promise<{ configured: boolean; providers: string[] }> {
  const response = await fetch('/api/ai', { cache: 'no-store' });
  if (!response.ok) return { configured: false, providers: [] };
  const body = await response.json() as { configured?: unknown; providers?: unknown };
  return {
    configured: body.configured === true,
    providers: Array.isArray(body.providers) ? body.providers.filter((provider): provider is string => typeof provider === 'string') : [],
  };
}
