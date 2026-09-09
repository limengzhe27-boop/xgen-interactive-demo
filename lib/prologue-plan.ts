/** Editorial preflight only: validates declared evidence, never visual quality. */
export type ProloguePlan = {
  title: string;
  characters: { id: string; identity: string; appearance: string }[];
  facts: { id: string; description: string; channel: 'visual' | 'overlay' }[];
  shots: { id: string; start: number; end: number; characterIds: string[]; location: string;
    startState: string; action: string; endState: string; continuity: string;
    evidence: { factId: string; channel: 'visual' | 'overlay'; detail: string }[] }[];
  handoff: { shotId: string; unresolved: string; choices: string[] };
  version?: 2;
  story?: { throughline: string; perspective: 'external' | 'first-person'; povCharacterId?: string;
    beats: { shotId: string; cause: string; change: string }[];
    recall: { topic: 'who' | 'relationship' | 'event' | 'pressure' | 'handoff'; answer: string; factIds: string[] }[] };
  audio?: { mode: 'native' | 'post' | 'silent'; silentReason?: string;
    cues: { start: number; end: number; speakerId: string; kind: 'narration' | 'dialogue' | 'phone'; text: string; delivery: string }[] };
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
      if (fact.channel === 'visual' && e.channel !== 'visual') errors.push(`EVIDENCE: ${String(e.factId)}不能仅靠字幕证明`);
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
// Only declared causal/recall coverage is checked. No semantic or video comprehension score.
export function checkStoryProloguePlan(value: unknown): string[] {
  const base = checkProloguePlan(value); if (base.length) return base;
  const v = value as Record<string, unknown>, plan = value as ProloguePlan;
  const errors: string[] = [];
  if (v.version !== 2) errors.push('VERSION: 完整序章需要v2叙事与声轨计划，旧结构仅供历史查看');
  const story = v.story;
  if (!record(story) || !text(story.throughline) || !['external', 'first-person'].includes(String(story.perspective))) errors.push('STORY: 缺少主因果与视角');
  else {
    if (story.perspective === 'first-person' && !plan.characters.some(c => c.id === story.povCharacterId)) errors.push('POV: 第一人称需锁定体验人物');
    if (!Array.isArray(story.beats) || story.beats.length !== plan.shots.length || story.beats.some((b, i) => !record(b) || b.shotId !== plan.shots[i].id || !text(b.cause) || !text(b.change))) errors.push('CAUSALITY: 每镜按顺序声明前因与局面变化');
    const topics = ['who', 'relationship', 'event', 'pressure', 'handoff'];
    if (!Array.isArray(story.recall) || story.recall.length !== topics.length || new Set(story.recall.map(r => record(r) ? r.topic : '')).size !== topics.length
      || story.recall.some(r => !record(r) || !topics.includes(String(r.topic)) || !text(r.answer) || !Array.isArray(r.factIds) || !r.factIds.length || r.factIds.some(f => !plan.facts.some(p => p.id === f)))) errors.push('RECALL: 需将人物/关系/事件/压力/未决动作五项答案关联到事实证据');
  }
  const audio = v.audio, duration = plan.shots.at(-1)!.end;
  if (!record(audio) || !['native', 'post', 'silent'].includes(String(audio.mode)) || !Array.isArray(audio.cues) || audio.cues.length > 20) errors.push('AUDIO: 缺少声音制作方式或有效声轨安排');
  else if (audio.mode === 'silent') {
    errors.push('AUDIO: 当前交付要求必须有声音；无声计划不得用于新序章，须安排原生语音或后期配音');
  } else {
    if (!audio.cues.length) errors.push('AUDIO: 有声版必须写出实际台词，不能只有配乐愿望');
    let end = 0;
    for (const cue of audio.cues) {
      if (!record(cue) || typeof cue.start !== 'number' || typeof cue.end !== 'number' || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < end || cue.end <= cue.start || cue.end > duration || cue.start < 0) { errors.push('AUDIO_TIME: 语句重叠、时间无效或超出影片'); continue; }
      end = cue.end;
      if (!['narration', 'dialogue', 'phone'].includes(String(cue.kind)) || !text(cue.text) || !text(cue.delivery) || !(cue.speakerId === 'narrator' || plan.characters.some(c => c.id === cue.speakerId))) { errors.push('VOICE: 缺少归属/原句/语气，或说话者未声明'); continue; }
      const units = (cue.text.match(/\p{Script=Han}/gu) || []).length + (cue.text.match(/[A-Za-z0-9]+/g) || []).length * 2;
      if (units > (cue.end - cue.start) * 5) errors.push('PACE: 台词明显超出粗估时长，请缩句并实际试读；不是精确语速测量');
    }
  }
  return errors;
}
export function compileProloguePlan(value: unknown, requireStory = false) {
  const errors = requireStory || (record(value) && value.version === 2) ? checkStoryProloguePlan(value) : checkProloguePlan(value);
  if (errors.length) throw new Error(errors.join('\n'));
  const plan = value as ProloguePlan;
  return { title: plan.title, totalSeconds: plan.shots.at(-1)!.end, status: 'plan-only-not-video-reviewed', submissionAuthorized: false,
    story: plan.story, audio: plan.audio,
    reviewRequired: ['实际声画是否支持五项复述', '演员动作与因果连续性', '原生音频/后期配音及真实口读时长', '模型参数与本轮费用授权'],
    shots: plan.shots.map(s => ({ id: s.id, seconds: s.end - s.start,
      prompt: [
        '按已确认前情拍摄一个连贯片段，不追加未来剧情、不生成字幕文字。',
        ...(plan.story ? [`本片主线：${plan.story.throughline}`, plan.story.perspective === 'first-person' ? `固定${plan.story.povCharacterId}眼睛视角，只显露合理的手/持物，不从外部拍体验者。` : '公共外部视角，不提前指定玩家扮演谁。', `本镜改变：${plan.story.beats.find(b => b.shotId === s.id)!.change}`] : []),
        ...s.characterIds.map(cid => { const c = plan.characters.find(c => c.id === cid)!; return `${c.id}：${c.identity}；形象锁定：${c.appearance}`; }),
        `地点：${s.location}。起始：${s.startState}。动作：${s.action}。结束：${s.endState}。承接：${s.continuity || '序章首镜'}。`,
        ...s.evidence.filter(e => e.channel === 'visual').map(e => `必须拍到：${e.detail}`),
        s.id === plan.handoff.shotId ? `到此停止，尚未决定：${plan.handoff.unresolved}。不演出选择结果。` : '',
      ].filter(Boolean).join('\n'),
      overlays: s.evidence.filter(e => e.channel === 'overlay').map(e => e.detail),
    })), handoff: plan.handoff };
}
