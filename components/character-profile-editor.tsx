'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  CHARACTER_PROFILE_LIMIT,
  CHARACTER_PROFILE_LEVELS,
  characterProfileFilled,
  type CharacterProfile,
} from '@/lib/character-profile';

export function CharacterProfileEditor({ value, onChange, idPrefix, title = '人格档案 · L1-L5', onSample, sampleLabel = '载入示例：林白语' }: {
  value: CharacterProfile;
  onChange: (value: CharacterProfile) => void;
  idPrefix: string;
  title?: string;
  onSample?: () => void;
  sampleLabel?: string;
}) {
  const [sampleConfirm, setSampleConfirm] = useState(false);
  const update = (key: keyof CharacterProfile, next: string) => onChange({ ...value, [key]: next });

  return <section className="character-profile-editor" aria-labelledby={`${idPrefix}-title`}>
    <div className="character-profile-heading">
      <div>
        <h3 id={`${idPrefix}-title`}>{title}</h3>
        <p>这五层是角色的隐藏设定，会作为对话模型的角色圣经；角色卡只展示名字、身份、外观和开场。所有内容都可以留空。</p>
      </div>
      <span className="character-profile-progress">{characterProfileFilled(value)}/5 层已填写</span>
    </div>
    <div className="character-profile-levels">
      {CHARACTER_PROFILE_LEVELS.map(level => {
        const content = value[level.key];
        return <details className="character-profile-level" key={level.key}>
          <summary>
            <span className="character-profile-level-tag">{level.level}</span>
            <strong>{level.title}</strong>
            <small>{level.summary}</small>
            {content.trim() ? <Check className="character-profile-check" aria-hidden="true" /> : null}
          </summary>
          <div className="character-profile-body">
            <p>{level.hint}</p>
            <Textarea id={`${idPrefix}-${level.key}`} value={content} maxLength={CHARACTER_PROFILE_LIMIT} rows={7} placeholder={level.placeholder} onChange={event => update(level.key, event.target.value)} />
            <div className="character-profile-meta"><span>{content.length} / {CHARACTER_PROFILE_LIMIT}</span><span>会注入角色对话提示词</span></div>
          </div>
        </details>;
      })}
    </div>
    {onSample ? <div className="character-profile-sample">
      <button type="button" className="studio-button" onClick={() => {
        if (!sampleConfirm) {
          setSampleConfirm(true);
          window.setTimeout(() => setSampleConfirm(current => current ? false : current), 4000);
          return;
        }
        setSampleConfirm(false);
        onSample();
      }}>{sampleConfirm ? '确认载入示例（覆盖当前档案）' : sampleLabel}</button>
      <small>会用林白语的 L1-L5 档案覆盖当前人格档案</small>
    </div> : null}
  </section>;
}
