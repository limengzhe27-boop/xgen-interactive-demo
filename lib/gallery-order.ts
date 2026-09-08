// Stable mixing: no render-time randomness or hydration jumps. Newly added IDs
// automatically participate; keep related cards outside the last four slots.
export function mixGallery<T>(items:T[], id:(item:T)=>string, world:(item:T)=>string):T[] {
 const hash=(s:string)=>Array.from(s).reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
 const pending=[...items].sort((a,b)=>hash(id(a))-hash(id(b)) || id(a).localeCompare(id(b)));
 const output:T[]=[];
 while(pending.length){
  let index=-1;
  for(let gap=Math.min(4,output.length);gap>=0&&index<0;gap--){
   const recent=new Set(output.slice(output.length-gap).map(world));
   index=pending.findIndex(item=>!recent.has(world(item)));
  }
  output.push(pending.splice(index<0?0:index,1)[0]);
 }
 return output;
}
