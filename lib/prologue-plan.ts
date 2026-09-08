/** Editorial preflight only: validates declared evidence, never visual quality. */
export type ProloguePlan = {
  title: string;
  characters: { id: string; identity: string; appearance: string }[];
  facts: { id: string; description: string; channel: 'visual' | 'overlay' }[];
  shots: { id: string; start: number; end: number; characterIds: string[]; location: string;
    startState: string; action: string; endState: string; continuity: string;
    evidence: { factId: string; channel: 'visual' | 'overlay'; detail: string }[] }[];
  handoff: { shotId: string; unresolved: string; choices: string[] };
};
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 4000;
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9-]{1,80}$/.test(v);
export function checkProloguePlan(value: unknown): string[] {
  if (!record(value)) return ['PLAN: 需要分镜对象'];
  const errors: string[] = [];
  if (!text(value.title)) errors.push('TITLE: 缺少标题');
  const characters = Array.isArray(value.characters) ? value.characters : [];
  const facts = Array.isArray(value.facts) ? value.facts : [];
  const shots = Array.isArray(value.shots) ? value.shots : [];
  const uniqueIds = (items: unknown[], label: string) => {
    const ids = new Set<string>();
    for (const item of items) {
      if (!record(item) || !id(item.id) || ids.has(item.id)) errors.push(`${label}: ID缺失或重复`);
      else ids.add(item.id);
    }
    return ids;
  };
  const castIds = uniqueIds(characters, 'CAST');
  const factIds = uniqueIds(facts, 'FACT');
  uniqueIds(shots, 'SHOT');
  if (!characters.length || characters.length > 12) errors.push('CAST: 需要1至12个镜内人物');
  for (const c of characters) if (!record(c) || !text(c.identity) || !text(c.appearance)) errors.push('CAST: 缺少锁定身份或形象');
  if (!facts.length || facts.length > 8) errors.push('FACT: 需要1至8条公开事实');
  for (const f of facts) if (!record(f) || !text(f.description) || !['visual', 'overlay'].includes(String(f.channel))) errors.push('FACT: 事实或渠道无效');
  if (!shots.length || shots.length > 8) errors.push('SHOT: 需要1至8镜');
  let cursor = 0;
  const covered = new Set<string>();
  for (const [index, s] of shots.entries()) {
    if (!record(s)) { errors.push('SHOT: 无效镜头'); continue; }
    if (typeof s.start !== 'number' || typeof s.end !== 'number' || !Number.isFinite(s.start) || !Number.isFinite(s.end)
      || Math.abs(s.start - cursor) > 0.001 || s.end <= s.start || s.end > 30) errors.push(`TIME: 第${index + 1}镜时间不连续或超过30秒`);
    if (typeof s.end === 'number') cursor = s.end;
    if (!['location', 'startState', 'action', 'endState'].every(k => text(s[k]))) errors.push(`ACTION: 第${index + 1}镜缺少现场或动作状态`);
    if (index > 0 && !text(s.continuity)) errors.push(`CONTINUITY: 第${index + 1}镜未说明承接`);
    if (!Array.isArray(s.characterIds) || !s.characterIds.length || new Set(s.characterIds).size !== s.characterIds.length || s.characterIds.some(c => !castIds.has(c))) errors.push('CAST: 镜头引用未知或重复人物');
    if (!Array.isArray(s.evidence) || !s.evidence.length) errors.push(`FILLER: 第${index + 1}镜没有事实证据声明`);
    else for (const e of s.evidence) {
      if (!record(e) || !factIds.has(String(e.factId)) || !text(e.detail) || !['visual', 'overlay'].includes(String(e.channel))) { errors.push('EVIDENCE: 无效证据引用'); continue; }
      const fact = facts.find(f => record(f) && f.id === e.factId);
      if (fact.channel === 'visual' && e.channel !== 'visual') errors.push(`EVIDENCE: ${e.factId}不能仅靠字幕证明`);
      else covered.add(String(e.factId));
    }
  }
  for (const f of factIds) if (!covered.has(f)) errors.push(`EVIDENCE: ${f}缺少证据`);
  const h = value.handoff;
  if (!record(h) || !text(h.unresolved) || !shots.length || h.shotId !== shots.at(-1)?.id
    || !Array.isArray(h.choices) || h.choices.length < 2 || h.choices.length > 4 || !h.choices.every(text)
    || new Set(h.choices).size !== h.choices.length) errors.push('HANDOFF: 需要在末镜留下问题和2至4个不同的可行动方向');
  return errors;
}
export function compileProloguePlan(value: unknown) {
  const errors = checkProloguePlan(value);
  if (errors.length) throw new Error(errors.join('\n'));
  const plan = value as ProloguePlan;
  return { title: plan.title, totalSeconds: plan.shots.at(-1)!.end, status: 'plan-only-not-video-reviewed',
    shots: plan.shots.map(s => ({ id: s.id, seconds: s.end - s.start,
      prompt: [
        '按已确认前情拍摄一个连贯片段，不追加未来剧情、不生成字幕文字。',
        ...s.characterIds.map(cid => { const c = plan.characters.find(c => c.id === cid)!; return `${c.id}：${c.identity}；形象锁定：${c.appearance}`; }),
        `地点：${s.location}。起始：${s.startState}。动作：${s.action}。结束：${s.endState}。承接：${s.continuity || '序章首镜'}。`,
        ...s.evidence.filter(e => e.channel === 'visual').map(e => `必须拍到：${e.detail}`),
        s.id === plan.handoff.shotId ? `到此停止，尚未决定：${plan.handoff.unresolved}。不演出选择结果。` : '',
      ].filter(Boolean).join('\n'),
      overlays: s.evidence.filter(e => e.channel === 'overlay').map(e => e.detail),
    })), handoff: plan.handoff };
}
