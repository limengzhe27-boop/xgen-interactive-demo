'use client';
import type { StoryEdition } from '@/lib/story-editions';
import { Button } from '@/components/ui/button';

export function StoryEditionHistory({ editions, disabled, onRestore }: { editions: StoryEdition[]; disabled: boolean; onRestore: (edition: StoryEdition) => void }) {
  if(!editions.length)return null;
  return <details className="story-edition-history"><summary>保存版本 · {editions.length} 版</summary>
    <p>历史内容不会随草稿修改。另存为新草稿，不改变原作品和玩家进度；可随私人云存档手动备份。</p>
    {[...editions].reverse().map(edition=><article key={edition.id}>
      <div><strong>保存版 {edition.number} · {edition.entry.title}</strong><p>{edition.savedAt?new Date(edition.savedAt).toLocaleString('zh-CN'):'原有版本 · 保存时间未知'} · {edition.entry.world.characters.length} 位角色 · {edition.entry.world.tasks.length} 项剧情任务</p></div>
      <details><summary>查看此版内容</summary><p>{edition.entry.world.premise}</p><ul>{edition.entry.world.tasks.map(task=><li key={task.id}>{task.title}：{task.description}</li>)}</ul></details>
      <Button variant="outline" disabled={disabled} onClick={()=>onRestore(edition)}>另存为新草稿</Button>
    </article>)}
  </details>;
}
