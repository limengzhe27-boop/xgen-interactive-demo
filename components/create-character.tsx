'use client';
/* oxlint-disable next/no-img-element -- local portrait preview; never a remote image */

import { useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, Play, Plus, Save, Sparkles, Trash2, Undo2, Upload, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CreateModeSwitch, type CreateMode } from '@/components/create-mode-switch';
import { readPersonaUpload } from '@/lib/persona-upload';
import { standalonePortrait, type StandaloneCharacterInput } from '@/lib/standalone-character';

export function CreateCharacter({ value, onChange, onSave, onPublish, onUnpublish, onPreview, onNew, published, onBack, onModeChange, storageNotice, canSave }: {
  value: StandaloneCharacterInput;
  onChange: (value: StandaloneCharacterInput) => void;
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
}) {
  const [mobilePane, setMobilePane] = useState<'guide' | 'form'>('form');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const update = (key: keyof StandaloneCharacterInput, next: string) => onChange({ ...value, [key]: next });
  const save = () => { if (canSave && value.name.trim()) onSave(); };
  const upload = async (file?: File) => {
    if (!file || uploading) return;
    setUploading(true); setUploadError('');
    try { onChange({ ...value, portrait: await readPersonaUpload(file) }); }
    catch (error) { setUploadError(error instanceof Error ? error.message : '图片处理失败，请重试。'); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ''; }
  };

  return <div className="flow-page creation-flow character-creation-flow">
    <header className="flow-toolbar">
      <button className="flow-control" type="button" onClick={onBack}><ArrowLeft />返回</button>
      <h1>{value.name ? `创作角色 · ${value.name}` : '新建角色'}</h1>
      <div className="workspace-actions">
        <small className="workspace-save-badge" role={storageNotice ? 'alert' : undefined}>{storageNotice || (published ? '已发布 · 修改后点更新发布' : canSave ? '角色保存在当前浏览器' : '本机存档尚未就绪')}</small>
        <Button onClick={save} disabled={!canSave || !value.name.trim()}><Save />保存角色</Button>
        {published && <Button variant="outline" onClick={onUnpublish}><Undo2 />撤下</Button>}
        <Button className="primary-action" onClick={onPublish} disabled={!canSave || !value.name.trim() || !value.portrait} title={!value.portrait ? '发布前请先上传角色形象' : undefined}><Upload />{published ? '更新发布' : '发布角色'}</Button>
      </div>
    </header>
    <div className="creation-mode-bar"><CreateModeSwitch mode="character" onChange={onModeChange} /><div className="creation-mode-actions"><button type="button" className="studio-text-button" onClick={onPreview} disabled={!value.name.trim()}><Play />预演</button><button type="button" className="studio-text-button" onClick={onNew}><Plus />新建角色</button></div></div>
    <nav className="creation-pane-tabs" aria-label="角色创作视图">
      <button type="button" aria-pressed={mobilePane === 'guide'} onClick={() => setMobilePane('guide')}>填写提示</button>
      <button type="button" aria-pressed={mobilePane === 'form'} onClick={() => setMobilePane('form')}>角色设定</button>
    </nav>
    <div className="creation-workbench" data-pane={mobilePane === 'guide' ? 'chat' : 'canvas'}>
      <section className="creator-agent-panel character-guide" aria-label="角色创作提示">
        <div className="creator-agent-heading">
          <span><Sparkles /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <small>角色创作</small>
            <strong>{value.name || '先给角色一个名字'}</strong>
          </div>
        </div>
        <div className="character-guide-body">
          <p>右侧直接填写即可；先写你最确定的部分，剩下的可以慢慢补。保存后角色会出现在角色库，可以立即开始对话。</p>
          <h3>可以这样想</h3>
          <ul>
            <li><strong>身份</strong>：他是谁、靠什么生活、和你是什么关系。</li>
            <li><strong>性格</strong>：用行为描述，比堆形容词更有用，例如“先看证据再信人”。</li>
            <li><strong>开场白</strong>：他看见你时说的第一句话，会作为这段对话的起点。</li>
            <li><strong>见面地点</strong>：会显示在对话页顶部。</li>
          </ul>
          <p className="character-guide-note">角色只保存在当前浏览器；换账号或换浏览器不会自动带过去。</p>
        </div>
      </section>
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
                <p>上传 JPG、PNG 或 WebP 作为角色卡和对话头像；只在本机处理，不会上传给模型。</p>
                <div className="character-portrait-actions">
                  <button type="button" className="studio-button" onClick={() => fileInput.current?.click()} disabled={uploading}><ImagePlus />{uploading ? '处理中…' : value.portrait ? '更换图片' : '上传图片'}</button>
                  {value.portrait && <button type="button" className="studio-button" onClick={() => onChange({ ...value, portrait: '' })} disabled={uploading}><Trash2 />移除</button>}
                  <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => void upload(event.target.files?.[0])} />
                </div>
                {uploadError && <p className="character-portrait-error" role="alert">{uploadError}</p>}
              </div>
            </div>
            <form className="character-form" onSubmit={event => { event.preventDefault(); save(); }}>
              <div className="draft-field">
                <label htmlFor="character-name">名字 <em>必填</em></label>
                <Input id="character-name" value={value.name} maxLength={24} placeholder="例如：沈砚" onChange={event => update('name', event.target.value)} />
              </div>
              <div className="draft-field">
                <label htmlFor="character-identity">身份 / 一句话设定</label>
                <Input id="character-identity" value={value.identity} maxLength={120} placeholder="例如：嘴硬心软的成年游侠，靠替人找东西过活" onChange={event => update('identity', event.target.value)} />
              </div>
              <div className="character-form-pair">
                <div className="draft-field">
                  <label htmlFor="character-personality">性格</label>
                  <Textarea id="character-personality" value={value.personality} maxLength={300} rows={3} placeholder="说话方式、在意什么、遇到冲突时的反应" onChange={event => update('personality', event.target.value)} />
                </div>
                <div className="draft-field">
                  <label htmlFor="character-appearance">外观</label>
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
              <div className="character-form-actions">
                <Button type="submit" disabled={!canSave || !value.name.trim()}><Save />保存角色</Button>
              </div>
            </form>
          </section>
        </div>
      </aside>
    </div>
  </div>;
}
