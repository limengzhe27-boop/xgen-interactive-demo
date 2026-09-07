'use client';
import { Sparkles, LockKeyhole, ArrowUpRight } from 'lucide-react';
import { visibleSystem } from '@/lib/world-system';
import type { WorldDefinition } from '@/lib/ai-contracts';
import styles from './world-system-panel.module.css';

export function WorldSystemPanel({ world, roleId, completedTaskIds, onPrepare, disabled = false }: {
  world: WorldDefinition; roleId: string; completedTaskIds: string[]; onPrepare: (action: string) => void; disabled?: boolean;
}) {
  const system = visibleSystem(world, roleId, completedTaskIds);
  if (!system) return null;
  const role = world.characters.find(r => r.id === roleId)!;
  return <details className={styles.panel} open>
    <summary><Sparkles /><span><small>仅 {role.name} 可见</small><strong>{system.name}</strong></span><span className={styles.count}>{system.entries.filter(e => e.unlocked).length}/{system.entries.length} 已解锁</span></summary>
    <div className={styles.content}>
      <p>{system.premise}</p>
      <div className={styles.entries}>{system.entries.map(entry => <article key={entry.id} data-locked={!entry.unlocked}>
        <h3>{!entry.unlocked && <LockKeyhole />}{entry.title}<small>{entry.unlocked ? '可用' : '未解锁'}</small></h3>
        <p>{entry.description}</p>
        {!entry.unlocked && <small>条件：{entry.requirements.join(' → ')}</small>}
        {entry.unlocked && entry.action && <button type="button" disabled={disabled} onClick={() => onPrepare(entry.action)}>准备行动<ArrowUpRight /></button>}
      </article>)}</div>
    </div>
  </details>;
}
