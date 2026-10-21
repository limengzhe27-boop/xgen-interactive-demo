'use client';

import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { StandaloneCharacterInput } from '@/lib/standalone-character';
import styles from './character-creator.module.css';

const EMPTY: StandaloneCharacterInput = {
  name: '',
  identity: '',
  personality: '',
  appearance: '',
  opening: '',
  sceneName: '',
};

export function CharacterCreator({ open, onOpenChange, onCreate, disabled = false }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (character: StandaloneCharacterInput) => void;
  disabled?: boolean;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent style={{ maxWidth: 560 }}>
      <DialogHeader>
        <DialogTitle>新建角色</DialogTitle>
        <DialogDescription>创建一个可以独立对话的角色，不依附于任何世界。保存后会出现在「角色库」，角色只保存在当前浏览器。</DialogDescription>
      </DialogHeader>
      {open && <CharacterCreatorForm onCreate={onCreate} onCancel={() => onOpenChange(false)} disabled={disabled} />}
    </DialogContent>
  </Dialog>;
}

// Mounted only while the dialog is open, so every visit starts from a clean draft.
function CharacterCreatorForm({ onCreate, onCancel, disabled }: {
  onCreate: (character: StandaloneCharacterInput) => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<StandaloneCharacterInput>(EMPTY);
  const update = (key: keyof StandaloneCharacterInput, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const canCreate = Boolean(draft.name.trim()) && !disabled;

  return <form className={styles.form} onSubmit={event => { event.preventDefault(); if (!canCreate) return; onCreate({ ...draft, name: draft.name.trim() }); }}>
    <label className={styles.field} htmlFor="character-name">
      <span className={styles.label}>名字 <em>必填</em></span>
      <Input id="character-name" value={draft.name} maxLength={24} placeholder="例如：沈砚" onChange={event => update('name', event.target.value)} />
    </label>
    <label className={styles.field} htmlFor="character-identity">
      <span className={styles.label}>身份 / 一句话设定</span>
      <Input id="character-identity" value={draft.identity} maxLength={120} placeholder="例如：嘴硬心软的成年游侠，靠替人找东西过活" onChange={event => update('identity', event.target.value)} />
    </label>
    <div className={styles.pair}>
      <label className={styles.field} htmlFor="character-personality">
        <span className={styles.label}>性格</span>
        <Textarea id="character-personality" value={draft.personality} maxLength={300} rows={3} placeholder="说话方式、在意什么、遇到冲突时的反应" onChange={event => update('personality', event.target.value)} />
      </label>
      <label className={styles.field} htmlFor="character-appearance">
        <span className={styles.label}>外观</span>
        <Textarea id="character-appearance" value={draft.appearance} maxLength={300} rows={3} placeholder="年龄、衣着、标志性特征" onChange={event => update('appearance', event.target.value)} />
      </label>
    </div>
    <label className={styles.field} htmlFor="character-scene">
      <span className={styles.label}>你们在哪里见面</span>
      <Input id="character-scene" value={draft.sceneName} maxLength={60} placeholder="例如：雨夜的旧书铺" onChange={event => update('sceneName', event.target.value)} />
    </label>
    <label className={styles.field} htmlFor="character-opening">
      <span className={styles.label}>开场白</span>
      <Textarea id="character-opening" value={draft.opening} maxLength={600} rows={3} placeholder="角色看到你时说的第一句话，也是这段对话的起点" onChange={event => update('opening', event.target.value)} />
    </label>
    <DialogFooter className={styles.actions}>
      <button type="button" className="studio-button" onClick={onCancel}>取消</button>
      <button type="submit" className="studio-button studio-solid" disabled={!canCreate}><UserRound />创建角色</button>
    </DialogFooter>
  </form>;
}
