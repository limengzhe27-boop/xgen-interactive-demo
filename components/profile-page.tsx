'use client';
import { useState, type ReactNode } from 'react';
import { ArrowLeft, MessageCircleMore } from 'lucide-react';
import type { PlayerPersona } from '@/lib/player-persona';
import type { UserProfile } from '@/lib/user-profile';
import type { MemoryDetail, MemoryDetails } from '@/lib/memory-history';

export function ProfilePage({ persona, identityControl, profile, onProfile, memories, memoryDetails = {}, pending, busy, onBack, onChat, onRemove, onEdit, onConfirm, onDismiss }: {
  persona: PlayerPersona | null; identityControl: ReactNode; profile: UserProfile; onProfile: (value: UserProfile) => void;
  memories: string[]; memoryDetails?: MemoryDetails; pending: string[]; busy: boolean;
  onBack: () => void; onChat: () => void; onRemove: (memory: string) => void; onEdit: (old: string, value: string) => boolean | void;
  onConfirm: (memory: string) => void; onDismiss: (memory: string) => void;
}) {
  const [section, setSection] = useState<'profile' | 'persona'>('profile');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [notice, setNotice] = useState('');
  const fields = { introduction: '自我介绍', preferences: '我的偏好', communication: '希望 Agent 怎样和我交流' } as const;
  return <div className="flow-page profile-page">
    <header className="flow-toolbar"><button type="button" className="flow-control" onClick={onBack}><ArrowLeft />首页</button><h1>我的</h1><button type="button" className="flow-control" onClick={onChat}><MessageCircleMore />找 Agent 聊聊</button></header>
    <nav className="profile-switch" aria-label="个人空间"><button className="flow-control" aria-current={section === 'profile' ? 'page' : undefined} disabled={editing} onClick={() => setSection('profile')}>我的资料</button><button className="flow-control" aria-current={section === 'persona' ? 'page' : undefined} disabled={editing} onClick={() => setSection('persona')}>虚拟形象</button></nav>
    {section === 'profile' ? <>
      <section className="profile-section"><div className="profile-heading"><h2>关于真实的我</h2>{!editing && <button className="flow-control" disabled={busy} onClick={() => { setDraft(profile); setEditing(true); setNotice(''); }}>编辑资料</button>}</div>
      {editing ? <form className="profile-edit" onSubmit={e => { e.preventDefault(); onProfile(draft); setEditing(false); setNotice('已更新资料；如需跨设备使用，请手动保存云端存档。'); }}>
        {Object.entries(fields).map(([key, label]) => <label key={key}>{label}<textarea maxLength={600} value={draft[key as keyof UserProfile]} onChange={e => setDraft(current => ({ ...current, [key]: e.target.value }))} /></label>)}
        <p className="profile-note">这些资料用于个人 Agent 的交流，不会自动带入虚拟角色或公开。</p><div><button className="flow-control" type="submit" disabled={busy}>保存资料</button><button className="flow-control" type="button" onClick={() => setEditing(false)}>取消</button></div>
      </form> : <dl className="profile-persona">{Object.entries(fields).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{profile[key as keyof UserProfile] || '尚未填写'}</dd></div>)}</dl>}
      {notice && <output>{notice}</output>}</section>
      <section className="profile-section"><h2>聊天记忆</h2><p className="profile-note">与你手动填写的资料分开管理。历史条目未记录来源，不推断它们由谁填写。</p>
        <ul className="profile-memories">{memories.map(memory => <MemoryRow key={memory} memory={memory} detail={memoryDetails[memory]} busy={busy} onEdit={value => onEdit(memory, value)} onRemove={() => onRemove(memory)} />)}</ul>
        {!memories.length && <p className="profile-note">还没有记忆；你可以先填写资料，也可以和 Agent 聊聊。</p>}
        {!!pending.length && <details className="profile-pending"><summary>待你确认的了解 · {pending.length} 条</summary>{pending.map(memory => <article key={memory}><p>{memory}</p><button className="flow-control" disabled={busy} onClick={() => onConfirm(memory)}>确认记住</button><button className="flow-control" disabled={busy} onClick={() => onDismiss(memory)}>不保存</button></article>)}</details>}
      </section>
    </> : <section className="profile-section"><h2>用于世界探索的角色</h2>{identityControl}<p className="profile-note">这是虚构角色，不是你的个人资料。进入世界时仍遵守该世界的能力规则。</p>{persona && <dl className="profile-persona"><div><dt>角色身份</dt><dd>{persona.identity}</dd></div><div><dt>角色性格</dt><dd>{persona.personality}</dd></div></dl>}</section>}
  </div>;
}

function MemoryRow({ memory, detail, busy, onEdit, onRemove }: { memory: string; detail?: MemoryDetail; busy: boolean; onEdit: (value: string) => boolean | void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(memory);
  const [error, setError] = useState('');
  return <li>{editing ? <form className="profile-edit" onSubmit={e => { e.preventDefault(); if (busy || !value.trim()) return; if (onEdit(value.trim()) === false) setError('已有相同记忆，请修改内容或取消。'); else setEditing(false); }}><label>修改这条记忆<textarea value={value} maxLength={300} onChange={e => setValue(e.target.value)} /></label>{error && <p role="alert">{error}</p>}<div><button className="flow-control" disabled={busy || !value.trim()}>保存修改</button><button className="flow-control" type="button" onClick={() => setEditing(false)}>取消</button><button className="flow-control" type="button" disabled={busy} onClick={() => { if (window.confirm('删除这条记忆及其本机修改记录？旧聊天和云快照不会一起删除。')) onRemove(); }}>删除</button></div></form> : <><div className="memory-copy"><span>{memory}</span></div><button className="flow-control" disabled={busy} onClick={() => { setValue(memory); setError(''); setEditing(true); }}>编辑</button></>}</li>;
}
