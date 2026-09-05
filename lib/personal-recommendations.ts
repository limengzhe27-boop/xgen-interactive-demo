import type { PersonalAgentResponse } from './ai-contracts';

export function knownRecommendations(recommendations: PersonalAgentResponse['recommendations'], worldIds: string[]) {
  const allowed = new Set(worldIds);
  const seen = new Set<string>();
  return recommendations.filter((item) => {
    if (!allowed.has(item.worldId) || !item.reason.trim() || seen.has(item.worldId)) return false;
    seen.add(item.worldId); return true;
  }).slice(0, 2);
}
