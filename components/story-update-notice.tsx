'use client';
import type { StudioWorld } from '@/lib/studio-worlds';
import { storyUpgrade } from '@/lib/story-upgrade';
import { Button } from '@/components/ui/button';
import { editionLabel } from '@/lib/story-editions';

export function StoryUpdateNotice({ current, latest, disabled, onApply }: { current: StudioWorld; latest?: StudioWorld; disabled?: boolean; onApply: (entry: StudioWorld) => void }) {
  const update = storyUpgrade(current, latest);
  if (!update) return current.edition ? <p className="story-edition-label">当前剧情 · {editionLabel(current)}</p> : null;
  return <section className="story-update-notice" aria-label="新增剧情">
    <div><strong>这个世界有新剧情了</strong><p>{editionLabel(current)} → {latest?.edition ? editionLabel(latest) : '新剧情版本'}。接入后保留角色和进度，不重新开始。</p></div>
    <Button variant="outline" disabled={disabled} onClick={()=>onApply(update.entry)}>接入新增剧情</Button>
  </section>;
}
