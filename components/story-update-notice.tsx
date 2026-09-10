'use client';
import type { StudioWorld } from '@/lib/studio-worlds';
import { storyUpgrade } from '@/lib/story-upgrade';
import { Button } from '@/components/ui/button';

export function StoryUpdateNotice({ current, latest, disabled, onApply }: { current: StudioWorld; latest?: StudioWorld; disabled?: boolean; onApply: (entry: StudioWorld) => void }) {
  const update = storyUpgrade(current, latest);
  if (!update) return null;
  return <section className="story-update-notice" aria-label="新增剧情">
    <div><strong>这个世界有新剧情了</strong><p>接入后保留当前角色和进度，不重新开始。</p></div>
    <Button variant="outline" disabled={disabled} onClick={()=>onApply(update.entry)}>接入新增剧情</Button>
  </section>;
}
