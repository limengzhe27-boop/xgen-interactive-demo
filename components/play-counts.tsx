'use client';
import { useEffect, useState } from 'react';

// Only remember successful receipts. Database uniqueness remains authoritative
// across tabs, devices and refreshes. Never persist private account identifiers.
const recorded = new Set<string>();
export function useRecordPlay(target: string | null, accountScope: string | null) {
  useEffect(() => {
    if (!target || !accountScope || !/^[a-f0-9-]{36}$/i.test(accountScope)) return;
    const key = `${accountScope}:${target}`;
    if (recorded.has(key)) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const send = async (retry: boolean) => {
      try {
        const response = await fetch('/api/play-counts', { method: 'POST', headers: {
          'Content-Type': 'application/json', 'x-xgen-account': accountScope,
        }, body: JSON.stringify({ target }), signal: controller.signal });
        if (response.ok) recorded.add(key);
        else if (response.status >= 500) throw new Error('retry');
      } catch {
        if (retry && !controller.signal.aborted) timer = setTimeout(() => void send(false), 3000);
      }
    };
    void send(true);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [target, accountScope]);
}
export function RecordPlay({ target, accountScope }: { target: string; accountScope: string }) {
  useRecordPlay(target, accountScope);
  return null;
}
export function usePlayCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/play-counts', { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (response.ok) { const data = await response.json() as { counts?: Record<string, number> }; setCounts(data.counts ?? {}); } })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return counts;
}
