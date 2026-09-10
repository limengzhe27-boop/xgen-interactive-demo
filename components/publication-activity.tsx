'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
type Edition = { edition: number; saved_at: string; title: string };
export function PublicationActivity({ id, accountScope }: { id: string; accountScope: string }) {
  const [open, setOpen] = useState(false), [before, setBefore] = useState<number | null>(null), [revision, setRevision] = useState(0);
  const [editions, setEditions] = useState<Edition[]>([]), [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    const read = async (url: string) => {
      const response = await fetch(url, { cache: 'no-store', headers: { 'x-xgen-account': accountScope }, signal: controller.signal });
      if (!response.ok) throw new Error('发布历史与催更暂时不可用，请稍后重试。');
      return response.json() as Promise<{ editions?: Edition[]; inbox?: { publication_id: string; requests: number }[] }>;
    };
    void Promise.all([read(`/api/worlds/updates?id=${id}${before ? `&before=${before}` : ''}`), read('/api/worlds/updates')]).then(([history, inbox]) => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(history.editions) || !Array.isArray(inbox.inbox)) throw new Error('暂时无法读取记录。');
      setEditions(history.editions);
      const item = inbox.inbox.find((row: { publication_id: string }) => row.publication_id === id);
      setCount(item ? Number(item.requests) : null);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, accountScope, open, before, revision]);
  return <details onToggle={event => setOpen(event.currentTarget.open)}><summary>催更与发布记录</summary>
    {loading ? <p role="status">正在读取…</p> : error ? <p role="alert">{error}</p> : <>
      <p>{count === null ? '暂无发布记录' : `当前发布版 · ${count} 人催更`}</p>
      {editions.map(item => <p key={item.edition}>发布版 {item.edition} · {item.title} · {new Date(item.saved_at).toLocaleString('zh-CN')}</p>)}
      {editions.length === 10 && <Button variant="ghost" onClick={() => setBefore(editions[editions.length - 1].edition)}>更早记录</Button>}
      {before && <Button variant="ghost" onClick={() => setBefore(null)}>返回最新</Button>}
    </>}
    <Button variant="ghost" disabled={loading} onClick={() => setRevision(value => value + 1)}>刷新记录</Button>
  </details>;
}
