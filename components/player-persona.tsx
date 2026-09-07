'use client';
/* oxlint-disable next/no-img-element -- account-owned generated portrait */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, UserRound, Sparkles, LoaderCircle, ArrowRight, X } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageTextarea } from '@/components/message-textarea';
import { makePersonaAdaptationRequest, type PersonaAdaptationSuggestion } from '@/lib/persona-adaptation';
import { requestPersonaAdaptation } from '@/lib/remote-persona-adaptation';
import { generateSceneImage } from '@/lib/remote-image-service';
import { admitPersona, personaEntryProblem, restoreEntryPolicy, type PlayerPersona, type EntryPolicy } from '@/lib/player-persona';
import type { StudioWorld } from '@/lib/studio-worlds';
import { PersonaDesigner } from '@/components/persona-designer';
import { localPortrait, readPersonaUpload } from '@/lib/persona-upload';

type PersonaEditorProps = { value: PlayerPersona | null; accountScope: string; onSave: (value: PlayerPersona) => boolean };
export function PersonaControl(props: PersonaEditorProps) {
  return <Sheet><SheetTrigger className="persona-shortcut" aria-label={props.value ? `编辑我的形象：${props.value.name}` : '创建我的形象'}>
    {props.value?.portraitUrl ? <img src={props.value.portraitUrl} alt="" /> : <UserRound aria-hidden="true" />}
    <span><small>我的形象</small><strong>{props.value?.name || '创建我的形象'}</strong></span><ArrowRight aria-hidden="true" />
  </SheetTrigger><SheetContent className="flow-drawer persona-drawer" showCloseButton={false}>
    <div className="flow-drawer-heading"><SheetTitle>我的形象</SheetTitle><SheetClose className="flow-control" aria-label="关闭我的形象"><X /></SheetClose></div>
    <SheetDescription>设定故事里的名字、外观和性格。保存后关闭，即可回到刚才的页面。</SheetDescription>
    <PersonaEditor {...props} expanded />
  </SheetContent></Sheet>;
}

export function PersonaEditor({ value, accountScope, onSave, expanded = false }: PersonaEditorProps & { expanded?: boolean }) {
  const [draft, setDraft] = useState({ name: value?.name || '', identity: value?.identity || '', personality: value?.personality || '', appearance: value?.appearance || '', abilities: value?.abilities || '', portraitUrl: value?.portraitUrl });
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const [designBusy, setDesignBusy] = useState(false);
  const [editing, setEditing] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const uploadSequence = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => { controller.current?.abort(); uploadSequence.current++; }, []);
  const loggedIn = !['guest', 'pending'].includes(accountScope);
  async function upload(file?: File) {
    if (!file || busy || designBusy || !loggedIn) return;
    const sequence = ++uploadSequence.current;
    setBusy(true); setNotice('正在本机处理图片…');
    try {
      const portraitUrl = await readPersonaUpload(file);
      if (sequence === uploadSequence.current) { setDraft(current => ({ ...current, portraitUrl })); setNotice('图片已就绪，点击保存身份后保留。尚未上传云端，也未发给模型。'); }
    } catch (error) {
      if (sequence === uploadSequence.current) setNotice(error instanceof Error ? error.message : '无法读取图片，原图已保留。');
    } finally { if (sequence === uploadSequence.current) setBusy(false); }
  }
  async function portrait() {
    if (controller.current || !loggedIn || !draft.appearance.trim()) return;
    const aborter = new AbortController(); controller.current = aborter; setBusy(true); setNotice('');
    try {
      const result = await generateSceneImage({ purpose: 'portrait', requestId: 1, sceneId: 'player-persona', seed: 90601,
        prompt: `虚构人物半身形象，单人，无文字。固定外观：${draft.appearance}。` }, aborter.signal, accountScope);
      if (!aborter.signal.aborted) { setDraft(current => ({ ...current, portraitUrl: result.assetUrl })); setNotice('形象已生成，点击保存身份后用于入场。'); }
    } catch { if (!aborter.signal.aborted) setNotice('形象生成失败，保留原图。可先保存文字身份，不必生图。'); }
    finally { if (!aborter.signal.aborted) setBusy(false); controller.current = null; }
  }
  return <details className="persona-editor" open={expanded || undefined}>
    <summary hidden={expanded}><UserRound />我的虚构身份 <small>{value ? value.name : '点击设定'}</small><ChevronDown /></summary>
    <p>这是故事里的你，不是对真实你的记忆。身份按账号保存在本机；可在账号栏手动保存至私人云存档，进入世界前还需确认适配。</p>
    {!loggedIn && <output>请先通过页面上方登录账号，再保存身份。游客仍可使用原剧情角色试玩。</output>}
    <details className="persona-manual" open={editing} onToggle={event => setEditing(event.currentTarget.open)}><summary>编辑虚拟角色（仅用于世界探索）</summary>
    <form onSubmit={event => { event.preventDefault(); if (!loggedIn || busy || designBusy || !draft.name.trim()) return; if (onSave({ ...draft, name: draft.name.trim(), version: 1, ownerId: accountScope, updatedAt: Date.now() })) setNotice('身份已保存在本机；已有探索和角色对话不会随之改变。'); else setNotice('身份保存失败，请保留页面并重试。'); }}>
      <div className="persona-actions"><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="选择形象图片" hidden onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /><Button type="button" variant="outline" disabled={!loggedIn || busy || designBusy} onClick={() => fileInput.current?.click()}>{draft.portraitUrl ? '上传 / 更换图片' : '上传形象图片'}</Button>{draft.portraitUrl && <Button type="button" variant="outline" disabled={!loggedIn || busy || designBusy} onClick={() => { setDraft(current => ({ ...current, portraitUrl: undefined })); setNotice('已移除预览图片，保存身份后生效。'); }}>移除图片</Button>}</div>
      <p>支持 JPG、PNG、WebP，最大 8 MB。图片在本机压缩，不发送给模型；保存后可随私人云存档手动备份。仅上传你有权使用的图片。</p>
      <fieldset disabled={!loggedIn || busy || designBusy} className="persona-fields">
        {([['name', '身份名称'], ['identity', '你设想的身份背景'], ['personality', '性格与相处方式'], ['appearance', '固定外观'], ['abilities', '希望拥有的能力（入场时不自动生效）']] as const).map(([key, label]) => <label key={key} className={key === 'abilities' ? 'persona-full' : ''} htmlFor={`persona-${key}`}>{label}{key === 'name' ? <Input id={`persona-${key}`} maxLength={40} required value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /> : <Textarea id={`persona-${key}`} maxLength={1000} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value, ...(key === 'appearance' && !localPortrait(draft.portraitUrl) ? { portraitUrl: undefined } : {}) })} />}</label>)}
      </fieldset>
      <div className="persona-actions">{draft.portraitUrl && <img src={draft.portraitUrl} alt={`${draft.name || '我的身份'}的形象`} />}<Button type="button" variant="outline" disabled={!loggedIn || busy || designBusy || !draft.appearance.trim()} onClick={portrait}>{busy ? '正在生成形象…' : draft.portraitUrl ? '重新生成形象' : '生成形象（可选）'}</Button><Button type="submit" disabled={!loggedIn || busy || designBusy || !draft.name.trim()}>保存身份</Button></div>
      <p>仅生成形象时调用生图；使用现有经济模型与缓存，不随打开页面重复生成。</p>{notice && <output>{notice}</output>}
    </form></details>
    <details className="flow-disclosure"><summary>让 Agent 帮我设计角色</summary><PersonaDesigner draft={draft} accountScope={accountScope} disabled={!loggedIn || busy} onBusy={setDesignBusy} onApply={proposal => { setDraft(current => ({ ...proposal, portraitUrl: localPortrait(current.portraitUrl) || proposal.appearance === current.appearance ? current.portraitUrl : undefined })); setEditing(true); setNotice('草案已填入，尚未保存。'); }} /></details>
  </details>;
}

export function EntryPolicyEditor({ value, roles, onChange }: { value: EntryPolicy; roles: { id: string; name: string }[]; onChange: (value: EntryPolicy) => void }) {
  return <section className="entry-policy-editor" aria-label="世界入场规则"><h3>谁能带着自己的形象进入？</h3>
    <label className="persona-check"><input type="checkbox" checked={value.allowPersona} onChange={e => onChange({ ...value, allowPersona: e.target.checked })} />允许使用账号的虚构身份</label>
    <p>玩家保留自己的名字、外观和性格，代入下方开放角色的剧情身份、关系、知识与目标。未开放的世界仍只使用原角色。</p>
    {value.allowPersona && <><fieldset><legend>允许代入的剧情位置</legend>{roles.map(role => <label className="persona-check" key={role.id}><input type="checkbox" checked={value.allowedRoleIds.includes(role.id)} onChange={e => onChange({ ...value, allowedRoleIds: e.target.checked ? [...value.allowedRoleIds, role.id] : value.allowedRoleIds.filter(id => id !== role.id) })} />{role.name || '未命名角色'}</label>)}</fieldset>
      {!value.allowedRoleIds.length && <p>尚未开放任何剧情位置；玩家暂不能使用自带身份。</p>}
      <label htmlFor="entry-ability-mode">能力如何适配？<select id="entry-ability-mode" value={value.abilityMode} onChange={e => onChange({ ...value, abilityMode: e.target.value as EntryPolicy['abilityMode'] })}><option value="role-only">仅使用剧情身份本身的能力</option><option value="fixed">创作者指定额外允许的能力</option><option value="agent-select">Agent 从允许清单中挑选</option></select></label>
      {value.abilityMode !== 'role-only' && <label htmlFor="entry-abilities">{value.abilityMode === 'agent-select' ? '可供 Agent 挑选的能力' : '额外能力'}（每行一项，最多 12 项）<Textarea id="entry-abilities" maxLength={2400} value={value.abilities.join('\n')} onChange={e => onChange({ ...value, abilities: e.target.value.split('\n').slice(0, 12).map(line => line.slice(0, 200)) })} placeholder="例如：善于观察细微表情，但不能直接读心" /></label>}
      {value.abilityMode === 'agent-select' && <p>Agent 结合玩家的虚构档案，从清单中挑选最多 3 项，经玩家确认才生效。清单为空时不能自带身份进入；没有合适项可以不授予额外能力。</p>}
      <p>能力仍受物理规律、可知信息和任务条件约束。不会直接带入玩家自述的超能力，也不会由 Agent 扩大你的授权清单。</p></>}
  </section>;
}

type AdmissionProps = { entry: StudioWorld; roleId: string; persona: PlayerPersona | null; onEdit?: () => void; onEnter: (entry: StudioWorld) => void };
export function PersonaAdmission(props: AdmissionProps) {
  // Any source/profile/policy change cancels requests and invalidates confirmation, including account switches.
  return <PersonaAdmissionSession key={JSON.stringify([props.entry, props.roleId, props.persona])} {...props} />;
}
function PersonaAdmissionSession({ entry, roleId, persona, onEdit, onEnter }: AdmissionProps) {
  const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState('');
  const [preference, setPreference] = useState(''); const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ suggestion: PersonaAdaptationSuggestion; preference: string; usable: boolean } | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);
  const policy = restoreEntryPolicy(entry.world.entryPolicy); const role = entry.world.characters.find(c => c.id === roleId);
  const problem = personaEntryProblem(entry.world, roleId, persona);
  const currentResult = result?.usable && result.preference === preference ? result.suggestion : null;
  const canEnter = !busy && (policy.abilityMode !== 'agent-select' || !!currentResult);
  async function suggest() {
    if (controller.current || problem || !persona) return;
    const aborter = new AbortController(); controller.current = aborter;
    setBusy(true); setError(''); setConfirmed(false); setResult(previous => previous ? { ...previous, usable: false } : null);
    const timeout = setTimeout(() => aborter.abort(), 30_000);
    try {
      const input = makePersonaAdaptationRequest(entry, roleId, persona, preference);
      const suggestion = await requestPersonaAdaptation(input, persona.ownerId, aborter.signal);
      if (!aborter.signal.aborted) setResult({ suggestion, preference, usable: true });
    } catch (err) {
      if (controller.current === aborter) setError(aborter.signal.aborted ? '请求已停止，未改变身份或剧情。可以重新获取建议。' : err instanceof Error ? err.message : '建议生成失败，请重试。');
    } finally {
      clearTimeout(timeout);
      if (controller.current === aborter) { controller.current = null; setBusy(false); }
    }
  }
  function cancel() { controller.current?.abort(); controller.current = null; setBusy(false); setError('已取消等待，不会自动入场；已发出的模型请求仍可能产生少量费用。'); }
  return <section className="persona-admission" aria-label="自带身份入场"><h3>或者，带上我的虚构身份</h3>
    {problem ? <><p>{problem}</p>{!persona && onEdit && <Button variant="outline" onClick={onEdit}>去设定我的身份</Button>}</> : <>
      <p><strong>{persona!.name}</strong> → 代入 {role?.name} 的剧情位置</p>
      <dl><dt>本世界身份</dt><dd>{role?.identity}</dd><dt>本次目标</dt><dd>{role?.goal}</dd><dt>保留的个性与外观</dt><dd>{persona!.personality || '使用剧情角色性格'}；{persona!.appearance || '使用剧情角色外观'}</dd><dt>额外允许的能力</dt><dd>{policy.abilityMode === 'agent-select' ? currentResult ? currentResult.grantedAbilities.join('；') || '无，仅剧情身份原有能力' : '等待 Agent 从创作者清单中建议' : policy.abilityMode === 'fixed' ? policy.abilities.filter(Boolean).join('；') || '无' : '无，仅剧情身份原有能力'}</dd></dl>
      <section className="persona-adaptation" aria-label="世界 Agent 入场建议" aria-busy={busy}>
        <h4><Sparkles />让世界 Agent 帮我适配</h4>
        <p>点击后将把你的虚构背景、性格、外观、愿望能力，以及本次偏好和剧情位置的公开身份／目标发送给 DeepSeek。不会发送私人聊天、个人记忆或角色秘密；只提供建议，不生图、不开始剧情。</p>
        <label htmlFor="adaptation-preference">这次想怎么体验？（可不填）<MessageTextarea id="adaptation-preference" maxLength={1000} value={preference} disabled={busy} onChange={e => { setPreference(e.target.value); setConfirmed(false); setResult(previous => previous ? { ...previous, usable: false } : null); }} onSend={suggest} placeholder="例如：希望更擅长谈判，但不想轻松跳过冲突" /></label>
        <div className="persona-actions"><Button type="button" variant="outline" disabled={busy} onClick={suggest}>{busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{busy ? '正在适配…' : result ? '重新获取入场建议' : '获取入场建议'}</Button>{busy && <Button type="button" variant="outline" onClick={cancel}>取消等待</Button>}</div>
        <div aria-live="polite">{result && <div className="persona-adaptation-result"><strong>{currentResult ? '待你确认的建议' : '上一次建议 · 已失效，请重新获取'}</strong><p>{result.suggestion.summary}</p><dl><dt>建议授予（以此清单为准）</dt><dd>{result.suggestion.grantedAbilities.join('；') || '不增加额外能力'}</dd><dt>不带入的愿望与限制</dt><dd>{result.suggestion.limitations}</dd></dl><p>这是代入建议，不改变上方固定的剧情身份、关系与目标。</p></div>}</div>
      </section>
      <p>自带背景与愿望能力不会自动生效；关系、知识、任务和世界规则保持不变。这里只适配一个新会话，不覆盖原世界。确认进入后，上述虚构设定会用于世界模型演绎，不附带你的私人聊天或个人记忆。</p>
      <label className="persona-check"><input type="checkbox" disabled={!canEnter} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />我确认本次身份与能力适配</label>
      <Button disabled={!confirmed || !canEnter} onClick={() => { try { onEnter(admitPersona(entry, roleId, persona!, currentResult?.grantedAbilities)); } catch (err) { setError(err instanceof Error ? err.message : '入场失败'); } }}>以我的身份 {persona!.name} 进入</Button>
    </>}{error && <p role="alert">{error}</p>}
  </section>;
}
