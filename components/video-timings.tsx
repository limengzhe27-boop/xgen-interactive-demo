'use client';
import {useEffect,useState} from 'react';
import type {VideoTimingLog} from '@/lib/video-timing';
export function VideoTimings({log}:{log:VideoTimingLog}){
  const [,refresh]=useState(0),[open,setOpen]=useState(false);
  const [selected,setSelected]=useState<string|null>(null);
  const batch=selected&&log.batches.includes(selected)?selected:log.activeBatch;
  const rows=log.rows.filter(r=>(r.batch||'历史记录')===batch);
  useEffect(()=>log.subscribe(()=>refresh(n=>n+1)),[log]);
  useEffect(()=>{if(!open)return;const t=setInterval(()=>refresh(n=>n+1),1000);return()=>clearInterval(t);},[open]);
  function download(){const url=URL.createObjectURL(new Blob([JSON.stringify({version:2,activeBatch:log.activeBatch,exportedAt:new Date().toISOString(),records:log.rows},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='video-timings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <details onToggle={e=>setOpen(e.currentTarget.open)}><summary>耗时记录 · {log.rows.length} 项</summary>
    <p>本浏览器当前账号最近300项。各阶段可能重叠，不能直接相加。排队＋生成是提交到首次查到完成的观测时间，含轮询间隔，不是模型纯推理时间。旧任务缺失的数据不补算。</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <button onClick={()=>{log.startBatch();setSelected(null);}}>开始新一轮测试</button>
      <button onClick={download} disabled={!log.rows.length}>导出全部记录</button>
      <select aria-label="查看测试批次" value={batch} onChange={e=>setSelected(e.target.value)} style={{maxWidth:'100%',color:'inherit',background:'#18251f'}}>{log.batches.map(b=><option key={b} value={b}>{b}{b===log.activeBatch?'（记录中）':''}</option>)}</select>
    </div>
    <p>以下仅统计所选批次。新一轮不清空旧记录；已开始的分支仍归原批次，不会重新生成视频。全部批次合计保留最近300项，长期对比请先导出。</p>
    {['脚本编排（含请求）','排队＋生成（观测）','缓存下载','加载至首帧','选择至播放'].map(stage=>{const samples=rows.filter(r=>r.stage===stage&&r.status==='完成'&&r.ms!==undefined);return samples.length?<p key={stage}>{stage}：平均 {(samples.reduce((sum,r)=>sum+r.ms!,0)/samples.length/1000).toFixed(2)}秒 · {samples.length}次</p>:null;})}
    {!rows.length&&<p>本批次暂无记录，接下来新开始的分支会自动计时。</p>}
    {[...rows].reverse().map(r=><div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid #ffffff26'}}><small>{new Date(r.started).toLocaleTimeString()} · {r.label}</small><p style={{margin:'4px 0'}}>{r.stage} · {r.ms!==undefined?(r.ms/1000).toFixed(2)+'秒':r.status==='进行中'?((Date.now()-r.started)/1000).toFixed(1)+'秒…':'—'} · {r.status}</p></div>)}
  </details>;
}
