'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { StudioWorld } from '@/lib/studio-worlds';
import { PublicationActivity } from '@/components/publication-activity';

type Publication = { id: string; document: StudioWorld & { sourceId?: string }; published: boolean; updated_at: string };
export function MyPublications({ accountScope, drafts, onEdit, onDelete, onRestore, onRestoreEdition, onChanged }: {
  accountScope: string; drafts: { id: string; title: string }[]; onEdit: (id: string) => void; onDelete: (id: string) => void; onRestore: (entry: StudioWorld & { sourceId?: string }) => void; onChanged: () => void;
  onRestoreEdition: (entry: StudioWorld, edition: number) => void;
}) {
  const [rows, setRows] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [canPublish, setCanPublish] = useState(false);
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<'drafts' | 'publications'>('drafts');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleting = drafts.find(draft => draft.id === deleteId);
  useEffect(() => {
    const controller = new AbortController();
    if (accountScope === 'guest') { setLoading(false); return; }
    setLoading(true); setError('');
    void fetch('/api/worlds?mine=true', { cache: 'no-store', headers: { 'x-xgen-account': accountScope }, signal: controller.signal }).then(async r => {
      if (!r.ok) throw new Error();
      const data = await r.json() as { publications: Publication[]; canPublish: boolean };
      if (!Array.isArray(data.publications)) throw new Error();
      if (!controller.signal.aborted) { setRows(data.publications); setCanPublish(data.canPublish); }
    }).catch(() => { if (!controller.signal.aborted) setError('公开作品暂时无法读取，请重试。'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accountScope, revision]);
  async function change(row: Publication) {
    const message = row.published
      ? '下架后，其他访客不再从列表发现这部作品。已有存档、他人副本和公开图片链接不会被删除。确认下架？'
      : '重新公开此前保存的完整剧本和公开图片，不包含个人聊天与资料。确认这些内容仍可公开？';
    if (busy || !window.confirm(message)) return;
    setBusy(row.id); setError('');
    try {
      const response = await fetch('/api/worlds', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-xgen-account': accountScope }, body: JSON.stringify({ id: row.id, published: !row.published, updatedAt: row.updated_at, consent: 'publish-world-and-selected-images-v1' }) });
      if (!response.ok) { const data = await response.json() as { message?: string }; throw new Error(data.message || '操作未完成，请刷新列表再试。'); }
      setRevision(value => value + 1); onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : '操作失败'); }
    finally { setBusy(''); }
  }
  return <section className="my-publications" aria-label="我的作品管理">
    <h2>我的作品</h2>
    <div className="publication-tabs" aria-label="作品分类">
      <Button variant="ghost" aria-pressed={tab === 'drafts'} onClick={() => setTab('drafts')}>本机草稿 · {drafts.length}</Button>
      <Button variant="ghost" aria-pressed={tab === 'publications'} onClick={() => setTab('publications')}>公开版本</Button>
    </div>
    {tab === 'drafts' ? <>
      <p>编辑不会改变公开版本；修改完成后需再次确认发布。</p>
      {drafts.length ? drafts.map(draft => <article className="draft-row" key={draft.id}><div className="draft-label"><FileText aria-hidden="true" size={22}/><strong>{draft.title || '未命名世界'}</strong></div><div className="draft-actions"><button className="draft-edit" onClick={() => onEdit(draft.id)}><Pencil size={16} aria-hidden="true"/>继续编辑</button><button className="draft-remove" title="删除草稿" aria-label={`删除草稿：${draft.title || '未命名世界'}`} onClick={() => setDeleteId(draft.id)}><Trash2 size={18} aria-hidden="true"/></button></div></article>) : <p>还没有草稿。从“新建”开始一个世界。</p>}
    </> : <>
      {accountScope === 'guest' ? <p>登录后查看自己发布的作品。</p> : loading ? <p role="status">正在读取作品…</p> : !error && !rows.length ? <p>还没有公开版本。保存并试玩后，可在创作的发布设置中发布。</p> : null}
      {!loading && rows.map(row => <article key={row.id}><div><strong>{row.document.title}</strong><p>{row.published ? '已发布' : '已下架'} · {new Date(row.updated_at).toLocaleString('zh-CN')}</p></div><div>
        <a className="studio-button" href={`/?world=${row.document.id}`}>进入作品</a>
        {drafts.some(draft => draft.id === (row.document.sourceId || row.document.id)) ? <Button variant="outline" disabled={!!busy} onClick={() => onEdit(row.document.sourceId || row.document.id)}>编辑作品</Button>
          : <Button variant="outline" disabled={!!busy} onClick={() => { if (window.confirm('从公开版本恢复一份本机草稿，不包含原来的私人讨论。不会立即修改公开作品，继续？')) onRestore(row.document); }}>恢复并编辑</Button>}
        <Button variant="outline" disabled={!!busy || (!row.published && !canPublish)} onClick={() => void change(row)}>{busy === row.id ? '处理中…' : row.published ? '下架' : '重新发布'}</Button>
      </div><PublicationActivity key={`${accountScope}:${row.id}:${row.updated_at}`} id={row.id} accountScope={accountScope} onRestore={onRestoreEdition}/></article>)}
      {!canPublish && accountScope !== 'guest' && !loading && <p>新增发布与重新发布仍在验收；已有作品可以下架。</p>}
      {error && <p role="alert">{error}</p>}
      {accountScope !== 'guest' && <Button variant="ghost" disabled={loading || !!busy} onClick={() => setRevision(value => value + 1)}>刷新公开版本</Button>}
    </>}
    <Dialog open={!!deleting} onOpenChange={open => { if (!open) setDeleteId(null); }}>
      <DialogContent className="draft-delete-dialog" showCloseButton={false}>
        <DialogTitle>删除这份草稿？</DialogTitle>
        <DialogDescription>“{deleting?.title || '未命名世界'}”及其中的创作讨论将从本机移除，无法撤销。</DialogDescription>
        <p>已发布版本、体验记录和云端图片不会受影响。此前手动保存的云存档仍保留旧副本。</p>
        <div className="draft-dialog-actions"><button onClick={() => setDeleteId(null)}>保留草稿</button><button className="draft-confirm-delete" onClick={() => { if (deleting) onDelete(deleting.id); setDeleteId(null); }}>确认删除</button></div>
      </DialogContent>
    </Dialog>
  </section>;
}
