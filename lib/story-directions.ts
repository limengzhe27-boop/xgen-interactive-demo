import type { WorldDefinition } from './ai-contracts';

// Legacy labels are migration hints only, never runtime win/lose judgments.
export function storyDirections(endings: WorldDefinition['endingConditions']) {
  const primary = endings.find(item => item.outcome !== 'failure');
  const alternative = endings.find(item => item.outcome === 'failure') ?? endings.find(item => item !== primary);
  return { primary, alternative };
}
