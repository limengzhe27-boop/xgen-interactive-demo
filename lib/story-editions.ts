import type { StudioWorld } from './studio-worlds';
import { publicationWorld } from './publication.ts';

export type StoryEdition = { id: string; number: number; savedAt?: number; entry: StudioWorld };

function snapshot(entry: StudioWorld): StudioWorld {
  // Store only fiction and its artwork, never creator conversations or personal context.
  return structuredClone({ id: entry.id, title: entry.title, genre: entry.genre, premise: entry.premise,
    world: publicationWorld(entry.world), cover: entry.cover, portraits: entry.portraits,
    fixedRoleId: entry.fixedRoleId, openingImage: entry.openingImage, portraitCacheKeys: entry.portraitCacheKeys,
    roleOpenings: entry.roleOpenings, roleEntryScenes: entry.roleEntryScenes, roleChoices: entry.roleChoices,
  });
}
function canonical(value: unknown): string {
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value && typeof value==='object')return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function readStoryEditions(value: unknown, worldId: string): StoryEdition[] {
  if(value===undefined)return [];
  if(!Array.isArray(value))throw Error('版本记录无法读取，请勿覆盖原记录。');
  const ids=new Set<string>();
  return value.map((item,index)=>{
    if(!item || typeof item.id!=='string' || !item.id || ids.has(item.id) || item.number!==index+1 || item.entry?.id!==worldId || (item.savedAt!==undefined && (!Number.isFinite(item.savedAt)||item.savedAt<0)))throw Error('版本记录不完整，原记录已保留。');
    ids.add(item.id);
    const entry=snapshot(item.entry);
    return {id:item.id,number:item.number,savedAt:item.savedAt,entry:{...entry,edition:{id:item.id,number:item.number,savedAt:item.savedAt}}};
  });
}
export function recordStoryEdition(history: StoryEdition[], entry: StudioWorld, previous?: StudioWorld, now=Date.now()): { history: StoryEdition[]; entry: StudioWorld } {
  const next=readStoryEditions(history,entry.id);
  const add=(source:StudioWorld,savedAt?:number)=>{
    const edition={id:crypto.randomUUID(),number:next.length+1,savedAt};
    next.push({...edition,entry:{...snapshot(source),edition}});
  };
  // Preserve the known pre-feature edition without inventing its original save date.
  if(!next.length && previous?.id===entry.id)add(previous);
  if(!next.length || canonical(snapshot(next.at(-1)!.entry))!==canonical(snapshot(entry)))add(entry,now);
  return {history:next,entry:structuredClone(next.at(-1)!.entry)};
}
export function editionLabel(entry: StudioWorld): string {
  return entry.edition ? `保存版 ${entry.edition.number}` : '原存档版本';
}

export function assertEditionHistory(previous: StoryEdition[], next: StoryEdition[]) {
  if(previous.length>next.length || previous.some((edition,index)=>canonical(edition)!==canonical(next[index])))
    throw Error('检测到另一个页面的新版本或版本冲突。原记录未覆盖，请刷新后继续。');
}
