'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GitBranch, MapPin, Users, ArrowRight, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CreatorRoleDraft } from '@/lib/creator-changes';
import { creatorEntryPaths, creatorStoryIssues, isCreatorStoryGraph, type CreatorStoryGraph } from '@/lib/creator-story-graph';
import styles from './creator-story-canvas.module.css';

const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);
function Field({ label, value, onChange, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return <label className={styles.field}><span>{label}</span><textarea rows={rows} maxLength={3000} value={value} onChange={e => onChange(e.target.value)} /></label>;
}

function NodeDetails({ graph, nodeId, roleId, roleName, suggested, busy, onSave }: {
  graph: CreatorStoryGraph; nodeId: string; roleId: string; roleName: string; suggested: boolean; busy: boolean; onSave: (graph: CreatorStoryGraph) => void;
}) {
  const [edited, setEdited] = useState(graph);
  const [notice, setNotice] = useState('');
  const node = edited.nodes.find(n => n.id === nodeId)!;
  const entry = edited.entries.find(e => e.roleId === roleId);
  const atEntry = entry?.nodeId === nodeId;
  const paths = creatorEntryPaths(edited, nodeId);
  const updateNode = (patch: Partial<typeof node>) => setEdited(g => ({ ...g, nodes: g.nodes.map(n => n.id === nodeId ? { ...n, ...patch } : n) }));
  const updateEntry = (patch: Partial<CreatorStoryGraph['entries'][number]>) => setEdited(g => ({ ...g, entries: g.entries.map(e => e.roleId === roleId ? { ...e, ...patch } : e) }));
  const assign = () => {
    // Moving an entry cannot carry knowledge from a later/different point backwards.
    setEdited(g => ({ ...g, entries: [...g.entries.filter(e => e.roleId !== roleId), { roleId, nodeId, defaultPath: paths[0] ?? [], knownFacts: [], beliefs: [], scene: '' }] }));
    setNotice('已选择新入场位置。请补充此刻的认知和场景，再保存；原认知不会自动搬过来。');
  };
  return <form className={styles.details} onSubmit={e => { e.preventDefault(); const problems = creatorStoryIssues(edited); if (problems.length) { setNotice(problems[0]); return; } onSave(edited); setNotice('已保存修改。'); }}>
    <fieldset disabled={busy}>
      <div className={styles.detailHeading}><div><small>节点详情 · {node.id === graph.startNodeId ? '共同起点' : '可能发生的事件'}</small><h3>{node.title}</h3></div><Button type="submit" size="sm">{suggested ? '保存到建议' : '保存到草稿'}</Button></div>
      <Button type="button" variant="ghost" size="sm" disabled={edited.nodes.length >= 16} onClick={() => {
        const id = `node-${crypto.randomUUID()}`;
        const next = { ...edited, nodes: [...edited.nodes.map(n => n.id === nodeId ? { ...n, nextNodeIds: [...n.nextNodeIds, id] } : n), { id, title: '新的可能走向', location: '', scene: '', worldFacts: [], nextNodeIds: [] }] };
        const issue = creatorStoryIssues(next)[0];
        if (issue) { setNotice(issue); return; }
        setEdited(next); onSave(next);
      }}>添加后续节点<ArrowRight size={14} /></Button>
      <div className={styles.detailColumns}>
        <section><h4>此刻的世界</h4><Field label="节点名称" value={node.title} rows={1} onChange={title => updateNode({ title })} /><Field label="时间与地点" value={node.location} rows={1} onChange={location => updateNode({ location })} /><Field label="场景与当前动作" value={node.scene} onChange={scene => updateNode({ scene })} /><Field label="客观事实 · 每行一条" value={node.worldFacts.join('\n')} onChange={v => updateNode({ worldFacts: lines(v) })} /></section>
        <section><h4>{roleName} · 如何进入</h4>{atEntry ? <>
          <label className={styles.field}><span>新存档的默认前史</span><select value={JSON.stringify(entry.defaultPath)} onChange={e => { updateEntry({ defaultPath: JSON.parse(e.target.value), knownFacts: [], beliefs: [], scene: '' }); setNotice('前史路径已改变，请重新确认该角色的认知与入场，不沿用另一条分支的信息。'); }}>{paths.map(path => <option key={path.join('/')} value={JSON.stringify(path)}>{path.map(id => graph.nodes.find(n => n.id === id)?.title).join(' → ')}</option>)}</select></label>
          <Field label="已知事实 · 每行一条" value={entry.knownFacts.join('\n')} onChange={v => updateEntry({ knownFacts: lines(v) })} />
          <Field label="怀疑与误解 · 不等于事实" value={entry.beliefs.join('\n')} onChange={v => updateEntry({ beliefs: lines(v) })} />
          <Field label="玩家看到的第一人称入场" value={entry.scene} rows={3} onChange={scene => updateEntry({ scene })} />
        </> : <div className={styles.entryEmpty}><p>{entry ? `这个角色当前从「${graph.nodes.find(n => n.id === entry.nodeId)?.title}」进入。` : '这个角色尚未指定入场位置。'}</p><p>晚登场角色可以从这里开始。其认知需要单独设定，不会自动获得全部世界事实。</p><Button type="button" variant="outline" disabled={!roleId || !paths.length} onClick={assign}>从此处入场<ArrowRight size={16} /></Button></div>}</section>
      </div>
      {notice && <output className={styles.notice}>{notice}</output>}
    </fieldset>
  </form>;
}

export function CreatorStoryCanvas({ graph: inputGraph, roles, images, suggested, busy, hasSuggestion, onMode, onSave, onAsk, onAdopt, onEditRoles }: {
  graph: unknown; roles: CreatorRoleDraft[]; images: Record<string, string>; suggested: boolean; busy: boolean; hasSuggestion: boolean;
  onMode: (suggested: boolean) => void; onSave: (graph: CreatorStoryGraph) => void; onAsk: (text: string) => void; onAdopt: () => void; onEditRoles: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState('draft-role-0');
  const [selectedNode, setSelectedNode] = useState('');
  const [tab, setTab] = useState<'story' | 'roles'>('story');
  const problem = creatorStoryIssues(inputGraph)[0];
  const graph = !problem && isCreatorStoryGraph(inputGraph) ? inputGraph : undefined;
  const roleIds = roles.map((_, i) => `draft-role-${i}`);
  const roleId = roleIds.includes(selectedRole) ? selectedRole : roleIds[0] ?? '';
  const roleIndex = roleIds.indexOf(roleId), role = roles[roleIndex];
  const entry = graph?.entries.find(e => e.roleId === roleId);
  const nodeId = graph?.nodes.some(n => n.id === selectedNode) ? selectedNode : entry?.nodeId ?? graph?.startNodeId ?? '';
  // Bounded DAG layout, shared for every role. No role-specific copy of the world.
  const levels = new Map<string, number>();
  if (graph) {
    levels.set(graph.startNodeId, 0);
    for (let i = 0; i < graph.nodes.length; i++) for (const n of graph.nodes) if (levels.has(n.id)) for (const next of n.nextNodeIds) levels.set(next, Math.max(levels.get(next) ?? 0, levels.get(n.id)! + 1));
  }
  const rows = [...new Set(levels.values())].sort((a, b) => a - b).map(level => graph!.nodes.filter(n => levels.get(n.id) === level));
  const width = Math.max(560, ...rows.map(row => row.length * 226 + 24));
  const points = new Map(rows.flatMap((row, y) => row.map((n, x) => [n.id, { x: (width - row.length * 226) / 2 + x * 226 + 10, y: 24 + y * 128 }] as const)));
  return <aside className={styles.root} aria-label="故事创作画布" aria-busy={busy}>
    <header className={styles.header}><div><small>让想法慢慢成形</small><h2>你的故事画布</h2></div><span className={styles.status}>{suggested ? <Sparkles size={14} /> : <Check size={14} />}{suggested ? '建议 · 尚未采纳' : '当前草稿'}</span></header>
    <div className={styles.toolbar}><fieldset aria-label="画布内容"><button type="button" aria-pressed={tab === 'story'} onClick={() => setTab('story')}><GitBranch size={16} />故事脉络</button><button type="button" aria-pressed={tab === 'roles'} onClick={() => setTab('roles')}><Users size={16} />人物设定</button></fieldset>{hasSuggestion && <fieldset aria-label="画布版本"><button type="button" aria-pressed={!suggested} onClick={() => onMode(false)}>草稿</button><button type="button" aria-pressed={suggested} onClick={() => onMode(true)}>Agent 建议</button></fieldset>}</div>
    <div className={styles.roles} aria-label="选择角色视角">{roles.map((r, i) => <button key={r.editorId || i} type="button" aria-pressed={roleId === `draft-role-${i}`} onClick={() => { const id = `draft-role-${i}`; setSelectedRole(id); setSelectedNode(graph?.entries.find(e => e.roleId === id)?.nodeId ?? ''); }}><span className={styles.avatar}>{images[`draft-role-${i}`] ? <Image src={images[`draft-role-${i}`]} alt="" width={34} height={34} unoptimized /> : (r.name || '？').slice(0, 1)}</span><span>{r.name || `角色 ${i + 1}`}<small>{graph?.entries.find(e => e.roleId === `draft-role-${i}`) ? graph.nodes.find(n => n.id === graph.entries.find(e => e.roleId === `draft-role-${i}`)?.nodeId)?.title : '入场待设定'}</small></span></button>)}</div>
    <div className={styles.content}>
      {tab === 'roles' ? <div className={styles.person}><small>人物档案</small><h3>{role?.name || '尚未设定人物'}</h3>{[['身份', role?.identity], ['性格与行为', role?.personality], ['想要什么', role?.goal], ['与其他人的关系', role?.relationship], ['形象与细节', role?.appearance]].map(([label, value]) => <div key={label}><h4>{label}</h4><p>{value || '待补充'}</p></div>)}<Button variant="outline" onClick={onEditRoles}>{suggested ? '在左侧编辑人物建议' : '编辑人物设定'}</Button></div> : graph ? <>
        <div className={styles.legend}><span><i />{role?.name || '角色'}的入场</span><span>浅色节点：默认前史</span><span>连线：可能走向</span></div>
        <section className={styles.graphScroll} aria-label="共享故事节点与连线，可滚动"><div className={styles.graph} style={{ width, height: rows.length * 128 + 24 }}>
          <svg width={width} height={rows.length * 128 + 24} aria-hidden="true">{graph.nodes.flatMap(n => n.nextNodeIds.map(next => { const a = points.get(n.id)!, b = points.get(next)!; return <path key={`${n.id}-${next}`} d={`M${a.x + 103},${a.y + 88} C${a.x + 103},${a.y + 112} ${b.x + 103},${b.y - 24} ${b.x + 103},${b.y}`} />; }))}</svg>
          {graph.nodes.map(n => { const p = points.get(n.id)!; const names = graph.entries.filter(e => e.nodeId === n.id).map(e => roles[roleIds.indexOf(e.roleId)]?.name).filter(Boolean); return <button type="button" key={n.id} className={styles.node} style={{ left: p.x, top: p.y }} aria-pressed={nodeId === n.id} data-entry={entry?.nodeId === n.id} data-prior={entry?.defaultPath.includes(n.id) && entry.nodeId !== n.id} onClick={() => setSelectedNode(n.id)}><small>{n.id === graph.startNodeId ? '共同开场' : names.length ? `${names.join('、')}入场` : '可能走向'}</small><strong>{n.title}</strong><span><MapPin size={12} />{n.location || '地点待补充'}</span></button>; })}
        </div></section>
        <NodeDetails key={`${nodeId}/${roleId}/${JSON.stringify(graph)}`} graph={graph} nodeId={nodeId} roleId={roleId} roleName={role?.name || '所选角色'} suggested={suggested} busy={busy} onSave={onSave} />
      </> : <div className={styles.empty}><GitBranch size={32} /><h3>{busy ? 'Agent 正在整理故事结构' : '从一个场景，长出整个故事'}</h3><p>{problem || '先聊聊人物在哪里、发生了什么。Agent 的故事节点与角色入场建议，会出现在这里。'}</p><Button variant="outline" disabled={busy} onClick={() => onAsk('请根据已有设定整理故事画布：共同开场、可能的后续分支，以及每个角色从哪个节点入场、当时知道什么。不要改变我已确认的人物和事件；不确定的地方先问我。')}>和 Agent 整理画布<ArrowRight size={16} /></Button><Button variant="ghost" disabled={busy || suggested} onClick={() => onSave({ startNodeId: 'opening', nodes: [{ id: 'opening', title: '共同开场', location: '', scene: '', worldFacts: [], nextNodeIds: [] }], entries: [] })}>先手动建立开场</Button></div>}
    </div>
    <footer className={styles.footer}><span>{suggested ? '修改建议后再采纳，才会写入草稿。' : '画布描述作者框架，不是玩家存档；切换视角不会推进时间。'}</span>{hasSuggestion && suggested && <Button size="sm" disabled={busy} onClick={onAdopt}>采纳本轮建议</Button>}</footer>
  </aside>;
}
