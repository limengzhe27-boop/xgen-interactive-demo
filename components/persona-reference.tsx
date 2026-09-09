'use client';
import { useEffect, useRef, useState } from 'react';
import { Globe2, LoaderCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PersonaDraft } from '@/lib/persona-design';
import { appendReferenceNotes, publicReferenceUrl, readReferenceReview, referenceDraft, referenceLabels, referenceQuery, type PersonaReference, type ReferenceCandidate, type ReferenceReview } from '@/lib/persona-reference';

type Props = { draft: PersonaDraft; accountScope: string; disabled: boolean; onBusy: (value: boolean) => void; onApply: (draft: PersonaDraft, reference: PersonaReference) => void };
export function PersonaReferenceLookup({ draft, accountScope, disabled, onBusy, onApply }: Props) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<ReferenceCandidate[] | null>(null);
  const [result, setResult] = useState<ReferenceReview | null>(null);
  const [spoilerSafe, setSpoilerSafe] = useState(true), [selected, setSelected] = useState<number[]>([]);
  const [stage, setStage] = useState(''), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const baseline = JSON.stringify(referenceDraft(draft));
  const [resultBaseline, setResultBaseline] = useState('');
  const stale = !!result && resultBaseline !== baseline;
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);
  const selectedNotes = result?.notes.filter((note, index) => note.kind === 'addition' && selected.includes(index)) || [];
  const merged = appendReferenceNotes(draft, selectedNotes);
  async function request(body: { action: 'search'; query: string } | { action: 'complete'; id: string; spoilerSafe: boolean; draft: PersonaDraft }) {
    if (controller.current || disabled) return;
    const aborter = new AbortController(); controller.current = aborter; onBusy(true); setError(''); setStage(body.action);
    const timeout = setTimeout(() => aborter.abort(), 58_000);
    try {
      const response = await fetch('/api/persona-reference', { method: 'POST', cache: 'no-store', signal: aborter.signal, headers: { 'Content-Type': 'application/json', 'x-xgen-account': accountScope }, body: JSON.stringify(body) });
      const data = await response.json() as { error?: string; candidates?: ReferenceCandidate[] };
      if (!response.ok) throw Error(({ login_required: '请先登录再补全身份。', reference_insufficient: '这份资料不足以确认角色设定。换一个条目，或继续手动填写；原身份没有改变。', reference_not_found: '这个条目已不可用，请重新查找。', reference_rate_limited: '查找有些频繁，请稍后再试。', model_rate_limited: '公司模型繁忙，请稍后再试。', account_changed_or_unavailable: '账号已变化，请重新打开形象编辑。', invalid_request: '请只填写公开角色名称和作品，不要填写链接、联系方式或私人资料。' } as Record<string, string>)[data.error || ''] || '暂时无法读取或整理资料。原身份没有改变，可以继续手动设定。');
      if (aborter.signal.aborted || controller.current !== aborter) return;
      if (body.action === 'search') {
        if (!Array.isArray(data.candidates)) throw Error('搜索结果不完整，请重试。');
        setCandidates(data.candidates.filter((c: ReferenceCandidate) => typeof c.id === 'string' && typeof c.title === 'string' && publicReferenceUrl(c.url)).slice(0, 4)); setResult(null);
      } else {
        const suggestion = readReferenceReview(data); if (!suggestion) throw Error('资料格式不完整，未修改身份。');
        setResult(suggestion); setResultBaseline(baseline); setSelected(suggestion.notes.flatMap((note, index) => note.kind === 'addition' ? [index] : []));
      }
    } catch (err) { if (controller.current === aborter) setError(aborter.signal.aborted ? '已停止等待，原身份保留。已发出的整理请求可能产生文字模型费用。' : err instanceof Error ? err.message : '暂时无法补全。'); }
    finally { clearTimeout(timeout); if (controller.current === aborter) { controller.current = null; setStage(''); onBusy(false); } }
  }
  return <section className="persona-reference" aria-label="原作设定补全">
    <Button type="button" variant="outline" aria-expanded={open} disabled={disabled && !stage} onClick={() => { setOpen(!open); if (!open && !query) setQuery(draft.name); }}><Globe2 />查漏原作设定 <small>可选</small></Button>
    {open && <div className="persona-reference-body">
      <p>保留你写好的角色，只找值得补充的细节。原创角色无需查找。</p>
      <label htmlFor="persona-reference-query">公开角色名称 / 作品<Input id="persona-reference-query" maxLength={80} value={query} disabled={disabled || !!stage} onChange={e => { setQuery(e.target.value); setCandidates(null); setResult(null); }} placeholder="例如：海贼女帝，或孙悟空" /></label>
      <p className="persona-reference-note">查找只发送公开名称；对照设定时，才将虚构角色文字交给公司模型。</p>
      <div className="persona-actions"><Button type="button" variant="outline" disabled={disabled || !!stage || !referenceQuery(query)} onClick={() => void request({ action: 'search', query: query.trim() })}>{stage === 'search' ? <LoaderCircle className="animate-spin" /> : <Search />}{stage === 'search' ? '查找资料…' : '查找角色'}</Button>{stage && <Button type="button" variant="outline" onClick={() => controller.current?.abort()}>取消等待</Button>}</div>
      {candidates && (!result || stale) && <div className="persona-reference-candidates" aria-live="polite">
        <p>{candidates.length ? '确认是你想要的角色与版本，再整理。不同作品的同名角色不要混用。' : '没有找到匹配条目。试试角色全名或其他译名，也可以直接手动设定。'}</p>
        {!!candidates.length && <><label className="persona-check"><input type="checkbox" checked={spoilerSafe} disabled={disabled || !!stage} onChange={e => { setSpoilerSafe(e.target.checked); setResult(null); }} />尽量避开后期剧透</label><p className="persona-reference-note">点击对照，将把当前五项虚构文字设定及所选公开正文发送给公司文字模型，消耗文字额度。不发送图片、真实资料、记忆或私人聊天。</p></>}
        {candidates.map(candidate => <article key={candidate.id}><strong>{candidate.title}</strong><small>{candidate.publisher}</small><a href={candidate.url} target="_blank" rel="noopener noreferrer">查看来源</a><Button type="button" variant="outline" disabled={disabled || !!stage} onClick={() => void request({ action: 'complete', id: candidate.id, spoilerSafe, draft: referenceDraft(draft)! })}>{stage === 'complete' ? '正在对照你的设定…' : '对照我的设定'}</Button></article>)}
      </div>}
      {result && <div className="persona-reference-result">
        <h3>{result.notes.length ? '只补充有用的细节' : result.rejectedCount ? '暂未找到可核实的补充' : '本次来源未发现可补充项'}</h3>
        {!result.notes.length && <p>你的设定保持不变。这不代表已查遍原作；不够可靠的内容不会硬填。</p>}
        {stale && <output>你已修改角色文字。请用上方“对照我的设定”重新检查，旧建议暂不采纳。</output>}
        {result.notes.map((note, index) => <article className="persona-reference-note-item" key={index}>
          {note.kind === 'addition' ? <label className="persona-check"><input type="checkbox" checked={selected.includes(index)} disabled={disabled || !!stage || stale} onChange={e => setSelected(current => e.target.checked ? [...current, index] : current.filter(i => i !== index))} />补充 · {referenceLabels[note.field]}</label> : <strong>与原作有差异 · {referenceLabels[note.field]}</strong>}
          <p className="persona-reference-addition">{note.text}</p><p className="persona-reference-note">{note.reason}{note.kind === 'conflict' ? ' 可以保留你的改编，不会自动修改。' : ''}</p>
          {note.kind === 'addition' && <details><summary>调整这条补充</summary><label htmlFor={`reference-note-${index}`} className="sr-only">补充内容</label><Textarea id={`reference-note-${index}`} maxLength={note.field === 'name' ? 40 : 450} value={note.text} disabled={disabled || !!stage || stale} onChange={e => setResult({ ...result, notes: result.notes.map((n, i) => i === index ? { ...n, text: e.target.value } : n) })} /></details>}
          <details><summary>查看依据</summary><blockquote>{note.evidence}</blockquote></details>
        </article>)}
        {!!result.rejectedCount && <p className="persona-reference-note">有 {result.rejectedCount} 条建议缺少可核实的引用，已过滤。</p>}
        {!merged && <p role="alert">追加后会超过字段字数限制。请缩短补充内容或减少勾选；原文不会被截断。</p>}
        {result.notes.some(n => n.kind === 'addition') && <Button type="button" disabled={disabled || !!stage || stale || !merged || !selectedNotes.some(n => n.text.trim())} onClick={() => {
          if (!merged || stale) return;
          const fields = [...new Set(selectedNotes.filter(n => n.text.trim()).map(n => n.field))];
          onApply(merged, { ...result.reference, fields }); setResult(null); setCandidates(null); setOpen(false);
        }}>将选中补充加入设定 · {selectedNotes.length} 项</Button>}
        <details><summary>来源与使用说明</summary><a href={result.reference.url} target="_blank" rel="noopener noreferrer">{result.reference.title}</a><p>仅对照本次所选资料，非完整原作档案。补充会追加到下方编辑区，不替换原文或图片；检查后点击“保存身份”。入场能力仍由世界规则决定。</p></details>
      </div>}
      {error && <p role="alert">{error}</p>}
    </div>}
  </section>;
}
