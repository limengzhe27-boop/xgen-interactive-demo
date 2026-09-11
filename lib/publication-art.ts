// Legacy placeholder assets must never masquerade as art belonging to a publication.
export const PUBLICATION_PLACEHOLDER='/assets/publication-placeholder.svg';
export function hasPublicationImage(path?:string){return Boolean(path&&!path.includes('storm-manor')&&!path.includes('storm_manor')&&path!==PUBLICATION_PLACEHOLDER);}
export function publicationArt(document:Record<string,unknown>){
 const portraits=document.portraits&&typeof document.portraits==='object'?document.portraits as Record<string,unknown>:{};
 return {...document,cover:typeof document.cover==='string'&&hasPublicationImage(document.cover)?document.cover:PUBLICATION_PLACEHOLDER,
 portraits:Object.fromEntries(Object.entries(portraits).map(([id,path])=>[id,typeof path==='string'&&hasPublicationImage(path)?path:PUBLICATION_PLACEHOLDER]))};
}
