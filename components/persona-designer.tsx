'use client';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { MessageTextarea } from '@/components/message-textarea';
import { AI_CONTRACT_VERSION } from '@/lib/ai-contracts';
import { readPersonaDraft, readPersonaDesignReply, type PersonaDraft, type PersonaDesignReply } from '@/lib/persona-design';

export function PersonaDesigner({ draft, accountScope, disabled, onBusy, onApply }: { draft: PersonaDraft; accountScope: string; disabled: boolean; onBusy: (busy: boolean) => void; onApply: (draft: PersonaDraft) => void }) {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [result, setResult] = useState<{ value: PersonaDesignReply; baseline: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const baseline = JSON.stringify(readPersonaDraft(draft));
  const stale = !!result && result.baseline !== baseline;
  async function send() {
    if (controller.current || disabled || !message.trim()) return;
    const aborter = new AbortController(); controller.current = aborter;
    setBusy(true); onBusy(true); setError('');
    const sent = message.trim();
    const timeout = setTimeout(() => aborter.abort(), 30_000);
    try {
      const response = await fetch('/api/ai', { method: 'POST', cache: 'no-store', signal: aborter.signal, headers: { 'Content-Type': 'application/json', 'x-xgen-account': accountScope }, body: JSON.stringify({ operation: 'design-persona', input: { contractVersion: AI_CONTRACT_VERSION, message: sent, draft: readPersonaDraft(!stale && result ? result.value.proposal : draft), conversation: conversation.slice(-6) } }) });
      if (!response.ok) throw new Error(response.status === 409 ? '账号状态已变化，请刷新后再试。' : '身份建议暂未生成成功，原身份没有改变，请重试。');
      const value = readPersonaDesignReply(await response.json());
      if (!value) throw new Error('建议格式不完整，未修改身份，请重试。');
      if (!aborter.signal.aborted) { setResult({ value, baseline }); setConversation(current => [...current, { role: 'user', content: sent }, { role: 'assistant', content: value.reply }].slice(-6) as typeof current); setMessage(''); }
    } catch (err) { if (controller.current === aborter) setError(aborter.signal.aborted ? '等待已停止，输入和原身份仍保留。已发出的请求可能产生费用。' : err instanceof Error ? err.message : '暂时无法生成建议。'); }
    finally { clearTimeout(timeout); if (controller.current === aborter) { controller.current = null; setBusy(false); onBusy(false); } }
  }
  return <section className="persona-designer" aria-label="和 Agent 设计虚构身份">
    <h3><Sparkles />故事里的你，想是什么样？</h3>
    <p>一句话就可以，我陪你把身份、个性和能力想清楚。</p>
    <div className="persona-design-log" role="log" aria-live="polite">{conversation.map((turn, index) => <p key={index} data-role={turn.role}><small>{turn.role === 'user' ? '你' : '你的 Agent'}</small>{turn.content}</p>)}</div>
    {result && <details className="persona-suggestion" open><summary>{stale ? '上次建议已过期' : '待你确认的身份草案'}</summary><dl>{Object.entries(result.value.proposal).map(([key, value]) => <div key={key}><dt>{{ name: '名字', identity: '背景', personality: '性格', appearance: '外观', abilities: '愿望能力' }[key]}</dt><dd>{value || '待讨论'}</dd></div>)}</dl><button type="button" className="flow-control" disabled={disabled || busy || stale} onClick={() => { onApply(result.value.proposal); setResult(null); }}>采用草案，继续检查</button><p>{stale ? '你已手动修改身份。继续讨论可基于新设定生成建议，不会覆盖手改内容。' : '采用只填入编辑区；检查后再点击“保存身份”。'}</p></details>}
    <form onSubmit={event => { event.preventDefault(); void send(); }}><label htmlFor="persona-design-message">描述你的虚构身份</label><MessageTextarea id="persona-design-message" value={message} maxLength={2000} disabled={disabled || busy} onChange={event => setMessage(event.target.value)} placeholder="例如：我想做个嘴硬心软的成年游侠，银色短发，会读古代机关，但不想无敌。" /><small>发送会将本次身份讨论和虚构草案交给公司网关及其模型供应商；不附带个人记忆，不生图。</small><div><button type="submit" className="flow-control" disabled={disabled || busy || !message.trim()}><Send />{busy ? '正在构思…' : '一起构思'}</button>{busy && <button type="button" className="flow-control" onClick={() => controller.current?.abort()}>取消等待</button>}</div>{error && <p role="alert">{error}</p>}</form>
  </section>;
}
