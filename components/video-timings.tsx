'use client';
import {useEffect,useState} from 'react';
import type {VideoTimingLog} from '@/lib/video-timing';
import {timingColumns,timingGroups,timingCell} from '@/lib/video-timing-table';
export function VideoTimings({log}:{log:VideoTimingLog}){
  const [,refresh]=useState(0),[open,setOpen]=useState(false);
  const [selected,setSelected]=useState<string|null>(null);
  const batch=selected&&log.batches.includes(selected)?selected:log.activeBatch;
  const rows=log.rows.filter(r=>(r.batch||'历史记录')===batch);
  const groups=timingGroups(rows);
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
    {!rows.length&&<p>本批次暂无记录，接下来新开始的分支会自动计时。</p>}
    {!!groups.length&&<>
      <p>每个分支视频一行，开始时间取该组最早记录。— 表示未记录或未经历；未选择的视频可能没有播放耗时。旧记录无法关联的片段单独保留。</p>
      <div role="region" aria-label="视频耗时表，可横向滚动" tabIndex={0} style={{overflowX:'auto',maxWidth:'100%'}}>
        <table style={{borderCollapse:'collapse',minWidth:1500,width:'100%',fontSize:14,fontVariantNumeric:'tabular-nums'}}>
          <caption style={{textAlign:'left',padding:'12px 0'}}>本批次 · {groups.length} 组</caption>
          <thead><tr>{['开始时间','视频 / 回合 / 分支',...timingColumns.map(c=>c[1])].map(title=><th scope="col" key={title} style={{textAlign:'left',padding:12,borderBottom:'1px solid #ffffff40',whiteSpace:'nowrap'}}>{title}</th>)}</tr></thead>
          <tbody>{groups.map(g=><tr key={g.id}>
            <th scope="row" style={{textAlign:'left',padding:12,borderBottom:'1px solid #ffffff26',whiteSpace:'nowrap',fontWeight:400}}>{new Date(g.started).toLocaleString()}</th>
            <td style={{padding:12,borderBottom:'1px solid #ffffff26',minWidth:220}}>{g.label}</td>
            {timingColumns.map(([stage])=><td key={stage} style={{padding:12,borderBottom:'1px solid #ffffff26',minWidth:115,verticalAlign:'top'}}>{timingCell(g.stages[stage])}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </details>;
}
