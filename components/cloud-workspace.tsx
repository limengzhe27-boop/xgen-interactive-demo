'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Cloud, Download, Upload, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { exportCloudImageReferences } from '@/lib/image-cache';
import { readCloudSnapshot, readLocalWorkspace, workspaceKeys, type CloudRecord, type CloudSnapshot } from '@/lib/cloud-workspace';

const messages: Record<string, string> = { version_conflict: '另一台设备已更新云存档。本机内容没有被覆盖，请重新检查云端版本，再决定使用哪一份。', cloud_quota: 'Demo 云端容量已达保护上限，本机资料仍在。', snapshot_too_large: '当前存档超过 2 MB，暂不能上传；没有删减你的内容。', login_required: '请先登录后重试。', account_changed: '账号已变化，请刷新后重试。', cloud_unavailable: '云端暂不可用。本机资料仍在，请稍后重试。' };
export function CloudWorkspace({ accountScope, disabled }: { accountScope: string; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  if (accountScope === 'guest' || accountScope === 'pending') return null;
  return <><Button variant="outline" disabled={disabled} onClick={() => setOpen(true)}><Cloud />云端存档</Button>{open && <WorkspaceDialog accountScope={accountScope} onClose={() => setOpen(false)} />}</>;
}

function WorkspaceDialog({ accountScope, onClose }: { accountScope: string; onClose: () => void }) {
  const [cloud, setCloud] = useState<CloudRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [consent, setConsent] = useState(false);
  const [restoreConsent, setRestoreConsent] = useState(false);
  const pending = useRef<{ snapshot: CloudSnapshot; revision: number; requestId: string } | null>(null);
  const live = useRef(true);
  const headers = { 'Content-Type': 'application/json', 'x-xgen-account': accountScope };
  async function call(method = 'GET', body?: unknown) {
    const init: RequestInit = { method, headers, cache: 'no-store' };
    if (method !== 'GET' && body !== undefined) init.body = JSON.stringify(body);
    const r = await fetch('/api/workspace', init);
    const data = await r.json() as { error?: string; revision?: number; updatedAt?: string | null; snapshot?: unknown };
    if (!r.ok) throw new Error(messages[data.error ?? ''] || '云存档操作未完成，本机资料仍在。');
    if (!Number.isSafeInteger(data.revision) || data.revision! < 0 || (data.updatedAt != null && typeof data.updatedAt !== 'string')) throw new Error('云端返回了无效版本，未改动本机资料。');
    return { revision: data.revision!, updatedAt: data.updatedAt ?? null, snapshot: data.snapshot ? readCloudSnapshot(data.snapshot) : null } satisfies CloudRecord;
  }
  async function check() {
    setBusy(true); setError(''); setConsent(false); setRestoreConsent(false);
    try { const data = await call(); if (data.snapshot) data.snapshot = readCloudSnapshot(data.snapshot); if (live.current) { setCloud(data); pending.current = null; } }
    catch (e) { if (live.current) { setCloud(null); setError(e instanceof Error ? e.message : '检查失败'); } }
    finally { if (live.current) setBusy(false); }
  }
  const loadCloud = useEffectEvent(() => { void check(); });
  useEffect(() => {
    live.current = true;
    const timer = window.setTimeout(loadCloud, 0);
    return () => { live.current = false; window.clearTimeout(timer); };
  }, []);
  async function upload() {
    if (!cloud || !consent || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (!pending.current) pending.current = { snapshot: readLocalWorkspace(localStorage, accountScope, await exportCloudImageReferences(accountScope)), revision: cloud.revision, requestId: crypto.randomUUID() };
      const sent = pending.current;
      const data = await call('PUT', { ...sent, consent: 'save-private-workspace-v1' });
      if (live.current) { setCloud({ ...data, snapshot: sent.snapshot }); pending.current = null; setConsent(false); setNotice('已保存到你的私人云存档。其他用户无法通过应用读取，作品没有公开发布。'); }
    } catch (e) { if (live.current) setError(e instanceof Error ? e.message : '上传未完成'); }
    finally { if (live.current) setBusy(false); }
  }
  async function restore() {
    if (!cloud?.snapshot || !restoreConsent || busy) return;
    setBusy(true); setError('');
    try {
      // Recheck account/session before any local restore, even after a long-open dialog.
      const fresh = await call();
      if (fresh.revision !== cloud.revision) throw new Error(messages.version_conflict);
      if (!live.current || document.documentElement.dataset.accountLocked === 'true') throw new Error('账号正在变化，请刷新后操作。');
      localStorage.setItem(workspaceKeys(accountScope).pending, JSON.stringify(readCloudSnapshot(cloud.snapshot)));
      window.location.reload();
    } catch (e) { if (live.current) { setBusy(false); setError(e instanceof Error ? e.message : '恢复未完成'); } }
  }
  function backup() {
    try {
      const raw = localStorage.getItem(workspaceKeys(accountScope).backup);
      if (!raw) { setNotice('还没有恢复前备份；恢复云存档时会先自动建立。'); return; }
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'xgen-恢复前本机备份.json'; a.click(); URL.revokeObjectURL(url);
    } catch { setError('无法读取恢复前备份。'); }
  }
  async function remove() {
    if (!cloud || !restoreConsent || busy) return;
    setBusy(true); setError('');
    try { const data = await call('DELETE', { consent: 'delete-private-workspace-v1', revision: cloud.revision, requestId: crypto.randomUUID() }); if (live.current) { setCloud({ ...data, snapshot: null }); setRestoreConsent(false); setNotice('云端快照已删除。本机资料和图片文件保留；托管方备份按其保留政策处理。'); } }
    catch (e) { if (live.current) setError(e instanceof Error ? e.message : '删除未完成'); }
    finally { if (live.current) setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="companion-handoff cloud-workspace" showCloseButton={!busy}>
    <DialogTitle>你的私人云端存档</DialogTitle><DialogDescription>手动存档，不自动上传；不是公开发布，也不是端到端加密。只操作当前登录账号，游客旧记录不会混入。</DialogDescription>
    <output>{busy ? '正在处理…' : cloud ? cloud.snapshot ? `云端版本 ${cloud.revision} · ${new Date(cloud.updatedAt!).toLocaleString()}` : '尚无云端快照' : '云端状态未知'}</output>
    {error && <p role="alert" className="personal-error">{error}</p>}{notice && <output>{notice}</output>}
    <Button variant="outline" disabled={busy} onClick={check}><RefreshCw />重新检查云端</Button>
    <section><h3>把本机这一份存到云端</h3><p>包含记忆、最近私聊、虚构身份、创作讨论、作品和探索/角色会面记录。保存的是完整快照，不自动合并不同设备的修改。</p><label className="companion-check"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} /><span>同意将上述私人资料存入本项目的 Supabase 云数据库，并用本机快照更新当前云端版本。</span></label><Button className="studio-button studio-solid" disabled={!cloud || !consent || busy} onClick={upload}><Upload />保存本机到云端</Button></section>
    <section><h3>在这台设备继续</h3><p>使用云端快照替换本机工作空间，恢复前会保留一份本机备份。也可只删除云端快照，不删除本机资料。</p><label className="companion-check"><input type="checkbox" checked={restoreConsent} disabled={busy} onChange={e => setRestoreConsent(e.target.checked)} /><span>我已确认版本，并理解所点击的恢复或删除操作。</span></label><div className="cloud-actions"><Button variant="outline" disabled={!cloud?.snapshot || !restoreConsent || busy} onClick={restore}><Download />恢复云端到本机</Button><Button variant="outline" disabled={!cloud?.snapshot || !restoreConsent || busy} onClick={remove}>删除云端快照</Button></div><button className="studio-text-button" type="button" disabled={busy} onClick={backup}>下载恢复前本机备份</button></section>
    <small>每账号一个最新快照，上限 2 MB。仅同步云图片引用；旧版仅本机图片不跨设备复制，不触发生图。免费服务可能暂停，重要作品请另留备份。</small>
  </DialogContent></Dialog>;
}
