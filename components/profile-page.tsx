'use client';
import type { ReactNode } from 'react';
import { ArrowLeft, MessageCircleMore, Check, X } from 'lucide-react';
import type { PlayerPersona } from '@/lib/player-persona';

export function ProfilePage({ persona, identityControl, memories, pending, busy, onBack, onChat, onRemove, onConfirm, onDismiss }: {
  persona: PlayerPersona | null; identityControl: ReactNode; memories: string[]; pending: string[]; busy: boolean;
  onBack: () => void; onChat: () => void; onRemove: (memory: string) => void; onConfirm: (memory: string) => void; onDismiss: (memory: string) => void;
}) {
  return <div className="flow-page profile-page">
    <header className="flow-toolbar"><button type="button" className="flow-control" onClick={onBack}><ArrowLeft />首页</button><h1>我的</h1><button type="button" className="flow-control" onClick={onChat}><MessageCircleMore />找 Agent 聊聊</button></header>
    <section className="profile-section" aria-labelledby="profile-avatar-title"><h2 id="profile-avatar-title">故事里的我</h2>{identityControl}
      {persona ? <dl className="profile-persona"><div><dt>身份背景</dt><dd>{persona.identity || '还没设定，编辑形象时可以补充。'}</dd></div><div><dt>人设性格</dt><dd>{persona.personality || '还没设定，和 Agent 一起想一想。'}</dd></div><div><dt>外观</dt><dd>{persona.appearance || '未设定'}</dd></div><div><dt>愿望能力</dt><dd>{persona.abilities || '未设定'}</dd></div></dl> : <p>给自己一个名字、一种性格和一个形象，在允许自带身份的世界中使用。</p>}
      <p className="profile-note">这是你创作的虚构身份，不代表现实中的你。进入世界时仍需遵守创作者的角色与能力规则。</p>
    </section>
    <section className="profile-section" aria-labelledby="profile-memory-title"><h2 id="profile-memory-title">Agent 了解的我</h2><p>你确认过的性格、偏好与近况。不是测评结果，也不是 AI 替你下的定义。</p>
      {memories.length ? <ul className="profile-memories">{memories.map(memory => <li key={memory}><span>{memory}</span><button type="button" className="flow-control" disabled={busy} onClick={() => onRemove(memory)} aria-label={'删除记忆：' + memory}><X /></button></li>)}</ul> : <p className="profile-note">还没有确认的了解。和 Agent 聊聊自己，它会先询问，再记住。</p>}
      {pending.length > 0 && <div className="profile-pending"><h3>这些了解，准确吗？</h3>{pending.map(memory => <article key={memory}><p>{memory}</p><div><button type="button" className="flow-control" disabled={busy} onClick={() => onConfirm(memory)}><Check />确认记住</button><button type="button" className="flow-control" disabled={busy} onClick={() => onDismiss(memory)}>不保存</button></div></article>)}</div>}
    </section>
    <details className="flow-disclosure"><summary>这些资料如何保存和使用？</summary><p>资料按当前账号隔离，默认保存在此浏览器。登录后可在上方云端存档中手动保存或恢复，不会自动同步或公开。</p><p>已确认记忆会用于个人 Agent 的回复。创作时是否带入由你选择；虚构身份只在你确认使用时用于世界演绎。删除记忆后，旧聊天文本仍保留；云端旧快照也需重新保存才能更新。</p></details>
  </div>;
}
