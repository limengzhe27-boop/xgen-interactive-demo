import { afterClassEntry } from './after-class-entry.ts';
// Legacy placeholder assets must never masquerade as art belonging to a publication.
export const PUBLICATION_PLACEHOLDER='/assets/publication-placeholder.svg';
// Explicitly shipped public artwork; never accept an arbitrary /assets path.
export const publicationArtPaths = new Set(['cover', 'zhou', 'shen', 'lin', 'lu-live-v1', 'zhou-story-v2', 'lu-story-v2'].map(name => `/assets/after-class-v1/${name}.webp`));
export function hasPublicationImage(path?:string){return Boolean(path&&!path.includes('storm-manor')&&!path.includes('storm_manor')&&path!==PUBLICATION_PLACEHOLDER);}
export function publicationArt(document:Record<string,unknown>){
 document=afterClassEntry(document);
 const portraits=document.portraits&&typeof document.portraits==='object'?document.portraits as Record<string,unknown>:{};
 const world=document.world as {characters?:{id:string;name:string;imagePrompt:string}[]}|undefined;
 const matched=document.id==='community-56ed98581aeb49b16bfe83b22761525138a3a139c137955931288b7fe5dfa5d6'&&document.title==='下课以后';
 const names:Record<string,string>={'draft-role-0':'周野','draft-role-1':'沈知夏','draft-role-2':'林小满'};
 const files:Record<string,string>={'draft-role-0':'zhou-story-v2','draft-role-1':'shen','draft-role-2':'lin'};
 const looks:Record<string,string>={'draft-role-0':'校服穿得松松垮垮，头发有些长，右手腕戴着一根旧红绳','draft-role-1':'常穿素色衬衫与长裙，戴细框眼镜，说话时习惯转笔','draft-role-2':'马尾扎得整齐，校服熨得平整，书包上挂着一只旧挂件'};
 const eligible=matched&&Object.entries(names).every(([id,name])=>world?.characters?.some(c=>c.id===id&&c.name===name&&c.imagePrompt===looks[id]));
 const fallback=(id?:string)=>eligible?`/assets/after-class-v1/${id?files[id]:'cover'}.webp`:PUBLICATION_PLACEHOLDER;
 return {...document,cover:typeof document.cover==='string'&&hasPublicationImage(document.cover)?document.cover:fallback(),
 portraits:Object.fromEntries((world?.characters??Object.keys(portraits).map(id=>({id}))).map(({id})=>{const old=portraits[id];const path=eligible&&id==='draft-role-0'&&old==='/assets/after-class-v1/zhou.webp'?fallback(id):old;return [id,typeof path==='string'&&hasPublicationImage(path)?path:eligible&&files[id]?fallback(id):PUBLICATION_PLACEHOLDER];}))};
}
