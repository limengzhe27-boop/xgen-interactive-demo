"use client";

/* eslint-disable @next/next/no-img-element -- Existing local and authenticated asset URLs must retain their original dimensions and browser cookies. */

import { useRef, useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { characterHook } from '@/lib/character-card';
import { publicRoleIntroduction } from '@/lib/public-introduction';
import styles from './world-intro-page.module.css';

export type WorldIntroCharacter = {
  id: string; name: string; identity: string; cardHook?: string;
  publicIntroduction?: string; publicBackground?: string;
  playable?: boolean; isDefault?: boolean; image?: string;
};
export type WorldIntroSavedRun = {
  id: string; roleName: string; roleId: string; turn: number;
  location: string; savedAt: number; status: 'playing' | 'ending';
};
export type WorldIntroData = {
  id: string; title: string; genre?: string; premise: string; storyHook?: string;
  openingScene?: { location?: string; scene?: string }; cover?: string;
  fixedRoleId?: string; characters: WorldIntroCharacter[];
  existingRun?: WorldIntroSavedRun | null;
};

// Only explicitly public fields belong on the introduction page.
function publicDescription(role: WorldIntroCharacter) {
  return publicRoleIntroduction(role.publicIntroduction, role.publicBackground?.trim() || characterHook(role.cardHook) || '');
}

export function WorldIntroPage({ data, onBack, onResumeRun, onStartWorld }: {
  data: WorldIntroData; onBack: () => void;
  onResumeRun: (runId: string) => void; onStartWorld: (roleId: string) => void;
}) {
  const restartDialog = useRef<HTMLDialogElement>(null);
  const [restartRole, setRestartRole] = useState<WorldIntroCharacter | null>(null);
  const [failedCover, setFailedCover] = useState<string>();
  const title = data.title.trim() || '未命名世界';
  const playableRoles = data.characters.filter(role => role.playable !== false && (!data.fixedRoleId || role.id === data.fixedRoleId));
  const otherRoles = data.characters.filter(role => !playableRoles.some(playable => playable.id === role.id));
  const cover = data.cover && failedCover !== data.cover ? data.cover : undefined;
  const premise = data.premise.trim();
  const genre = data.genre?.trim();
  const [expandedRoles, setExpandedRoles] = useState<string[]>([]);

  function start(role: WorldIntroCharacter) {
    if (data.existingRun) {
      setRestartRole(role);
      restartDialog.current?.showModal();
    } else onStartWorld(role.id);
  }
  function roleCard(role: WorldIntroCharacter, playable: boolean) {
    const description = publicDescription(role) || role.identity;
    const expanded = expandedRoles.includes(role.id);
    return <article key={role.id} className={styles.role} data-playable={playable}>
      {role.image && <img className={styles.rolePortrait} src={role.image} alt={role.name} loading="lazy" />}
      <div className={styles.roleCopy}>
        <h3>{role.name}</h3>
        {description && <p className={`${styles.roleDescription} ${!expanded && description.length > 100 ? styles.collapsed : ''}`}>{description}</p>}
        {description.length > 100 && <button type="button" className={styles.more} aria-expanded={expanded} onClick={() => setExpandedRoles(ids => expanded ? ids.filter(id => id !== role.id) : [...ids, role.id])}>{expanded ? '收起介绍' : '展开介绍'}</button>}
        {playable && <button type="button" className={styles.primary} onClick={() => start(role)}><Play size={15} aria-hidden="true" />{data.existingRun ? `以${role.name}重新开始` : `扮演${role.name}`}</button>}
      </div>
    </article>;
  }

  return <div className={styles.page}>
    <header className={styles.toolbar}>
      <button type="button" className={styles.back} onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />返回首页</button>
      <span className={styles.muted}>世界介绍</span>
    </header>
    <section className={`${styles.hero} ${!cover ? styles.withoutCover : ''}`} aria-labelledby="world-intro-title">
      {cover && <div className={styles.coverFrame}>
        <img className={styles.cover} src={cover} alt={`${title}封面`} onError={() => setFailedCover(cover)} />
      </div>}
      <div className={styles.summary}>
        {genre && genre !== '社区创作' && <span className={styles.genre}>{genre}</span>}
        <h1 id="world-intro-title">{title}</h1>
        <p className={styles.description}>{premise || '作者尚未填写公开简介。'}</p>
        <p className={styles.saved}>选择一个角色，从他的处境开始。</p>
        <div className={styles.actions}>
          {data.existingRun && <button type="button" className={styles.primary} onClick={() => onResumeRun(data.existingRun!.id)}><Play size={17} aria-hidden="true" />继续上次体验</button>}
          {!playableRoles.length && <p className={styles.muted}>暂未开放体验视角</p>}
        </div>
        {data.existingRun && <p className={styles.saved}>上次：{data.existingRun.roleName} · 第 {data.existingRun.turn} 轮 · {data.existingRun.location}</p>}
        {data.existingRun?.savedAt && Number.isFinite(data.existingRun.savedAt) ? <p className={styles.saved}>保存于 {new Date(data.existingRun.savedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p> : null}
      </div>
    </section>
    {playableRoles.length > 0 && <section className={styles.section} aria-labelledby="playable-roles-title">
      <h2 id="playable-roles-title">{playableRoles.length === 1 ? '你将扮演' : '选择你的角色'}</h2>
      <div className={styles.roles}>{playableRoles.map(role => roleCard(role, true))}</div>
    </section>}
    {otherRoles.length > 0 && <section className={styles.section} aria-labelledby="other-roles-title">
      <h2 id="other-roles-title">你会遇见的人物</h2><div className={styles.roles}>{otherRoles.map(role => roleCard(role, false))}</div>
    </section>}
    <dialog ref={restartDialog} className={styles.dialog} aria-labelledby="restart-title">
      <h2 id="restart-title">以{restartRole?.name}重新开始？</h2>
      <p>将从该角色的开场进入，而不是继续当前进度。已有图文记录仍可在探索记录中查看。</p>
      <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => restartDialog.current?.close()}>取消</button><button type="button" className={styles.primary} onClick={() => { restartDialog.current?.close(); if (restartRole) onStartWorld(restartRole.id); }}>确认重新开始</button></div>
    </dialog>
  </div>;
}
