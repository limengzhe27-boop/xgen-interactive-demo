export type TimingRow={id:string;group:string;label:string;stage:string;started:number;ended?:number;ms?:number;status:string};
export type ServerVideoTiming={submittedAt?:number;observedCompleteAt?:number;downloadMs?:number;storeMs?:number};
export function readVideoTiming(value:unknown):ServerVideoTiming{
  const out:ServerVideoTiming={};
  if(value&&typeof value==='object')for(const key of ['submittedAt','observedCompleteAt','downloadMs','storeMs'] as const){
    const n=(value as ServerVideoTiming)[key];if(typeof n==='number'&&Number.isFinite(n)&&n>=0)out[key]=n;
  }return out;
}
// Bounded, account-scoped, browser-local diagnostics. No prompts, frames or chat.
export class VideoTimingLog{
  rows:TimingRow[]=[];private storageKey='';private listeners=new Set<()=>void>();
  subscribe(fn:()=>void){this.listeners.add(fn);return()=>{this.listeners.delete(fn);};}
  scope(scope:string){
    const key=`xgen:video-timing:v1:${scope}`;if(key===this.storageKey)return;
    this.storageKey=key;this.rows=[];
    try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))this.rows=saved.filter(r=>r&&['id','group','label','stage','status'].every(k=>typeof r[k]==='string')&&Number.isFinite(r.started)&&(r.ms===undefined||Number.isFinite(r.ms)&&r.ms>=0)).slice(-300).map(r=>r.status==='进行中'?{...r,status:'中断／刷新，未计入完成耗时'}:r);}catch{}
    this.changed();
  }
  private changed(){try{if(this.storageKey)localStorage.setItem(this.storageKey,JSON.stringify(this.rows));}catch{}for(const fn of this.listeners)fn();}
  begin(group:string,label:string,stage:string){
    const row:TimingRow={id:crypto.randomUUID(),group,label,stage,started:Date.now(),status:'进行中'};
    const clock=performance.now();this.rows=[...this.rows,row].slice(-300);this.changed();let done=false;
    return(status='完成')=>{if(done)return;done=true;if(!this.rows.includes(row))return;row.ended=Date.now();row.ms=Math.max(0,performance.now()-clock);row.status=status;this.changed();};
  }
  metric(group:string,label:string,stage:string,ms:number){
    if(!Number.isFinite(ms)||ms<0)return;
    if(this.rows.some(r=>r.group===group&&r.stage===stage))return;
    const now=Date.now();this.rows=[...this.rows,{id:crypto.randomUUID(),group,label,stage,started:now-ms,ended:now,ms,status:'完成'}].slice(-300);this.changed();
  }
  server(group:string,label:string,value:unknown){
    const t=readVideoTiming(value);
    if(t.submittedAt!==undefined&&t.observedCompleteAt!==undefined)this.metric(group,label,'排队＋生成（观测）',t.observedCompleteAt-t.submittedAt);
    if(t.downloadMs!==undefined)this.metric(group,label,'服务端取回成片',t.downloadMs);
    if(t.storeMs!==undefined)this.metric(group,label,'服务端保存成片',t.storeMs);
  }
}
