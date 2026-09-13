import type {TimingRow} from './video-timing';

export const timingColumns=[
  ['脚本编排（含请求）','脚本编排'],['排队＋生成（观测）','排队＋生成'],
  ['服务端取回成片','取回成片'],['服务端保存成片','保存成片'],
  ['缓存下载','缓存下载'],['加载至首帧','加载至首帧'],['选择至播放','选择至播放'],
  ['末帧读取','末帧读取'],['播放中缓冲','播放中缓冲'],
  ['视频提交至可用（本页观察）','提交至可用'],
] as const;

export function timingGroups(rows:TimingRow[]){
  const groups=new Map<string,{id:string;label:string;started:number;stages:Record<string,TimingRow[]>}>();
  for(const row of rows){
    const id=JSON.stringify([row.batch||'历史记录',row.group]);
    const group=groups.get(id)??{id,label:row.label,started:row.started,stages:{}};
    group.started=Math.min(group.started,row.started);
    (group.stages[row.stage]??=[]).push(row);groups.set(id,group);
  }
  return [...groups.values()].sort((a,b)=>b.started-a.started);
}

export function timingCell(rows:TimingRow[]|undefined){
  if(!rows?.length)return '—';
  const completed=rows.filter(r=>r.status==='完成'&&r.ms!==undefined);
  const parts:string[]=[];
  if(completed.length)parts.push(`${(completed.reduce((sum,r)=>sum+r.ms!,0)/1000).toFixed(2)}秒${completed.length>1?`（${completed.length}次合计）`:''}`);
  if(rows.some(r=>r.status==='进行中'))parts.push('进行中');
  const other=[...new Set(rows.filter(r=>r.status!=='完成'&&r.status!=='进行中').map(r=>r.status))];
  parts.push(...other);
  return parts.join(' · ')||'未记录耗时';
}
