'use client';

import { BookOpen, UserRound } from 'lucide-react';

export type CreateMode = 'world' | 'character';

export function CreateModeSwitch({ mode, onChange }: { mode: CreateMode; onChange: (mode: CreateMode) => void }) {
  return <nav className="creation-mode-switch" aria-label="创作类型">
    <button type="button" aria-pressed={mode === 'world'} onClick={() => onChange('world')}><BookOpen /><span>创建世界</span></button>
    <button type="button" aria-pressed={mode === 'character'} onClick={() => onChange('character')}><UserRound /><span>创建角色</span></button>
  </nav>;
}
