import { readPersonaAdaptationSuggestion, type PersonaAdaptationRequest, type PersonaAdaptationSuggestion } from './persona-adaptation';

export async function requestPersonaAdaptation(input: PersonaAdaptationRequest, accountScope: string, signal: AbortSignal): Promise<PersonaAdaptationSuggestion> {
  const response = await fetch('/api/ai', { method: 'POST', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', 'x-xgen-account': accountScope },
    body: JSON.stringify({ operation: 'adapt-persona', input }) });
  if (response.status === 409) throw new Error('账号状态已变化，请刷新后重新确认身份。');
  if (!response.ok) throw new Error('入场建议暂未生成成功；没有改变身份或剧情，可以重试或使用原剧情角色。');
  const result = readPersonaAdaptationSuggestion(await response.json(), input);
  if (!result) throw new Error('建议超出创作者允许范围，已拦截；请重试或使用原剧情角色。');
  return result;
}
