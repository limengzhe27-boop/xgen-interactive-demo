'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

// Remount the whole workspace on identity changes, including outstanding requests.
export function AccountBoundary({ children }: { children: (scope: string) => ReactNode }) {
  const [scope, setScope] = useState('pending');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let live = true; let revision = 0; let announced = false;
    async function check(blocking = true) {
      const current = ++revision;
      setError(false);
      if (blocking) {
        setChecking(true);
        document.documentElement.dataset.accountLocked = 'true';
      }
      try {
        const response = await fetch('/api/account', { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error();
        const data = await response.json() as { user?: { id: string } | null };
        if (data.user && !/^[a-f0-9-]{36}$/i.test(data.user.id)) throw new Error('invalid_account');
        if (live && current === revision) {
          setScope(data.user?.id ?? 'guest'); setChecking(false);
          delete document.documentElement.dataset.accountLocked;
          if (!announced && new URLSearchParams(window.location.search).get('account') === 'signed-in') {
            announced = true;
            try { window.localStorage.setItem('xgen-account-change', String(Date.now())); } catch { /* Identity is still rechecked on focus. */ }
          }
        }
      } catch { if (live && current === revision) {
        setChecking(true); setError(true);
        document.documentElement.dataset.accountLocked = 'true';
      } }
    }
    const hide = () => { revision++; setChecking(true); document.documentElement.dataset.accountLocked = 'true'; };
    const visibility = () => { if (document.hidden) hide(); else void check(); };
    // Browser chrome / side panels take focus without hiding the document.
    // Revalidate quietly; actual hidden tabs and account-change events remain blocking.
    const focus = () => { if (!document.hidden) void check(false); };
    const changed = (event: StorageEvent) => { if (event.key === 'xgen-account-change') void check(); };
    const refresh = () => { void check(false); };
    void check();
    window.addEventListener('focus', focus);
    window.addEventListener('xgen-account-refresh', refresh);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('storage', changed);
    return () => { live = false; revision++; window.removeEventListener('focus', focus); window.removeEventListener('xgen-account-refresh', refresh); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('storage', changed); };
  }, []);
  function continueAsGuest() {
    // Never unlock the last signed-in workspace on an account-check failure.
    // Remount a separate guest scope only after the reader chooses it.
    setScope('guest'); setChecking(false); setError(false);
    delete document.documentElement.dataset.accountLocked;
  }
  return <>
    {checking && <output className="account-bar">{error ? '暂时无法确认账号，私人资料暂时隐藏。' : '正在确认你的个人空间…'}{error && <><Button onClick={() => window.location.reload()}>重新检查</Button><Button onClick={continueAsGuest}>继续游客体验</Button></>}</output>}
    {scope !== 'pending' && <div inert={checking} style={checking ? { visibility: 'hidden' } : undefined} key={scope}>{children(scope)}</div>}
  </>;
}
