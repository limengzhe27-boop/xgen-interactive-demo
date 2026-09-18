'use client';

import type { ReactNode } from 'react';
import { Compass, Users, GitBranch, Image as ImageIcon } from 'lucide-react';
import './creator-workspace.css';

export type CreatorWorkspaceModule = 'direction' | 'people' | 'story' | 'presentation';
export const creatorWorkspaceModules = [
  { id: 'direction', label: '设定与方向', icon: Compass },
  { id: 'people', label: '人物与关系', icon: Users },
  { id: 'story', label: '故事画布', icon: GitBranch },
  { id: 'presentation', label: '展示与素材', icon: ImageIcon },
] as const;

// A view over the parent's single draft. Never copy form values or follow model
// replies here. Keep panels mounted so navigation does not discard local edits.
export function CreatorWorkspace({ title, active, onSelect, panels, notice, onFieldFocus }: {
  title: string;
  active: CreatorWorkspaceModule;
  onSelect: (module: CreatorWorkspaceModule) => void;
  panels: Record<CreatorWorkspaceModule, ReactNode>;
  notice?: ReactNode;
  onFieldFocus?: (field: string) => void;
}) {
  return <aside className="creator-workspace-shell" aria-label="作品工作区" onFocusCapture={event => { const element = event.target as HTMLElement; if (element.matches('input, textarea, select')) onFieldFocus?.(element.getAttribute('aria-label') || element.id || ''); }}>
    <header className="workspace-heading"><div><small>你的作品 · 当前草稿</small><h2>{title || '从一个想法开始'}</h2></div><span>边聊边完善，也可直接编辑</span></header>
    <nav className="workspace-navigation" aria-label="工作区模块">
      {creatorWorkspaceModules.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={active === id} aria-controls={`workspace-${id}`} onClick={() => onSelect(id)}><Icon size={17} /><span>{label}</span></button>)}
    </nav>
    {notice}
    <div className="workspace-panels">
      {creatorWorkspaceModules.map(({ id, label }) => <section key={id} id={`workspace-${id}`} className="workspace-panel" aria-label={label} hidden={active !== id}>{panels[id]}</section>)}
    </div>
  </aside>;
}
