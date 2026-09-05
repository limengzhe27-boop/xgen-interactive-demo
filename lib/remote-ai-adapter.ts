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
  if (!response.ok) throw new Error(`AI request failed with status ${response.status}`);
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

  coCreateWorld(input: CreatorAgentRequest): Promise<CreatorAgentResponse> {
    return callRemote('co-create-world', input, isCreatorAgentResponse, undefined, this.accountScope);
  }

  generateWorld(input: WorldGenerationRequest): Promise<WorldGenerationResponse> {
    return callRemote('generate-world', input, isWorldGenerationResponse, undefined, this.accountScope);
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
