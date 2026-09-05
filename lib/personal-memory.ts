import type { AgentMemory, PersonalAgentRequest } from '@/lib/ai-contracts';

export function pendingMemories(candidates: AgentMemory[], saved: string[]): string[] {
  // All new memories need user confirmation, regardless of the model's flag.
  return [...new Set(candidates.filter((item) => item.source === 'explicit')
    .map((item) => item.value.trim()).filter((value) => value && value.length <= 300 && !saved.includes(value)))].slice(0, 4);
}

export function restorePersonalConversation(value: unknown): NonNullable<PersonalAgentRequest['conversation']> {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && (item.role === 'user' || item.role === 'assistant')
    && typeof item.content === 'string' && item.content.trim()).slice(-40)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 6000) }));
}
