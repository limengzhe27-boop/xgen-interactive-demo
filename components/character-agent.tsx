'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageTextarea } from '@/components/message-textarea';
import { AI_CONTRACT_VERSION } from '@/lib/ai-contracts';
import { readCharacterDesignReply, type CharacterDesignDraft } from '@/lib/character-design';
import type { StandaloneCharacterInput } from '@/lib/standalone-character';

type AgentMessage = { role: 'user' | 'assistant'; content: string };
const GREETING: AgentMessage = { role: 'assistant', content: '我是你的角色 Agent。先说一句你想要的角色，或者直接告诉我他看见你时会说什么；我会把建议放进右侧表单，等你采用。' };
const LABELS: Record<keyof CharacterDesignDraft, string> = {
  name: '名字',
  identity: '身份 / 一句话设定',
  personality: '性格',
  appearance: '外观',
  sceneName: '见面地点',
  opening: '开场白',
};

function readStored(value: unknown): { messages: AgentMessage[]; proposal: Partial<CharacterDesignDraft> } | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const messages = Array.isArray(record.messages)
    ? record.messages.filter((item): item is AgentMessage => !!item && typeof item === 'object' && ['user', 'assistant'].includes(String((item as Record<string, unknown>).role)) && typeof (item as Record<string, unknown>).content === 'string' && ((item as Record<string, unknown>).content as string).length <= 2000).slice(-30)
    : [];
  const proposal = readCharacterDesignReply({ reply: 'restored', proposal: record.proposal })?.proposal ?? {};
  return { messages: messages.length ? messages : [GREETING], proposal };
}

function loadAgentState(key: string): { messages: AgentMessage[]; proposal: Partial<CharacterDesignDraft> | null } {
  if (typeof window === 'undefined') return { messages: [GREETING], proposal: null };
  try {
    const stored = readStored(JSON.parse(window.localStorage.getItem(key) || 'null'));
    return { messages: stored?.messages ?? [GREETING], proposal: stored && Object.keys(stored.proposal).length ? stored.proposal : null };
  } catch {
    return { messages: [GREETING], proposal: null };
  }
}

export function CharacterAgent({ value, sourceId, accountScope, onApply }: {
  value: StandaloneCharacterInput;
  sourceId: string;
  accountScope: string;
  onApply: (proposal: Partial<CharacterDesignDraft>) => void;
}) {
  const key = `xgen-character-agent-v1:${sourceId || 'draft'}`;
  const [messages, setMessages] = useState<AgentMessage[]>(() => loadAgentState(key).messages);
  const [proposal, setProposal] = useState<Partial<CharacterDesignDraft> | null>(() => loadAgentState(key).proposal);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify({ messages, proposal })); } catch { /* A blocked store must not break the conversation. */ }
  }, [key, messages, proposal]);

  useEffect(() => {
    const element = logRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, busy, proposal]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setBusy(true); setError('');
    const conversation = messages.filter(turn => turn.content).slice(-6);
    try {
      const accountResponse = await fetch('/api/account', { cache: 'no-store' }).catch(() => null);
      const accountData = accountResponse?.ok ? await accountResponse.json() as { user?: { id?: string } } : null;
      const owner = accountData?.user?.id || (accountScope && accountScope !== 'pending' ? accountScope : 'guest');
      const response = await fetch('/api/ai', {
        method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'x-xgen-account': owner },
        body: JSON.stringify({
          operation: 'design-character',
          input: {
            contractVersion: AI_CONTRACT_VERSION,
            message,
            draft: {
              name: value.name, identity: value.identity, personality: value.personality,
              appearance: value.appearance, sceneName: value.sceneName, opening: value.opening,
            },
            conversation,
          },
        }),
      });
      const data = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error === 'contract_version_mismatch' ? '页面版本已更新，请刷新后再试。' : data.message || '角色 Agent 暂时没有回应，请稍后重试。');
      const reply = readCharacterDesignReply(data);
      if (!reply) throw new Error('建议格式不完整，未修改右侧表单，请重试。');
      setMessages(current => [...current, { role: 'user' as const, content: message }, { role: 'assistant' as const, content: reply.reply }].slice(-30));
      setProposal(Object.keys(reply.proposal).length ? reply.proposal : null);
      setInput('');
    } catch (error) {
      setError(error instanceof Error ? error.message : '暂时无法生成建议，请重试。');
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!proposal) return;
    const changes = Object.fromEntries(Object.entries(proposal).filter(([, text]) => typeof text === 'string' && text.trim())) as Partial<CharacterDesignDraft>;
    if (!Object.keys(changes).length) return;
    onApply(changes);
    setProposal(null);
    setMessages(current => [...current, { role: 'assistant' as const, content: '已写入右侧表单。你可以继续修改，或点顶部的「预演」看看实际对话。' }].slice(-30));
  }

  return <section className="creator-agent-panel character-agent-panel" aria-label="角色 Agent">
    <div className="creator-agent-heading">
      <span><Sparkles /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <small>角色 Agent</small>
        <strong>{value.name || '一起设计这个角色'}</strong>
      </div>
    </div>
    <div className="creator-conversation" ref={logRef} role="log" aria-live="polite" aria-busy={busy}>
      {messages.map((item, index) => <p key={index} data-role={item.role}>{item.role === 'assistant' && <small>角色 Agent</small>}<span>{item.content}</span></p>)}
      {busy ? <p data-role="assistant"><small>角色 Agent</small><span>正在把角色的性格、处境和第一句话放在一起想……</span></p> : null}
      {proposal && <section className="creator-inline-proposal-card character-agent-proposal" aria-label="角色建议">
        <div className="proposal-card-header"><div className="proposal-card-title"><Sparkles size={15} /><strong>待采纳的角色建议</strong></div></div>
        <dl>{Object.entries(proposal).map(([field, text]) => <div key={field}><dt>{LABELS[field as keyof CharacterDesignDraft]}</dt><dd>{text}</dd></div>)}</dl>
        <div className="character-agent-proposal-actions"><Button size="sm" onClick={apply}>采用建议</Button><Button size="sm" variant="outline" onClick={() => setProposal(null)}>忽略</Button></div>
      </section>}
    </div>
    <div className="creation-compose-area">
      <form className="creator-composer" onSubmit={event => { event.preventDefault(); void send(); }}>
        <label className="sr-only" htmlFor="character-agent-message">和角色 Agent 讨论</label>
        <MessageTextarea id="character-agent-message" rows={1} maxLength={2000} value={input} onChange={event => setInput(event.target.value)} placeholder="告诉我你想要的角色，或他看见你时会说什么…" disabled={busy} />
        <Button className="agent-send" type="submit" aria-label="发送给角色 Agent" disabled={!input.trim() || busy}>{busy ? <LoaderCircle className="is-spinning" /> : <Send />}</Button>
      </form>
      <small className="conversation-input-hint">Enter 发送 · Shift + Enter 换行</small>
    </div>
    {error && <p className="character-agent-error" role="alert">{error}</p>}
  </section>;
}
