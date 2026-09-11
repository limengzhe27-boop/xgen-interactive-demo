import type { StudioWorld } from './studio-worlds';
import { hasPublicationImage } from './publication-art.ts';

// Only merge art, never replace unfinished local story edits.
export function reusePublicationArt(local: StudioWorld, published: StudioWorld): StudioWorld {
  return { ...local, cover: hasPublicationImage(local.cover) ? local.cover : published.cover,
    portraits: Object.fromEntries(local.world.characters.map(role => {
      const original = published.world.characters.find(c => c.id === role.id && c.name === role.name && c.imagePrompt === role.imagePrompt);
      return [role.id, hasPublicationImage(local.portraits[role.id]) ? local.portraits[role.id] : original ? published.portraits[original.id] || '' : ''];
    })) };
}
