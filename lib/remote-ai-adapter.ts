import type {
  AIAdapter,
  CreatorAgentRequest,
  CreatorAgentResponse,
  PersonalAgentRequest,
  PersonalAgentResponse,
  StreamChunk,
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
} from './ai-validation.ts';

type AIOperation = 'personal-agent' | 'co-create-world' | 'generate-world' | 'advance-world';
import { normalizeCreatorTransport } from './creator-directions.ts';

async function callRemote<T>(
  operation: AIOperation,
  input: unknown,
  validate: (value: unknown) => value is T,
  signal?: AbortSignal,
  accountScope = 'guest',
  onChunk?: (chunk: StreamChunk) => void,
): Promise<T> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream, application/json',
      'x-xgen-account': accountScope,
    },
    body: JSON.stringify({ operation, input }),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    const messages: Record<string, string> = {
      invalid_continuation: '本次后续没有形成有效的新剧情，或引用了不存在的人物与地点。原故事未改动，请补充后续再试。',
      invalid_creator_task_graph: '这次 AI 方案包含无效或循环任务关联，尚未作为可采纳建议展示。你的草稿未被覆盖，请让 Agent 重新整理任务关系。',
      invalid_creator_story_graph: '这次画布的角色或入场路径未能正确对应，未覆盖草稿。请让 Agent 重新整理画布。',
      model_output_truncated: '这次角色与任务较多，模型输出被截断，未覆盖你的草稿。请重试，或先讨论角色再细化任务。',
      invalid_model_output: '模型返回的设定格式不完整，未覆盖你的草稿。可以重试或手动编辑。',
      model_timeout: '模型响应超时，未覆盖你的草稿。请稍后重试。',
      model_rate_limited: '公司模型当前请求过多，请稍后重试。',
      model_not_configured: '服务端尚未配置文字模型，请联系维护者。',
      model_access_denied: '公司模型访问被拒绝，请维护者检查网关权限与额度。',
      company_gateway_failed: '上游模型服务暂时繁忙或响应中断，未覆盖草稿。请等待数秒后重试。',
      account_changed_or_unavailable: '登录状态发生变化或暂时无法验证，请刷新后重试。',
    };
    if (operation === 'advance-world') {
      messages.model_timeout = '模型响应超时，本次没有推进剧情。输入已保留，请稍后重试。';
      messages.invalid_model_output = '模型回复格式不完整，本次没有推进剧情。输入已保留，可以重试。';
      messages.model_output_truncated = '模型回复被截断，本次没有推进剧情。输入已保留，可以重试。';
      messages.company_gateway_failed = '上游模型服务响应中断，本次没有推进剧情。输入已保留，请稍后重试。';
    }
    const details = (body as { details?: string }).details;
    const fallback = details ? `创作服务暂时不可用（${response.status}）：${details}` : `创作服务暂时不可用（${response.status}），你的内容已保留。`;
    throw new Error(messages[body.error || ''] || fallback);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream') && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: unknown = null;
    let streamError: string | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');
        // A complete final event can end at EOF without the last blank line.
        if (done && buffer.trim()) buffer += '\n\n';

        let boundaryIndex;
        while ((boundaryIndex = buffer.indexOf('\n\n')) !== -1) {
          const message = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);

          let eventType = 'message';
          let eventData = '';

          for (const line of message.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('event:')) {
              eventType = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              eventData = trimmed.slice(5).trim();
            }
          }

          if (eventType === 'chunk') {
            try {
              const chunkObj = JSON.parse(eventData) as StreamChunk;
              onChunk?.(chunkObj);
            } catch {
              onChunk?.({ delta: eventData, text: eventData });
            }
          } else if (eventType === 'final') {
            try {
              finalResult = JSON.parse(eventData);
            } catch {
              streamError = 'invalid_model_output';
            }
          } else if (eventType === 'error') {
            try {
              const errObj = JSON.parse(eventData) as { error?: string };
              streamError = errObj.error || 'company_gateway_failed';
            } catch {
              streamError = eventData || 'company_gateway_failed';
            }
          }
        }
        if (done) break;
      }
    } finally {
      reader.releaseLock();
    }

    if (streamError) {
      const messages: Record<string, string> = {
        model_timeout: '模型响应超时，未覆盖你的草稿。请稍后重试。',
        model_rate_limited: '公司模型当前请求过多，请稍后重试。',
        model_not_configured: '服务端尚未配置文字模型，请联系维护者。',
        model_access_denied: '公司模型访问被拒绝，请维护者检查网关权限与额度。',
        invalid_model_output: '模型返回的设定格式不完整，未覆盖你的草稿。可以重试或手动编辑。',
        company_gateway_failed: '上游模型服务暂时繁忙或响应中断，未覆盖草稿。请等待数秒后重试。',
      };
      throw new Error(messages[streamError] || `创作服务暂时不可用：${streamError}`);
    }
    if (operation === 'co-create-world') finalResult = normalizeCreatorTransport(finalResult);
    if (!finalResult) {
      throw new Error('回复连接提前结束，未收到完整结果。已收到的文字仅供参考，草稿未改动，输入已保留。');
    }
    if (!validate(finalResult)) {
      throw new Error('模型回复格式不完整，内容未提交，输入已保留。');
    }
    return finalResult;
  }

  const raw: unknown = await response.json();
  const body = operation === 'co-create-world' ? normalizeCreatorTransport(raw) : raw;
  if (!validate(body)) throw new Error('模型回复格式不完整，内容未提交，输入已保留。');
  return body;
}

class RemoteAIAdapter implements AIAdapter {
  private accountScope: string;
  constructor(accountScope = 'guest') { this.accountScope = accountScope; }
  talkToPersonalAgent(input: PersonalAgentRequest, signal?: AbortSignal, onChunk?: (chunk: StreamChunk) => void): Promise<PersonalAgentResponse> {
    return callRemote('personal-agent', input, isPersonalAgentResponse, signal, this.accountScope, onChunk);
  }

  coCreateWorld(input: CreatorAgentRequest, signal?: AbortSignal, onChunk?: (chunk: StreamChunk) => void): Promise<CreatorAgentResponse> {
    return callRemote('co-create-world', input, isCreatorAgentResponse, signal, this.accountScope, onChunk);
  }

  generateWorld(input: WorldGenerationRequest, signal?: AbortSignal, onChunk?: (chunk: StreamChunk) => void): Promise<WorldGenerationResponse> {
    return callRemote('generate-world', input, isWorldGenerationResponse, signal, this.accountScope, onChunk);
  }

  advanceWorld(input: WorldTurnRequest, signal?: AbortSignal, onChunk?: (chunk: StreamChunk) => void): Promise<WorldTurnResponse> {
    return callRemote('advance-world', input, isWorldTurnResponse, signal, this.accountScope, onChunk);
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
