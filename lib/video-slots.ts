export type VideoSlots={active:number;sources:[string,string]};
// Promote the exact prepared element; never substitute a different branch.
export function videoSlots(previous:VideoSlots,src:string,warm:string):VideoSlots{
  const sources:[string,string]=[...previous.sources];
  let active=previous.active;
  if(sources[active]!==src){const match=sources.indexOf(src);active=match>=0?match:1-active;sources[active]=src;}
  sources[1-active]=warm&&warm!==src?warm:'';
  if(active===previous.active&&sources.every((s,i)=>s===previous.sources[i]))return previous;
  return {active,sources};
}
