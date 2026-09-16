'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GitBranch, MapPin, Users, ArrowRight, Sparkles, Check, Trash2, GitFork, X as CloseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CreatorRoleDraft } from '@/lib/creator-changes';
import { creatorEntryPaths, creatorStoryIssues, isCreatorStoryGraph, type CreatorStoryGraph } from '@/lib/creator-story-graph';
import styles from './creator-story-canvas.module.css';

const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);
function Field({ label, value, onChange, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return <label className={styles.field}><span>{label}</span><textarea rows={rows} maxLength={3000} value={value} onChange={e => onChange(e.target.value)} /></label>;
}

function NodeDetails({ graph, nodeId, roleId, roleName, suggested, busy, onSave, onSelectNode, onAsk }: {
  graph: CreatorStoryGraph; nodeId: string; roleId: string; roleName: string; suggested: boolean; busy: boolean; onSave: (graph: CreatorStoryGraph) => void;
  onSelectNode?: (id: string) => void;
  onAsk: (text: string) => void;
}) {
  const [edited, setEdited] = useState(graph);
  const [notice, setNotice] = useState('');
  const node = edited.nodes.find(n => n.id === nodeId)!;
  const entry = edited.entries.find(e => e.roleId === roleId);
  const atEntry = entry?.nodeId === nodeId;
  const paths = creatorEntryPaths(edited, nodeId);
  const childNodes = edited.nodes.filter(n => node.nextNodeIds.includes(n.id));
  const parentNodes = edited.nodes.filter(n => n.nextNodeIds.includes(node.id));
  const candidateMergeNodes = edited.nodes.filter(n =>
    n.id !== node.id &&
    !node.nextNodeIds.includes(n.id)
  ).filter(n => {
    const testGraph = {
      ...edited,
      nodes: edited.nodes.map(item => item.id === node.id ? { ...item, nextNodeIds: [...item.nextNodeIds, n.id] } : item),
    };
    return creatorStoryIssues(testGraph).length === 0;
  });

  const updateNode = (patch: Partial<typeof node>) => setEdited(g => ({ ...g, nodes: g.nodes.map(n => n.id === nodeId ? { ...n, ...patch } : n) }));
  const updateEntry = (patch: Partial<CreatorStoryGraph['entries'][number]>) => setEdited(g => ({ ...g, entries: g.entries.map(e => e.roleId === roleId ? { ...e, ...patch } : e) }));
  const assign = () => {
    // Moving an entry cannot carry knowledge from a later/different point backwards.
    const nextEntries = [...edited.entries.filter(e => e.roleId !== roleId), { roleId, nodeId, defaultPath: paths[0] ?? [], knownFacts: [], beliefs: [], scene: '' }];
    const next = { ...edited, entries: nextEntries };
    setEdited(next);
    onSave(next);
    setNotice('已将角色入场移至此处。请补充此处的认知与场景。');
  };

  const handleAddNextNode = () => {
    const id = `node-${crypto.randomUUID().slice(0, 8)}`;
    const next = { ...edited, nodes: [...edited.nodes.map(n => n.id === nodeId ? { ...n, nextNodeIds: [...n.nextNodeIds, id] } : n), { id, title: '新的可能走向', location: '', scene: '', worldFacts: [], nextNodeIds: [] }] };
    const issue = creatorStoryIssues(next)[0];
    if (issue) { setNotice(issue); return; }
    setEdited(next);
    onSave(next);
    setNotice(node.nextNodeIds.length > 0 ? '已为此节点添加新的平行分支走向。' : '已添加后续走向节点，可在此完善场景。');
    if (onSelectNode) onSelectNode(id);
  };

  const handleDisconnectChild = (childId: string) => {
    const next = {
      ...edited,
      nodes: edited.nodes.map(item => item.id === node.id ? { ...item, nextNodeIds: item.nextNodeIds.filter(id => id !== childId) } : item),
    };
    const issues = creatorStoryIssues(next);
    if (issues.length) {
      setNotice(`无法断开此分支连线：${issues[0]}`);
      return;
    }
    setEdited(next);
    onSave(next);
    setNotice('已断开连线。');
  };

  const handleConnectExisting = (targetId: string) => {
    if (!targetId) return;
    const next = {
      ...edited,
      nodes: edited.nodes.map(item => item.id === node.id ? { ...item, nextNodeIds: [...item.nextNodeIds, targetId] } : item),
    };
    const issues = creatorStoryIssues(next);
    if (issues.length) {
      setNotice(`无法汇合到该节点：${issues[0]}`);
      return;
    }
    setEdited(next);
    onSave(next);
    setNotice(`已将走向汇合至「${edited.nodes.find(item => item.id === targetId)?.title || targetId}」`);
  };

  const handleDeleteNode = () => {
    if (node.id === edited.startNodeId) return;
    const parentNodes = edited.nodes.filter(n => n.nextNodeIds.includes(nodeId));
    const childIds = node.nextNodeIds;
    const nextNodes = edited.nodes
      .filter(n => n.id !== nodeId)
      .map(n => {
        if (n.nextNodeIds.includes(nodeId)) {
          const reconnected = n.nextNodeIds.filter(id => id !== nodeId);
          for (const childId of childIds) {
            if (!reconnected.includes(childId) && childId !== n.id) {
              reconnected.push(childId);
            }
          }
          return { ...n, nextNodeIds: reconnected };
        }
        return n;
      });

    const fallbackNodeId = parentNodes[0]?.id || edited.startNodeId;
    const fallbackPaths = creatorEntryPaths({ ...edited, nodes: nextNodes }, fallbackNodeId);
    const fallbackPath = fallbackPaths[0] || [edited.startNodeId];
    const nextEntries = edited.entries.map(e => {
      if (e.nodeId === nodeId) {
        return { ...e, nodeId: fallbackNodeId, defaultPath: fallbackPath, knownFacts: [], beliefs: [] };
      }
      if (e.defaultPath.includes(nodeId)) {
        const newPaths = creatorEntryPaths({ ...edited, nodes: nextNodes }, e.nodeId);
        return { ...e, defaultPath: newPaths[0] || [edited.startNodeId] };
      }
      return e;
    });

    const candidateGraph: CreatorStoryGraph = {
      startNodeId: edited.startNodeId,
      nodes: nextNodes,
      entries: nextEntries,
    };

    const problems = creatorStoryIssues(candidateGraph);
    if (problems.length) {
      setNotice(`无法删除此节点：${problems[0]}`);
      return;
    }
    setEdited(candidateGraph);
    onSave(candidateGraph);
    setNotice('已删除节点并保留故事连通。');
    if (onSelectNode) onSelectNode(fallbackNodeId);
  };

  const handleBlurCapture = (e: import('react').FocusEvent<HTMLFormElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    if (JSON.stringify(edited) !== JSON.stringify(graph)) {
      const problems = creatorStoryIssues(edited);
      if (!problems.length) {
        onSave(edited);
        setNotice('已自动保存修改。');
      }
    }
  };

  return <form className={styles.details} onBlurCapture={handleBlurCapture} onSubmit={e => { e.preventDefault(); const problems = creatorStoryIssues(edited); if (problems.length) { setNotice(problems[0]); return; } onSave(edited); setNotice('已保存修改。'); }}>
    <fieldset disabled={busy}>
      <div className={styles.detailHeading}>
        <div><small>节点详情 · {node.id === graph.startNodeId ? '共同起点' : '可能发生的事件'}</small><h3>{node.title}</h3></div>
        <Button type="submit" size="sm">{suggested ? '保存到建议' : '保存到草稿'}</Button>
      </div>
      <div className={styles.nodeActions}>
        <Button type="button" variant="outline" size="sm" disabled={edited.nodes.length >= 16} onClick={() => onAsk(`请构思并添加一个新事件节点，接在「${node.title}」（节点ID：${node.id}）之后${node.nextNodeIds.length ? '，作为另一条可能走向，保留已有后续' : ''}。请给出具体局面变化、人物可采取的行动与可能后果，保留原节点和所有角色首次入场。`)}><Sparkles size={14} />让 Agent 接着「{node.title}」构思</Button>
        <Button type="button" variant="outline" size="sm" disabled={edited.nodes.length >= 16} onClick={handleAddNextNode}>
          {node.nextNodeIds.length > 0 ? (
            <><GitFork size={14} />为此节点添加平行分支（第 {node.nextNodeIds.length + 1} 条走向）</>
          ) : (
            <><ArrowRight size={14} />手动添加后续走向</>
          )}
        </Button>
        {node.id !== edited.startNodeId && (
          <Button type="button" variant="ghost" size="sm" onClick={handleDeleteNode} style={{ color: 'var(--color-error)' }}>
            <Trash2 size={14} />删除此节点
          </Button>
        )}
      </div>
      <div className={styles.branchNavigation}>
        {parentNodes.length > 0 && (
          <div className={styles.branchList}>
            <span>上级走向：</span>
            {parentNodes.map(p => (
              <button type="button" key={p.id} className={styles.branchChip} onClick={() => onSelectNode?.(p.id)}>
                ← {p.title || '未命名'}
              </button>
            ))}
          </div>
        )}
        <div className={styles.branchList}>
          <span>后续分支（{childNodes.length}条）：</span>
          {childNodes.length === 0 ? (
            <small className={styles.branchEmpty}>尚未设置后续走向，可点击上方按钮添加。</small>
          ) : (
            childNodes.map((child, idx) => (
              <span key={child.id} className={styles.branchChip}>
                <span onClick={() => onSelectNode?.(child.id)}>
                  分支 {idx + 1}：{child.title || '未命名'} →
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  className={styles.branchChipClose}
                  title="断开此分支连线"
                  onClick={e => { e.stopPropagation(); handleDisconnectChild(child.id); }}
                >
                  <CloseIcon size={10} />
                </span>
              </span>
            ))
          )}
        </div>
        {candidateMergeNodes.length > 0 && (
          <div className={styles.mergeAction}>
            <label className={styles.mergeLabel}>
              <span>汇合走向：</span>
              <select
                value=""
                disabled={busy}
                onChange={e => handleConnectExisting(e.target.value)}
              >
                <option value="">连线到已有节点（分支汇合）…</option>
                {candidateMergeNodes.map(cand => (
                  <option key={cand.id} value={cand.id}>
                    汇合至：{cand.title || cand.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
      <div className={styles.detailColumns}>
        <section><h4>此刻的世界</h4><Field label="节点名称" value={node.title} rows={1} onChange={title => updateNode({ title })} /><Field label="时间与地点" value={node.location} rows={1} onChange={location => updateNode({ location })} /><Field label="场景与当前动作" value={node.scene} onChange={scene => updateNode({ scene })} /><Field label="客观事实 · 每行一条" value={node.worldFacts.join('\n')} onChange={v => updateNode({ worldFacts: lines(v) })} /></section>
        <section><h4>{roleName} · {atEntry ? '首次入场' : '与此事件的关系'}</h4>{atEntry ? <>
          <label className={styles.field}><span>新存档的默认前史</span><select value={JSON.stringify(entry.defaultPath)} onChange={e => { updateEntry({ defaultPath: JSON.parse(e.target.value), knownFacts: [], beliefs: [], scene: '' }); setNotice('前史路径已改变，请重新确认该角色的认知与入场，不沿用另一条分支的信息。'); }}>{paths.map(path => <option key={path.join('/')} value={JSON.stringify(path)}>{path.map(id => graph.nodes.find(n => n.id === id)?.title).join(' → ')}</option>)}</select></label>
          <Field label="已知事实 · 每行一条" value={entry.knownFacts.join('\n')} onChange={v => updateEntry({ knownFacts: lines(v) })} />
          <Field label="怀疑与误解 · 不等于事实" value={entry.beliefs.join('\n')} onChange={v => updateEntry({ beliefs: lines(v) })} />
          <Field label="玩家看到的第一人称入场" value={entry.scene} rows={3} onChange={scene => updateEntry({ scene })} />
        </> : <div className={styles.entryEmpty}><p>{entry ? `首次体验从「${graph.nodes.find(n => n.id === entry.nodeId)?.title}」开始，不会因为查看这个事件而改变。` : '这个角色尚未指定首次入场位置。'}</p><p>后续事件不需要重新设置入场。角色是否参与、获知什么，由故事条件与体验中的行动决定；无需预先写完全部对白。</p><details><summary>调整首次入场位置</summary><p>仅在希望这个角色从此事件开始体验时调整。原入场认知会清空，需重新确认。</p><Button type="button" variant="outline" disabled={!roleId || !paths.length} onClick={assign}>将首次入场改到这里<ArrowRight size={16} /></Button></details></div>}</section>
      </div>
      {notice && <output className={styles.notice}>{notice}</output>}
    </fieldset>
  </form>;
}

export function CreatorStoryCanvas({ title, graph: inputGraph, roles, images, suggested, busy, hasSuggestion, onMode, onSave, onAsk, onAdopt, onDismiss, onEditRoles, onEditRole }: {
  title?: string;
  onEditRole: (index: number, field: keyof CreatorRoleDraft, value: string) => void;
  graph: unknown; roles: CreatorRoleDraft[]; images: Record<string, string>; suggested: boolean; busy: boolean; hasSuggestion: boolean;
  onMode: (suggested: boolean) => void; onSave: (graph: CreatorStoryGraph) => void; onAsk: (text: string) => void; onAdopt: () => void; onDismiss?: () => void; onEditRoles: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState('draft-role-0');
  const [selectedNode, setSelectedNode] = useState('');
  const [tab, setTab] = useState<'story' | 'roles'>('roles');
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
    <header className={styles.header}><div><small>正在成形的故事</small><h2>{title || '你的故事画布'}</h2></div><span className={styles.status}>{suggested ? <Sparkles size={14} /> : <Check size={14} />}{suggested ? '建议 · 尚未采纳' : '当前草稿'}</span></header>
    <div className={styles.toolbar}><fieldset aria-label="画布内容"><button type="button" aria-pressed={tab === 'story'} onClick={() => setTab('story')}><GitBranch size={16} />故事脉络</button><button type="button" aria-pressed={tab === 'roles'} onClick={() => setTab('roles')}><Users size={16} />人物设定</button></fieldset>{hasSuggestion && <fieldset aria-label="画布版本"><button type="button" aria-pressed={!suggested} onClick={() => onMode(false)}>草稿</button><button type="button" aria-pressed={suggested} onClick={() => onMode(true)}>Agent 建议</button></fieldset>}</div>
    <div className={styles.roles} aria-label="选择角色视角">{roles.map((r, i) => <button key={r.editorId || i} type="button" aria-pressed={roleId === `draft-role-${i}`} onClick={() => { const id = `draft-role-${i}`; setSelectedRole(id); setSelectedNode(graph?.entries.find(e => e.roleId === id)?.nodeId ?? ''); }}><span className={styles.avatar}>{images[`draft-role-${i}`] ? <Image src={images[`draft-role-${i}`]} alt="" width={34} height={34} unoptimized /> : (r.name || '？').slice(0, 1)}</span><span>{r.name || `角色 ${i + 1}`}<small>{graph?.entries.find(e => e.roleId === `draft-role-${i}`) ? graph.nodes.find(n => n.id === graph.entries.find(e => e.roleId === `draft-role-${i}`)?.nodeId)?.title : '入场待设定'}</small></span></button>)}</div>
    <div className={styles.content}>
      {tab === 'roles' ? <div className={styles.person}>
        <div className={styles.personHeading}><div className={styles.portrait}>{images[roleId] ? <Image src={images[roleId]} alt={role?.name || '角色形象'} width={76} height={90} unoptimized /> : (role?.name || '？').slice(0, 1)}</div><div><small>人物档案</small><h3>{role?.name || '人物正在构思中'}</h3><p>{role?.identity || '说说你想遇见怎样的人，Agent 会在这里整理。'}</p></div></div>
        {role && <div className={styles.personSections}>
          {([['姓名', 'name'], ['身份', 'identity'], ['性格与相处', 'personality'], ['此刻想做什么', 'goal'], ['与其他人的关系', 'relationship']] as const).map(([label, field]) => <label className={styles.inlineField} key={`${role.editorId || roleId}-${field}`}><span>{label}</span><textarea aria-label={`编辑${label}`} rows={field === 'name' ? 1 : 2} maxLength={2000} value={role[field] || ''} placeholder="尚未聊到，可继续与 Agent 构思" disabled={busy} onChange={e => onEditRole(roleIndex, field, e.target.value)} /></label>)}
          <section className={styles.encounter}><h4>角色入场场景</h4><p>{entry?.scene || '还没有确定入场场景。可以先聊眼前发生了什么，不必填完整前情。'}</p>{entry && <Button variant="ghost" size="sm" onClick={() => { setSelectedNode(entry.nodeId); setTab('story'); }}>查看与修改入场<ArrowRight size={14} /></Button>}</section>
          <details><summary>他知道的事 · 怀疑与误解</summary><h4>已知事实</h4><p>{entry?.knownFacts.join('\n') || '尚未确定'}</p><h4>怀疑与误解</h4><p>{entry?.beliefs.join('\n') || '尚未确定'}</p><small>创作者可见，不会自动全部告知玩家。</small></details>
          <details><summary>外貌与随身物件</summary><Field label="形象细节" value={role.appearance || ''} onChange={value => onEditRole(roleIndex, 'appearance', value)} /></details>
        </div>}
        <Button variant="ghost" onClick={onEditRoles}>更多人物设置</Button>
      </div> : graph ? <>
        <div className={styles.legend}><span><i />{role?.name || '角色'}的入场</span><span>浅色节点：默认前史</span><span>连线：可能走向</span></div>
        <section className={styles.graphScroll} aria-label="共享故事节点与连线，可滚动"><div className={styles.graph} style={{ width, height: rows.length * 128 + 24 }}>
          <svg width={width} height={rows.length * 128 + 24} aria-hidden="true">{graph.nodes.flatMap(n => n.nextNodeIds.map(next => { const a = points.get(n.id)!, b = points.get(next)!; return <path key={`${n.id}-${next}`} d={`M${a.x + 103},${a.y + 88} C${a.x + 103},${a.y + 112} ${b.x + 103},${b.y - 24} ${b.x + 103},${b.y}`} />; }))}</svg>
          {graph.nodes.map(n => { const p = points.get(n.id)!; const names = graph.entries.filter(e => e.nodeId === n.id).map(e => roles[roleIds.indexOf(e.roleId)]?.name).filter(Boolean); return <button type="button" key={n.id} className={styles.node} style={{ left: p.x, top: p.y }} aria-pressed={nodeId === n.id} data-entry={entry?.nodeId === n.id} data-prior={entry?.defaultPath.includes(n.id) && entry.nodeId !== n.id} onClick={() => setSelectedNode(n.id)}><small>{n.id === graph.startNodeId ? '共同开场' : names.length ? `${names.join('、')}入场` : '可能走向'}</small><strong>{n.title}</strong><span><MapPin size={12} />{n.location || '地点待补充'}</span></button>; })}
        </div></section>
        <NodeDetails key={`${nodeId}/${roleId}/${JSON.stringify(graph)}`} graph={graph} nodeId={nodeId} roleId={roleId} roleName={role?.name || '所选角色'} suggested={suggested} busy={busy} onSave={onSave} onSelectNode={setSelectedNode} onAsk={onAsk} />
      </> : <div className={styles.empty}><GitBranch size={32} /><h3>{busy ? 'Agent 正在整理故事结构' : '从一个场景，长出整个故事'}</h3><p>{problem || '先聊聊人物在哪里、发生了什么。Agent 的故事节点与角色入场建议，会出现在这里。'}</p><Button variant="outline" disabled={busy} onClick={() => onAsk('请根据已有设定整理故事画布：共同开场、可能的后续分支，以及每个角色从哪个节点入场、当时知道什么。不要改变我已确认的人物和事件；不确定的地方先问我。')}>和 Agent 整理画布<ArrowRight size={16} /></Button><Button variant="ghost" disabled={busy || suggested} onClick={() => onSave({ startNodeId: 'opening', nodes: [{ id: 'opening', title: '共同开场', location: '', scene: '', worldFacts: [], nextNodeIds: [] }], entries: [] })}>先手动建立开场</Button></div>}
    </div>
    <footer className={styles.footer}>
      <span>{suggested ? '修改建议后再采纳，才会写入草稿。' : '画布描述作者框架，不是玩家存档；切换视角不会推进时间。'}</span>
      {hasSuggestion && suggested && <div className={styles.footerButtons}>
        {onDismiss && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onDismiss}>放弃建议</Button>}
        <Button type="button" size="sm" disabled={busy} onClick={onAdopt}>采纳本轮建议</Button>
      </div>}
    </footer>
  </aside>;
}
