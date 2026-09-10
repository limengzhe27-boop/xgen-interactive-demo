'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function RequestStoryUpdate({ worldId, accountScope }: { worldId: string; accountScope: string }) {
  const [busy, setBusy] = useState(false), [received, setReceived] = useState(false), [message, setMessage] = useState('');
  if (!/^community-[a-f0-9]{64}$/.test(worldId)) return null;
  async function send() {
    if (busy || received) return;
    if (accountScope === 'guest' || accountScope === 'pending') { setMessage('登录后可以向作者催更。'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/worlds/updates', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-xgen-account': accountScope }, body: JSON.stringify({ id: worldId }), signal: AbortSignal.timeout(20000) });
      const data = await response.json() as { received?: boolean; message?: string };
      if (!response.ok || data.received !== true) throw new Error(data.message || '催更暂未送达。');
      setReceived(true); setMessage(data.message || '已记入作者的催更列表。');
    } catch (error) { setMessage(error instanceof Error && error.name !== 'TimeoutError' ? error.message : '尚未确认送达，可以重试，不会重复计数。'); }
    finally { setBusy(false); }
  }
  return <div><Button variant="outline" disabled={busy || received} onClick={() => void send()}>{busy ? '正在发送…' : received ? '已催更' : '想看后续 · 催更'}</Button>{message && <p role="status">{message}</p>}</div>;
}
