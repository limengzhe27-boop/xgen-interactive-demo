'use client';
/* oxlint-disable next/no-img-element -- local portrait preview; never a remote image */

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, ImagePlus, LoaderCircle, Play, Plus, Save, Sparkles, Trash2, Undo2, Upload, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CharacterAgent } from '@/components/character-agent';
import { CharacterProfileEditor } from '@/components/character-profile-editor';
import { CreateModeSwitch, type CreateMode } from '@/components/create-mode-switch';
import { readPersonaUpload } from '@/lib/persona-upload';
import { generateSceneImage } from '@/lib/remote-image-service';
import { standalonePortrait, type StandaloneCharacterInput } from '@/lib/standalone-character';
import { LIN_BAIYU_SAMPLE } from '@/lib/sample-character';
import type { CharacterDesignDraft } from '@/lib/character-design';

function buildPortraitPrompt(value: StandaloneCharacterInput): string {
  const profile = value.profile;
  const appearance = value.appearance.trim() || profile.lifeContext.slice(0, 900);
  const traits = [value.personality, profile.traits].filter(Boolean).join('\n').slice(0, 900);
  const life = profile.lifeContext.slice(0, 900);
  return [
    '虚构角色的角色卡立绘，竖版，单人，半身到七分身，干净简洁的背景，电影感柔光，写实插画质感，东方审美。',
    '画面中不要出现文字、水印、logo、边框、UI、多人或画中画；不要生成真实明星或公众人物。',
    `角色名：${value.name.trim() || '未命名角色'}`,
    value.identity.trim() ? `身份：${value.identity.trim()}` : '',
    appearance.trim() ? `固定外观：${appearance}` : '',
    traits.trim() ? `性格与气质：${traits}` : '',
    life.trim() ? `人生背景与时代感：${life}` : '',
    '要求：年龄、发型、服装、体态与设定保持一致；表情克制自然；构图适合作为角色对话头像和角色卡。',
  ].filter(Boolean).join('\n').slice(0, 4000);
}


export function CreateCharacter({ value, onChange, onSave, onPublish, onUnpublish, onPreview, onNew, published, onBack, onModeChange, storageNotice, canSave, sourceId, accountScope, savedLocally }: {
  value: StandaloneCharacterInput;
  onChange: Dispatch<SetStateAction<StandaloneCharacterInput>>;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onPreview: () => void;
  onNew: () => void;
  published: boolean;
  onBack: () => void;
  onModeChange: (mode: CreateMode) => void;
  storageNotice?: string;
  canSave: boolean;
  savedLocally: boolean;
  sourceId: string;
  accountScope: string;
}) {
  const [mobilePane, setMobilePane] = useState<'guide' | 'form'>('form');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [portraitNotice, setPortraitNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const portraitController = useRef<AbortController | null>(null);
  useEffect(() => () => { portraitController.current?.abort(); }, []);
  const update = (key: keyof StandaloneCharacterInput, next: string) => onChange({ ...value, [key]: next });
  const save = () => { if (canSave) onSave(); };
  const upload = async (file?: File) => {
    if (!file || uploading) return;
    setUploading(true); setUploadError('');
    try { onChange({ ...value, portrait: await readPersonaUpload(file) }); }
    catch (error) { setUploadError(error instanceof Error ? error.message : '图片处理失败，请重试。'); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ''; }
  };
  const generatePortrait = async () => {
    if (generating || uploading) return;
    if (accountScope === 'guest' || accountScope === 'pending') { setPortraitNotice('登录后才能使用 AI 生成形象。'); return; }
    portraitController.current?.abort();
    const controller = new AbortController();
    portraitController.current = controller;
    setGenerating(true); setUploadError(''); setPortraitNotice('正在根据人格档案生成形象，通常需要几十秒…');
    try {
      const result = await generateSceneImage({
        purpose: 'portrait',
        requestId: Date.now(),
        sceneId: `character-${sourceId || 'draft'}`,
        seed: Math.floor(Math.random() * 1_000_000_000),
        prompt: buildPortraitPrompt(value),
      }, controller.signal, accountScope);
      if (controller.signal.aborted) return;
      const response = await fetch(result.assetUrl, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('生成结果读取失败，请重试。');
      const blob = await response.blob();
      const portrait = await readPersonaUpload(new File([blob], 'character-portrait.webp', { type: blob.type || 'image/webp' }));
      if (controller.signal.aborted) return;
      onChange(current => ({ ...current, portrait }));
      setPortraitNotice('形象已生成，可继续重新生成或上传替换。');
    } catch (error) {
      if (!controller.signal.aborted) setPortraitNotice(error instanceof Error ? error.message : '形象生成失败，请稍后重试。');
    } finally {
      if (portraitController.current === controller) portraitController.current = null;
      if (!controller.signal.aborted) setGenerating(false);
    }
  };

  return <div className="flow-page creation-flow character-creation-flow">
    <header className="flow-toolbar">
      <button className="flow-control" type="button" onClick={onBack}><ArrowLeft />返回</button>
      <h1>{value.name ? `创作角色 · ${value.name}` : '新建角色'}</h1>
      <div className="workspace-actions">
        <small className="workspace-save-badge" role={storageNotice ? 'alert' : undefined}>{storageNotice || (published ? '已发布 · 修改后点更新发布' : savedLocally ? '已保存到本机 · 可预演或发布' : canSave ? '角色保存在当前浏览器' : '本机存档尚未就绪')}</small>
        <Button onClick={save} disabled={!canSave}><Save />保存角色</Button>
        {published && <Button variant="outline" onClick={onUnpublish}><Undo2 />撤下</Button>}
        <Button className="primary-action" onClick={onPublish} disabled={!canSave || !value.portrait} title={!value.portrait ? '发布前请先上传或生成角色形象' : undefined}><Upload />{published ? '更新发布' : '发布角色'}</Button>
      </div>
    </header>
    <div className="creation-mode-bar"><CreateModeSwitch mode="character" onChange={onModeChange} /><div className="creation-mode-actions"><button type="button" className="studio-text-button" onClick={onPreview}><Play />预演</button><button type="button" className="studio-text-button" onClick={onNew}><Plus />新建角色</button></div></div>
    <nav className="creation-pane-tabs" aria-label="角色创作视图">
      <button type="button" aria-pressed={mobilePane === 'guide'} onClick={() => setMobilePane('guide')}>与 Agent 讨论</button>
      <button type="button" aria-pressed={mobilePane === 'form'} onClick={() => setMobilePane('form')}>角色设定</button>
    </nav>
    <div className="creation-workbench" data-pane={mobilePane === 'guide' ? 'chat' : 'canvas'}>
      <CharacterAgent key={sourceId} value={value} sourceId={sourceId} accountScope={accountScope} onApply={(proposal) => {
        const next = { ...value };
        for (const key of Object.keys(proposal) as (keyof CharacterDesignDraft)[]) {
          const text = proposal[key];
          if (typeof text === 'string' && text.trim()) next[key] = text;
        }
        onChange(next);
      }} />
      <aside className="creator-workspace-shell character-workspace" aria-label="角色工作区">
        <nav className="workspace-navigation character-workspace-nav" aria-label="工作区模块">
          <button type="button" aria-pressed="true"><UserRound /><span>角色设定</span></button>
        </nav>
        <div className="workspace-panels">
          <section className="workspace-panel" aria-label="角色设定">
            <div className="character-form-heading">
              <h2>角色设定</h2>
              <p>保存后出现在角色库，可直接开始对话。</p>
            </div>
            <div className="character-portrait-row">
              <img className="character-portrait-preview" src={standalonePortrait(value)} alt={value.name ? `${value.name}的形象预览` : '角色形象预览'} />
              <div className="character-portrait-copy">
                <strong>角色形象</strong>
                <p>上传 JPG、PNG 或 WebP 作为角色卡和对话头像；上传只在本机处理。也可以让 AI 根据名字、身份和 L1/L2 档案生成形象，生成会调用生图服务并消耗一次额度。</p>
                <div className="character-portrait-actions">
                  <button type="button" className="studio-button character-portrait-ai" onClick={() => void generatePortrait()} disabled={uploading || generating || accountScope === 'guest' || accountScope === 'pending'} title={accountScope === 'guest' ? '登录后才能使用 AI 生成形象' : undefined}>
                    {generating ? <LoaderCircle className="is-spinning" /> : <Sparkles />}{generating ? '生成中…' : value.portrait ? 'AI 重新生成' : 'AI 生成形象'}
                  </button>
                  <button type="button" className="studio-button" onClick={() => fileInput.current?.click()} disabled={uploading || generating}><ImagePlus />{uploading ? '处理中…' : value.portrait ? '更换图片' : '上传图片'}</button>
                  {value.portrait && <button type="button" className="studio-button" onClick={() => onChange({ ...value, portrait: '' })} disabled={uploading || generating}><Trash2 />移除</button>}
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => void upload(event.target.files?.[0])} />
                </div>
                {accountScope === 'guest' || accountScope === 'pending' ? <small className="character-portrait-hint">登录后可使用 AI 生图；上传图片仍可正常使用。</small> : null}
                {portraitNotice && <output className="character-portrait-notice">{portraitNotice}</output>}
                {uploadError && <p className="character-portrait-error" role="alert">{uploadError}</p>}
              </div>
            </div>
            <form className="character-form" onSubmit={event => { event.preventDefault(); save(); }}>
              <div className="draft-field">
                <label htmlFor="character-name">名字 <em>选填，留空显示未命名角色</em></label>
                <Input id="character-name" value={value.name} maxLength={24} placeholder="例如：沈砚" onChange={event => update('name', event.target.value)} />
              </div>
              <div className="draft-field">
                <label htmlFor="character-identity">身份 / 一句话设定</label>
                <Input id="character-identity" value={value.identity} maxLength={120} placeholder="例如：嘴硬心软的成年游侠，靠替人找东西过活" onChange={event => update('identity', event.target.value)} />
              </div>
              <div className="character-form-pair">
                <div className="draft-field">
                  <label htmlFor="character-personality">性格速览</label>
                  <Textarea id="character-personality" value={value.personality} maxLength={300} rows={3} placeholder="说话方式、在意什么、遇到冲突时的反应；完整设定写在下方 L2" onChange={event => update('personality', event.target.value)} />
                </div>
                <div className="draft-field">
                  <label htmlFor="character-appearance">外观速览</label>
                  <Textarea id="character-appearance" value={value.appearance} maxLength={300} rows={3} placeholder="年龄、衣着、标志性特征" onChange={event => update('appearance', event.target.value)} />
                </div>
              </div>
              <div className="draft-field">
                <label htmlFor="character-scene">你们在哪里见面</label>
                <Input id="character-scene" value={value.sceneName} maxLength={60} placeholder="例如：雨夜的旧书铺" onChange={event => update('sceneName', event.target.value)} />
              </div>
              <div className="draft-field">
                <label htmlFor="character-opening">开场白</label>
                <Textarea id="character-opening" value={value.opening} maxLength={600} rows={4} placeholder="角色看到你时说的第一句话，也是这段对话的起点" onChange={event => update('opening', event.target.value)} />
                <small>会作为对话的第一条消息，可在进入对话后继续修改。</small>
              </div>
              <CharacterProfileEditor
                value={value.profile}
                idPrefix="character-profile"
                onChange={profile => onChange({ ...value, profile })}
                onSample={() => { onNew(); onChange({ ...LIN_BAIYU_SAMPLE, profile: { ...LIN_BAIYU_SAMPLE.profile } }); }}
              />
              <div className="character-form-actions">
                <Button type="submit" disabled={!canSave}><Save />保存角色</Button>
              </div>
            </form>
          </section>
        </div>
      </aside>
    </div>
  </div>;
}
