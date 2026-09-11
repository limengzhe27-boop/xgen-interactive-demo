import type { StudioWorld } from './studio-worlds';
import { hasPublicationImage } from './publication-art.ts';
// Only match the same authored content; a title alone does not identify a work.
export function catalogueIdentity(w:Pick<StudioWorld,'title'|'premise'>&{world?:StudioWorld['world']}){return JSON.stringify([w.title,w.premise,w.world?.characters.map(c=>[c.id,c.name,c.imagePrompt])]);}
export function reconcileLocalArt(local:StudioWorld,publications:StudioWorld[]):StudioWorld{
 const published=publications.find(w=>w.id===local.id||catalogueIdentity(w)===catalogueIdentity(local));
 if(!published)return local;
 return {...local,cover:hasPublicationImage(local.cover)?local.cover:published.cover,portraits:Object.fromEntries(local.world.characters.map(c=>[c.id,hasPublicationImage(local.portraits[c.id])?local.portraits[c.id]:published.portraits[c.id]||published.cover]))};
}
