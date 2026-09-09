'use client';
import { useEffect, useRef, useState } from 'react';
import { Globe2, LoaderCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PersonaDraft } from '@/lib/persona-design';
import { mergeReference, publicReferenceUrl, readReferenceSuggestion, referenceFields, referenceLabels, referenceQuery, type PersonaReference, type ReferenceCandidate, type ReferenceSuggestion } from '@/lib/persona-reference';

type Props = { draft: PersonaDraft; accountScope: string; disabled: boolean; onBusy: (value: boolean) => void; onApply: (draft: PersonaDraft, reference: PersonaReference) => void };
export function PersonaReferenceLookup({ draft, accountScope, disabled, onBusy, onApply }: Props) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<ReferenceCandidate[] | null>(null);
  const [result, setResult] = useState<ReferenceSuggestion | null>(null);
  const [spoilerSafe, setSpoilerSafe] = useState(true), [replace, setReplace] = useState(false);
  const [stage, setStage] = useState(''), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const baseline = JSON.stringify(draft);
  const [resultBaseline, setResultBaseline] = useState('');
  const stale = !!result && resultBaseline !== baseline;
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);
  async function request(body: { action: 'search'; query: string } | { action: 'complete'; id: string; spoilerSafe: boolean }) {
    if (controller.current || disabled) return;
    const aborter = new AbortController(); controller.current = aborter; onBusy(true); setError(''); setStage(body.action);
    const timeout = setTimeout(() => aborter.abort(), 48_000);
    try {
      const response = await fetch('/api/persona-reference', { method: 'POST', cache: 'no-store', signal: aborter.signal, headers: { 'Content-Type': 'application/json', 'x-xgen-account': accountScope }, body: JSON.stringify(body) });
      const data = await response.json() as { error?: string; candidates?: ReferenceCandidate[] };
      if (!response.ok) throw Error(({ login_required: '请先登录再补全身份。', reference_insufficient: '这份资料不足以确认角色设定。换一个条目，或继续手动填写；原身份没有改变。', reference_not_found: '这个条目已不可用，请重新查找。', reference_rate_limited: '查找有些频繁，请稍后再试。', model_rate_limited: '公司模型繁忙，请稍后再试。', account_changed_or_unavailable: '账号已变化，请重新打开形象编辑。', invalid_request: '请只填写公开角色名称和作品，不要填写链接、联系方式或私人资料。' } as Record<string, string>)[data.error || ''] || '暂时无法读取或整理资料。原身份没有改变，可以继续手动设定。');
      if (aborter.signal.aborted || controller.current !== aborter) return;
      if (body.action === 'search') {
        if (!Array.isArray(data.candidates)) throw Error('搜索结果不完整，请重试。');
        setCandidates(data.candidates.filter((c: ReferenceCandidate) => typeof c.id === 'string' && typeof c.title === 'string' && publicReferenceUrl(c.url)).slice(0, 4)); setResult(null);
      } else {
        const suggestion = readReferenceSuggestion(data); if (!suggestion) throw Error('资料格式不完整，未修改身份。');
        setResult(suggestion); setResultBaseline(baseline); setReplace(false);
      }
    } catch (err) { if (controller.current === aborter) setError(aborter.signal.aborted ? '已停止等待，原身份保留。已发出的整理请求可能产生文字模型费用。' : err instanceof Error ? err.message : '暂时无法补全。'); }
    finally { clearTimeout(timeout); if (controller.current === aborter) { controller.current = null; setStage(''); onBusy(false); } }
  }
  return <section className="persona-reference" aria-label="原作设定补全">
    <Button type="button" variant="outline" aria-expanded={open} disabled={disabled && !stage} onClick={() => { setOpen(!open); if (!open && !query) setQuery(draft.name); }}><Globe2 />补全原作设定 <small>可选</small></Button>
    {open && <div className="persona-reference-body">
      <p>想成为已有作品中的角色？先查找资料，再决定保留哪些设定。原创身份可以跳过。</p>
      <label htmlFor="persona-reference-query">公开角色名称 / 作品<Input id="persona-reference-query" maxLength={80} value={query} disabled={disabled || !!stage} onChange={e => { setQuery(e.target.value); setCandidates(null); setResult(null); }} placeholder="例如：海贼女帝，或孙悟空" /></label>
      <p className="persona-reference-note">查找仅发送上方名称给公开资料站；不发送你的身份草稿、图片或私人聊天。百科可能含剧透，整理时默认省略后期剧情。</p>
      <div className="persona-actions"><Button type="button" variant="outline" disabled={disabled || !!stage || !referenceQuery(query)} onClick={() => void request({ action: 'search', query: query.trim() })}>{stage === 'search' ? <LoaderCircle className="animate-spin" /> : <Search />}{stage === 'search' ? '查找资料…' : '查找角色'}</Button>{stage && <Button type="button" variant="outline" onClick={() => controller.current?.abort()}>取消等待</Button>}</div>
      {candidates && !result && <div className="persona-reference-candidates" aria-live="polite">
        <p>{candidates.length ? '确认是你想要的角色与版本，再整理。不同作品的同名角色不要混用。' : '没有找到匹配条目。试试角色全名或其他译名，也可以直接手动设定。'}</p>
        {candidates.map(candidate => <article key={candidate.id}><strong>{candidate.title}</strong><small>{candidate.publisher}</small><a href={candidate.url} target="_blank" rel="noopener noreferrer">查看来源</a><Button type="button" variant="outline" disabled={disabled || !!stage} onClick={() => void request({ action: 'complete', id: candidate.id, spoilerSafe })}>{stage === 'complete' ? '正在整理…' : '是这个角色，补全设定'}</Button></article>)}
        {!!candidates.length && <><label className="persona-check"><input type="checkbox" checked={spoilerSafe} disabled={disabled || !!stage} onChange={e => setSpoilerSafe(e.target.checked)} />整理时避开后期剧情与身份变化</label><p className="persona-reference-note">整理会把选中条目的公开正文交给公司文字模型，消耗文字额度；不生成图片或视频。自动避剧透不能保证完全准确。</p></>}
      </div>}
      {result && <div className="persona-reference-result">
        <h3>原作参考 · 可直接修改</h3><a href={result.reference.url} target="_blank" rel="noopener noreferrer">{result.reference.title} · 查看来源</a><p>{result.warning}</p>
        {referenceFields.map(field => <label key={field} htmlFor={`reference-${field}`}>{referenceLabels[field]}{field === 'name' ? <Input id={`reference-${field}`} maxLength={40} value={result.proposal[field]} disabled={disabled || !!stage} onChange={e => setResult({ ...result, proposal: { ...result.proposal, [field]: e.target.value } })} /> : <Textarea id={`reference-${field}`} maxLength={1000} value={result.proposal[field]} disabled={disabled || !!stage} placeholder="来源未提供依据，可以自行补充" onChange={e => setResult({ ...result, proposal: { ...result.proposal, [field]: e.target.value } })} />}</label>)}
        <label className="persona-check"><input type="checkbox" checked={replace && !stale} disabled={disabled || !!stage || stale} onChange={e => setReplace(e.target.checked)} />同时替换我已经填写的文字设定（保留图片）</label>
        <p>{stale ? '你已修改原身份，本次只允许补充仍为空的字段，不覆盖手改内容。' : '默认只补空白字段。你的自定义版本优先，原作关系与能力不自动成为新世界事实。'}</p>
        <Button type="button" disabled={disabled || !!stage || !referenceFields.some(f => result.proposal[f].trim() && ((!stale && replace) || !draft[f].trim()))} onClick={() => {
          const fields = referenceFields.filter(f => result.proposal[f].trim() && ((!stale && replace) || !draft[f].trim()));
          onApply(mergeReference(draft, result.proposal, fields), { ...result.reference, fields }); setResult(null); setCandidates(null); setOpen(false);
        }}>{replace && !stale ? '采用以上设定' : '补入空白字段'}</Button><p>这一步只填入编辑区，检查后点击“保存身份”。</p>
      </div>}
      {error && <p role="alert">{error}</p>}
    </div>}
  </section>;
}
