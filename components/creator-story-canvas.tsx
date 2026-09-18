'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { GitBranch, MapPin, Users, ArrowRight, Sparkles, Check, Trash2, GitFork, X as CloseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CreatorRoleDraft } from '@/lib/creator-changes';
import { creatorEntryPaths, creatorEntryContext, possibilityRoleId, creatorStoryIssues, isCreatorStoryGraph, type CreatorStoryGraph } from '@/lib/creator-story-graph';
import styles from './creator-story-canvas.module.css';

const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);
function Field({ label, value, onChange, rows = 2, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <label className={styles.field}><span>{label}</span><textarea rows={rows} maxLength={3000} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} /></label>;
}

function NodeDetails({ graph, nodeId, roleId, roleName, roles, suggested, busy, onSave, onSelectNode, onAsk }: {
  roles: CreatorRoleDraft[];
  graph: CreatorStoryGraph; nodeId: string; roleId: string; roleName: string; suggested: boolean; busy: boolean; onSave: (graph: CreatorStoryGraph) => void;
  onSelectNode?: (id: string) => void;
  onAsk: (text: string) => void;
}) {
  const [edited, setEdited] = useState(graph);
  const [notice, setNotice] = useState('');
  const lastSavedGraphRef = useRef(JSON.stringify(graph));

  useEffect(() => {
    const graphStr = JSON.stringify(graph);
    if (graphStr !== lastSavedGraphRef.current) {
      lastSavedGraphRef.current = graphStr;
      setEdited(graph);
    }
  }, [graph]);

  // Publish valid edits to the parent immediately. No pending timer can be
  // discarded on node switches or resurrect a draft after external undo.
  const saveEdit = (next: CreatorStoryGraph) => {
    setEdited(next);
    const problems = creatorStoryIssues(next);
    if (problems.length) { setNotice(problems[0]); return; }
    lastSavedGraphRef.current = JSON.stringify(next);
    onSave(next);
  };
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

  const updateNode = (patch: Partial<typeof node>) => saveEdit({ ...edited, nodes: edited.nodes.map(n => n.id === nodeId ? { ...n, ...patch } : n) });
  const updateEntry = (patch: Partial<CreatorStoryGraph['entries'][number]>) => saveEdit({ ...edited, entries: edited.entries.map(e => e.roleId === roleId ? { ...e, ...patch } : e) });
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
                <button
                  type="button"
                  className={styles.branchChipLink}
                  onClick={() => onSelectNode?.(child.id)}
                >
                  分支 {idx + 1}：{child.title || '未命名'} →
                </button>
                <button
                  type="button"
                  className={styles.branchChipClose}
                  title="断开此分支连线"
                  aria-label={`断开与「${child.title || '分支'}」的连线`}
                  onClick={e => { e.stopPropagation(); handleDisconnectChild(child.id); }}
                >
                  <CloseIcon size={10} />
                </button>
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
      <div className={styles.detailStack}>
        {/* 上半区：主时空现场 · 单列大通栏 */}
        <div className={styles.masterSceneCard}>
          <h4>此刻的现场与客观世界</h4>
          <div className={styles.dualFields}>
            <Field label="节点名称" value={node.title} rows={1} placeholder="如：破庙避雨、偏殿对质" onChange={title => updateNode({ title })} />
            <Field label="时间与地点" value={node.location} rows={1} placeholder="如：暴雨初歇 · 废弃山神庙" onChange={location => updateNode({ location })} />
          </div>
          <Field label="现场发生与局面" value={node.scene} rows={3} placeholder="描述现场发生的核心事件、环境与正在发生的变故…" onChange={scene => updateNode({ scene })} />
          <Field label="现场实情（客观事实 · 选填）" value={node.worldFacts.join('\n')} rows={2} placeholder="客观发生但尚未公开的事实（如：密信已被调包、茶水有微毒），每行一条" onChange={v => updateNode({ worldFacts: lines(v) })} />
        </div>

        {/* 下半区：角色主观视线与开场 */}
        <div className={styles.rolePerspectiveCard}>
          <h4>
            角色主观视角 · {roleName}
            {atEntry ? (
              <span className={styles.entryBadge}>首次入场</span>
            ) : (
              <span className={styles.entryBadge} style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>推演关系</span>
            )}
          </h4>
          {atEntry ? (
            <>
              {paths.length > 1 && (
                <label className={styles.field}>
                  <span>新存档的默认前史</span>
                  <select
                    value={JSON.stringify(entry.defaultPath)}
                    onChange={e => {
                      updateEntry({ defaultPath: JSON.parse(e.target.value), knownFacts: [], beliefs: [], scene: '' });
                      setNotice('前史路径已改变，请重新确认该角色的认知与入场，不沿用另一条分支的信息。');
                    }}
                  >
                    {paths.map(path => (
                      <option key={path.join('/')} value={JSON.stringify(path)}>
                        {path.map(id => graph.nodes.find(n => n.id === id)?.title).join(' → ')}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Field
                label="第一视角开场"
                value={entry.scene}
                rows={3}
                placeholder={`玩家以「${roleName}」视角首次进入此场景时看到的画面、心理活动或面临的抉择…`}
                onChange={scene => updateEntry({ scene })}
              />
              <details className={styles.advancedDetails}>
                <summary>+ 展开配置角色掌握的线索（已知事实）与认知盲区 (选填)</summary>
                <div className={styles.advancedContent}>
                  <Field
                    label="角色掌握的线索（已知事实）"
                    value={entry.knownFacts.join('\n')}
                    rows={2}
                    placeholder="角色此时已掌握的线索或情报（不等于全部事实），每行一条"
                    onChange={v => updateEntry({ knownFacts: lines(v) })}
                  />
                  <Field
                    label="角色的误解 / 偏见盲区"
                    value={entry.beliefs.join('\n')}
                    rows={2}
                    placeholder="角色深信不疑但可能并不属实的偏见或误会，每行一条"
                    onChange={v => updateEntry({ beliefs: lines(v) })}
                  />
                </div>
              </details>
            </>
          ) : (
            <div className={styles.entryEmpty}>
              {(() => {
                const rolePossibilities = (node.possibilities ?? []).filter(p => possibilityRoleId(p, roles.map((r, i) => ({ id: `draft-role-${i}`, name: r.name }))) === roleId);

                return (
                  <>
                    <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>
                      {creatorEntryContext(edited, roleId, nodeId)}
                    </p>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      该节点为后续推演节点，角色的线索由前序事件推演继承，无需重复配置初始事实；在此的行动由走向决定。
                    </p>

                    {rolePossibilities.length > 0 ? (
                      <div style={{ margin: '10px 0', padding: '10px 12px', background: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                        <strong style={{ fontSize: 12, color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>
                          「{roleName}」在此事件中的可能行动与反应：
                        </strong>
                        {rolePossibilities.map((p, idx) => (
                          <div key={idx} style={{ fontSize: 12, lineHeight: 1.6, padding: '4px 0', borderBottom: idx < rolePossibilities.length - 1 ? '1px dashed var(--color-border)' : 'none' }}>
                            {p.condition && <span style={{ color: 'var(--color-text-secondary)', marginRight: 4 }}>【条件：{p.condition}】</span>}
                            <strong style={{ color: 'var(--color-text)' }}>{p.action || '未具体填写行动'}</strong>
                            {p.consequence && <span style={{ color: 'var(--color-primary)' }}> → {p.consequence}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: '8px 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        当前事件暂未配置「{roleName}」的专属可能行动。
                      </p>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={(node.possibilities?.length ?? 0) >= 6}
                      onClick={() => updateNode({ possibilities: [...(node.possibilities ?? []), { actor: roleName, roleId, action: '', consequence: '' }] })}
                    >
                      + 为「{roleName}」补充此事件的可能行动
                    </Button>
                    {(node.possibilities?.length ?? 0) >= 6 && <p>已达上限 6 项。可修改已有可能性；确有不同事件时再新建分支节点。</p>}

                    <details style={{ marginTop: 14 }}>
                      <summary>将「{roleName}」的首次入场调整到这里</summary>
                      <p style={{ margin: '6px 0', fontSize: 12 }}>仅在希望该角色从本事件开始体验时调整。原入场认知会清空，需重新确认。</p>
                      <Button type="button" variant="outline" size="sm" disabled={!roleId || !paths.length} onClick={assign}>
                        将首次入场改到这里<ArrowRight size={14} />
                      </Button>
                    </details>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      <details className={styles.possibilitiesSection}>
        <summary>可能的行动与分支代价 (选填)</summary>
        <p style={{ margin: '8px 0 12px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>多个方向不是必选其一：条件未满足可以都不发生，玩家也能走出新的方向。无需写完所有分支，不改变首次入场。</p>
        {node.id !== edited.startNodeId && <label className={styles.field}><span>事件性质</span><select value={node.eventIntent ?? 'possible'} onChange={e => updateNode({ eventIntent: e.target.value as 'possible' | 'key_event' })}><option value="possible">可能发生 · 随行动与条件推演</option><option value="key_event">作者指定的关键事件 · 希望最终发生</option></select></label>}
        {node.eventIntent === 'key_event' && <p style={{ fontSize: 12, color: 'var(--color-primary)', margin: '4px 0 10px' }}>这是你指定的故事方向，不是已发生事实。发生方式、时机和后果仍开放，不替玩家决定行动，也不绕过世界规则。</p>}
        <Field label="什么情况下可能发生" value={node.trigger ?? ''} placeholder="如：当角色主动揭开暗格时" onChange={trigger => updateNode({ trigger })} />
        {(node.possibilities ?? []).map((possibility, index) => <div key={index} style={{ padding: '12px', background: 'var(--color-bg-elevated)', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 12 }}>
          <Field label="什么情况下适用 · 可选" value={possibility.condition ?? ''} placeholder="如：持有青铜印信" onChange={condition => updateNode({ possibilities: node.possibilities!.map((p, i) => i === index ? { ...p, condition } : p) })} />
          <label className={styles.field}><span>行动归属 · 不等于已经在场</span><select value={possibilityRoleId(possibility, roles.map((r, i) => ({ id: `draft-role-${i}`, name: r.name }))) ?? ''} onChange={e => updateNode({ possibilities: node.possibilities!.map((p, i) => i === index ? { ...p, roleId: e.target.value || null, actor: e.target.value ? roles[Number(e.target.value.replace('draft-role-', ''))].name : p.actor } : p) })}><option value="">未绑定角色 / 自由描述</option>{roles.map((r, i) => <option key={r.editorId || i} value={`draft-role-${i}`}>{r.name || `角色 ${i + 1}`}</option>)}</select></label>
          <Field label="参与者描述 · 修改后需重新确认归属" rows={1} value={possibility.actor} placeholder="参与此行动的人员或阵营" onChange={actor => updateNode({ possibilities: node.possibilities!.map((p, i) => i === index ? { ...p, actor, roleId: null } : p) })} />
          <Field label="可能采取什么行动" value={possibility.action} placeholder="如：当面质问或是暗中藏匿证物" onChange={action => updateNode({ possibilities: node.possibilities!.map((p, i) => i === index ? { ...p, action } : p) })} />
          <Field label="可能获得什么、付出什么，或引起谁的反应" value={possibility.consequence} placeholder="后果与局势变化" onChange={consequence => updateNode({ possibilities: node.possibilities!.map((p, i) => i === index ? { ...p, consequence } : p) })} />
          <Button type="button" variant="outline" size="sm" onClick={() => updateNode({ possibilities: node.possibilities!.filter((_, i) => i !== index) })}>移除这项可能</Button>
        </div>)}
        <Button type="button" variant="outline" size="sm" disabled={(node.possibilities?.length ?? 0) >= 6} onClick={() => updateNode({ possibilities: [...(node.possibilities ?? []), { actor: '', action: '', consequence: '' }] })}>+ 添加一种可能</Button>
        {(node.possibilities?.length ?? 0) >= 6 && <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }}>已达上限 6 项。可修改已有可能性；确有不同事件时再新建分支节点。</p>}
      </details>
      {notice && <output className={styles.notice}>{notice}</output>}
    </fieldset>
  </form>;
}

export function CreatorStoryCanvas({ storyOnly = false, readOnly = false, title, graph: inputGraph, roles, images, suggested, busy, hasSuggestion, onMode, onSave, onAsk, onAdopt, onDismiss, onEditRoles, onEditRole }: {
  storyOnly?: boolean;
  readOnly?: boolean;
  title?: string;
  onEditRole: (index: number, field: keyof CreatorRoleDraft, value: string) => void;
  graph: unknown; roles: CreatorRoleDraft[]; images: Record<string, string>; suggested: boolean; busy: boolean; hasSuggestion: boolean;
  onMode: (suggested: boolean) => void; onSave: (graph: CreatorStoryGraph) => void; onAsk: (text: string) => void; onAdopt: () => void; onDismiss?: () => void; onEditRoles: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState('draft-role-0');
  const [selectedNode, setSelectedNode] = useState('');
  const [selectedTab, setTab] = useState<'story' | 'roles'>('roles');
  const tab = storyOnly ? 'story' : selectedTab;
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
    {!storyOnly && <header className={styles.header}><div><small>正在成形的故事</small><h2>{title || '你的故事画布'}</h2></div><span className={styles.status}>{suggested ? <Sparkles size={14} /> : <Check size={14} />}{suggested ? '建议 · 尚未采纳' : '当前草稿'}</span></header>}
    <div className={styles.toolbar}>{!storyOnly && <fieldset aria-label="画布内容"><button type="button" aria-pressed={tab === 'story'} onClick={() => setTab('story')}><GitBranch size={16} />故事脉络</button><button type="button" aria-pressed={tab === 'roles'} onClick={() => setTab('roles')}><Users size={16} />人物设定</button></fieldset>}{hasSuggestion && <fieldset aria-label="画布版本"><button type="button" aria-pressed={!suggested} onClick={() => onMode(false)}>草稿</button><button type="button" aria-pressed={suggested} onClick={() => onMode(true)}>Agent 建议</button></fieldset>}</div>
    <div className={styles.roles} aria-label="选择角色视角">{roles.map((r, i) => <button key={r.editorId || i} type="button" aria-pressed={roleId === `draft-role-${i}`} onClick={() => {
      const id = `draft-role-${i}`;
      setSelectedRole(id);
      // 切换角色时保持当前选中的故事分支与事件点，不强制跳转到新角色的首次入场节点
      if (nodeId && graph?.nodes.some(n => n.id === nodeId)) {
        setSelectedNode(nodeId);
      }
    }}><span className={styles.avatar}>{images[`draft-role-${i}`] ? <Image src={images[`draft-role-${i}`]} alt="" width={34} height={34} unoptimized /> : (r.name || '？').slice(0, 1)}</span><span>{r.name || `角色 ${i + 1}`}<small>{graph?.entries.find(e => e.roleId === `draft-role-${i}`) ? graph.nodes.find(n => n.id === graph.entries.find(e => e.roleId === `draft-role-${i}`)?.nodeId)?.title : '入场待设定'}</small></span></button>)}</div>
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
        <NodeDetails key={`${suggested ? 'proposal' : 'draft'}/${nodeId}/${roleId}`} graph={graph} nodeId={nodeId} roleId={roleId} roleName={role?.name || '所选角色'} roles={roles} suggested={suggested} busy={busy || readOnly} onSave={onSave} onSelectNode={setSelectedNode} onAsk={onAsk} />
      </> : <div className={styles.empty}><GitBranch size={32} /><h3>{busy ? 'Agent 正在整理故事结构' : '从一个场景，长出整个故事'}</h3><p>{problem || '先聊聊人物在哪里、发生了什么。Agent 的故事节点与角色入场建议，会出现在这里。'}</p><Button variant="outline" disabled={busy} onClick={() => onAsk('请根据已有设定整理故事画布：共同开场、可能的后续分支，以及每个角色从哪个节点入场、当时知道什么。不要改变我已确认的人物和事件；不确定的地方先问我。')}>和 Agent 整理画布<ArrowRight size={16} /></Button><Button variant="ghost" disabled={busy || suggested} onClick={() => onSave({ startNodeId: 'opening', nodes: [{ id: 'opening', title: '共同开场', location: '', scene: '', worldFacts: [], nextNodeIds: [] }], entries: [] })}>先手动建立开场</Button></div>}
    </div>
    <footer className={styles.footer}>
      <span>{readOnly ? '续写建议仅供预览；采纳后，可在草稿中继续编辑。' : suggested ? '修改建议后再采纳，才会写入草稿。' : '画布描述作者框架，不是玩家存档；切换视角不会推进时间。'}</span>
      {hasSuggestion && suggested && <div className={styles.footerButtons}>
        {onDismiss && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onDismiss}>放弃建议</Button>}
        <Button type="button" size="sm" disabled={busy} onClick={onAdopt}>采纳本轮建议</Button>
      </div>}
    </footer>
  </aside>;
}
