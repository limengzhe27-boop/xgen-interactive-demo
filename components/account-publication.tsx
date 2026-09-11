'use client';
/* eslint-disable next/no-html-link-for-pages -- OAuth route must use a full navigation, never client prefetch. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { preparePublicationImages } from '@/lib/publication-images';
import { reusePublicationArt } from '@/lib/reuse-publication-art';
import { LogIn, LogOut, Upload, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { StudioWorld } from '@/lib/studio-worlds';

type Account = { configured: boolean; canPublish?: boolean; provider?: string; user: { id: string; name: string } | null };
export function AccountBar({ workspaceControls, onProfile }: { workspaceControls?: ReactNode; onProfile?: () => void }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void fetch('/api/account', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json() as Account;
      if (live) {
        setAccount(data);
        if (new URLSearchParams(window.location.search).get('account') === 'error') setError('登录未完成，请重试。草稿仍保留在本机。');
      }
    }).catch(() => { if (live) setError('账号服务暂不可用，仍可继续游客体验。'); });
    return () => { live = false; };
  }, []);
  async function signOut() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/account', { method: 'DELETE' });
      if (!response.ok) throw new Error();
      window.localStorage.setItem('xgen-account-change', String(Date.now()));
      window.location.assign('/');
    } catch { setError('退出未完成，请重试。'); } finally { setBusy(false); }
  }
  return <aside className="account-bar" aria-label="账号">
    <span>{account?.user ? `${account.user.name} · 本机优先，云存档需手动保存` : '游客体验 · 草稿与聊天仅在本机'}</span>
    {onProfile && <Button variant="outline" onClick={onProfile}>我的形象与资料</Button>}
    {account?.user && workspaceControls}
    {account?.user ? <Button variant="outline" disabled={busy} onClick={signOut}><LogOut />退出账号</Button>
      : account?.configured ? <a className="studio-button" href="/auth/login"><LogIn />使用 {account.provider === 'google' ? 'Google' : 'GitHub'} 登录</a>
        : <span className="account-hint">{account ? '账号登录尚未开放' : '正在检查账号'}</span>}
    {error && <p role="alert">{error}</p>}
  </aside>;
}

export function PublishWorldDialog({ entry, accountScope, onClose, onPublished, onImagesPrepared }: { entry: StudioWorld; accountScope: string; onClose: () => void; onPublished: (entry: StudioWorld) => void; onImagesPrepared: (entry: StudioWorld) => void }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [consent, setConsent] = useState(false);
  const prepared = useRef(entry);
  const alive = useRef(true);
  useEffect(() => { alive.current=true; return () => { alive.current=false; }; }, []);
  const [progress,setProgress]=useState('');
  const [versionReady, setVersionReady] = useState(false);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    void fetch('/api/account', { cache: 'no-store' }).then(async r => {
      if (!r.ok) throw new Error(); const data = await r.json() as Account;
      if (live) setAccount(data);
      if (data.user) {
        const response = await fetch('/api/worlds?mine=true', { cache: 'no-store', headers: { 'x-xgen-account': accountScope } });
        if (!response.ok) throw new Error();
        const result = await response.json() as { publications: { document: StudioWorld & { sourceId?: string }; updated_at: string }[] };
        const current = result.publications.find(row => row.document.sourceId === entry.id || row.document.id === entry.id);
        if (live) {
          if(current) {
            prepared.current=reusePublicationArt(prepared.current,current.document);
            onImagesPrepared(prepared.current);
          }
          setExpectedUpdatedAt(current?.updated_at ?? null); setVersionReady(true);
        }
      }
    }).catch(() => { if (live) setError('暂时无法检查账号，请稍后重试。'); });
    return () => { live = false; };
  }, [accountScope, entry.id]);
  async function publish() {
    if (!consent || !account?.user || !account.canPublish || !versionReady || busy) return;
    setBusy(true); setError('');
    try {
      const ready=await preparePublicationImages(prepared.current,accountScope,(next,label)=>{
        if(!alive.current)throw Error('页面已离开，本次发布已停止。');
        prepared.current=next;onImagesPrepared(next);setProgress(label);
      });
      if(!alive.current)return;
      setProgress('正在发布');
      const response = await fetch('/api/worlds', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-xgen-account': accountScope }, body: JSON.stringify({
        consent: 'publish-world-and-selected-images-v1', sourceId: entry.id, world: entry.world, expectedUpdatedAt,
        cover: ready.cover, portraits: ready.portraits,
      }) });
      const data = await response.json() as { world?: StudioWorld; message?: string };
      if (!response.ok || !data.world) throw new Error(data.message || '发布未完成，请确认登录状态后重试。');
      if(alive.current)onPublished(data.world);
    } catch (e) { setError(e instanceof Error ? e.message : '发布未完成。原草稿仍在本机。'); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="publication-dialog" showCloseButton={!busy}>
    <DialogTitle>公开发布《{entry.title}》</DialogTitle>
    <DialogDescription>发布后，其他访客可以看到这个世界，并选择角色探索或对话。</DialogDescription>
    <div className="publication-scope"><strong>将公开</strong><p>剧情、全部虚构角色设定、关系、规则、任务与结局框架。完整剧本中可能包含角色秘密。</p><strong>不会上传</strong><p>个人 Agent 的记忆与对话、创作讨论记录、私人游玩记录。</p></div>
    <p>封面与角色图会一起公开。缺少的图片会自动生成并使用生图额度，已有图片复用；失败时保留已生成图片，重试不会重做成功项。</p>
    <label className="publication-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy} />我确认这些内容可以公开，且不包含未经许可的真实个人信息或公司资料。</label>
    {!account?.user && <p>{account?.configured ? '先登录账号，才能以自己的身份发布。登录不会自动上传本机资料。' : '账号登录正在配置中，现在仍可保存并试玩；暂不能公开发布。'}</p>}
    {account?.user && !account.canPublish && <p>账号已登录；公开发布仍在验收中，现在可以保存并试玩。</p>}
    {error && <p className="publication-error" role="alert">{error}</p>}
    <div className="publication-actions"><Button variant="outline" disabled={busy} onClick={onClose}>返回创作</Button>
      {!account?.user && account?.configured ? <a className="studio-button" href="/auth/login"><LogIn />登录账号</a> : <Button className="primary-action" disabled={!consent || !account?.user || !account.canPublish || !versionReady || busy} onClick={publish}>{busy ? <LoaderCircle className="is-spinning" /> : <Upload />}{busy ? progress || '准备发布' : expectedUpdatedAt ? '更新发布' : '发布'}</Button>}
    </div>
  </DialogContent></Dialog>;
}
