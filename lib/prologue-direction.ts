import { checkStoryProloguePlan, compileProloguePlan, type ProloguePlan } from './prologue-plan.ts';

/** Offline directing layer. Declared timing is an editorial target, not a model capability. */
export type ShotDirection = {
  shotId: string;
  layout: string;
  firstFrame: string;
  camera: string;
  beats: { start: number; end: number; blocking: string; camera: string; change: string }[];
  lastFrame: string;
  avoid: string;
  referenceRequirements: string;
  risk: string;
  sound: { start: number; end: number; description: string }[];
};
export type PrologueDirection = { version: 1; shots: ShotDirection[] };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const filled = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 4000;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function checkPrologueDirection(plan: unknown, direction: unknown): string[] {
  const errors = checkStoryProloguePlan(plan);
  if (errors.length) return errors;
  if (!object(direction) || direction.version !== 1 || !Array.isArray(direction.shots)) return ['DIRECTION: 需要v1逐镜表演层'];
  const shots = (plan as ProloguePlan).shots;
  if (direction.shots.length !== shots.length) errors.push('DIRECTION: 每镜都需要表演层，不能只细化开头');
  for (const [i, shot] of shots.entries()) {
    const d = direction.shots[i], duration = shot.end - shot.start;
    if (!object(d) || d.shotId !== shot.id) { errors.push(`DIRECTION: 第${i + 1}镜缺失或顺序不匹配`); continue; }
    for (const key of ['layout', 'firstFrame', 'camera', 'lastFrame', 'avoid', 'referenceRequirements', 'risk']) {
      if (!filled(d[key])) errors.push(`DIRECTION_FIELD: ${shot.id}缺少${key}`);
    }
    if (!Array.isArray(d.beats) || !d.beats.length || d.beats.length > 8) errors.push(`BEATS: ${shot.id}需要1至8个有意义的表演节拍，不按字数评分`);
    else {
      let cursor = 0;
      for (const beat of d.beats) {
        if (!object(beat)) { errors.push(`BEATS: ${shot.id}无效节拍`); continue; }
        if (!finite(beat.start) || !finite(beat.end) || Math.abs(beat.start - cursor) > 0.001 || beat.end <= beat.start || beat.end > duration) {
          errors.push(`BEAT_TIME: ${shot.id}节拍须以本镜0秒起算，连续、不重叠且不超长`);
        }
        if (finite(beat.end)) cursor = beat.end;
        if (!['blocking', 'camera', 'change'].every(k => filled(beat[k]))) errors.push(`BEAT_ACTION: ${shot.id}须写表演、镜头响应与可见变化；静止也要说明等待什么`);
      }
      if (Math.abs(cursor - duration) > 0.001) errors.push(`BEAT_TIME: ${shot.id}节拍没有覆盖到末帧`);
    }
    if (!Array.isArray(d.sound) || !d.sound.length || d.sound.length > 12) errors.push(`SOUND: ${shot.id}需声明环境声/动作声，不替代主计划对白`);
    else for (const cue of d.sound) {
      // Beds may overlap effects and dialogue. Speech overlap is checked by the story validator.
      if (!object(cue) || !finite(cue.start) || !finite(cue.end) || cue.start < 0 || cue.end <= cue.start || cue.end > duration || !filled(cue.description)) {
        errors.push(`SOUND_TIME: ${shot.id}环境/动作声时间无效`);
      }
    }
  }
  return errors;
}

export function compileDirectedProloguePlan(value: unknown, direction: unknown) {
  const errors = checkPrologueDirection(value, direction);
  if (errors.length) throw new Error(errors.join('\n'));
  const plan = value as ProloguePlan, detail = direction as PrologueDirection;
  const base = compileProloguePlan(plan, true);
  const viewpoint = plan.story!.perspective === 'first-person'
    ? `固定${plan.characters.find(c => c.id === plan.story!.povCharacterId)!.identity}的眼睛视角；不从外部拍体验者。`
    : '保持公共外部视角，不预先替玩家选角色。';
  return {
    ...base,
    directionVersion: 1,
    timingIsEditorialTarget: true,
    modelCapabilityVerified: false,
    referencesVerified: false,
    reviewRequired: [...base.reviewRequired, '首帧是否容纳动作与运镜、参考人物是否可辨', '逐节拍实际动作与尾态，不以字数或音轨存在判通过'],
    shots: plan.shots.map((shot, i) => {
      const d = detail.shots[i];
      const common = [viewpoint, `首态：${d.firstFrame}`, `镜头原则：${d.camera}`];
      const ending = [
        `尾态：${d.lastFrame}`, `避免：${d.avoid}`,
        '正常速度，有动机的停顿保留；不循环动作、不用慢动作拉满时长。不生成可读文字。',
        ...(shot.id === plan.handoff.shotId ? [`保留未决现场：${plan.handoff.unresolved}；不演出选择结果。`] : []),
      ];
      // Editorial explanation stays in directorTimeline; the model gets actions, not review prose.
      const ordered = d.beats.map((b, index) => `${index + 1}. ${b.blocking} 镜头：${b.camera}`);
      const motion = [...common, ...ordered, ...ending].join('\n');
      return {
        id: shot.id, seconds: shot.end - shot.start,
        // Complete visual variant for T2V; not a claim of support by any provider.
        textToVideoPrompt: [
          `地点：${shot.location}。空间：${d.layout}`,
          ...shot.characterIds.map(id => { const c = plan.characters.find(c => c.id === id)!; return `${c.identity}；${c.appearance}`; }),
          motion,
        ].join('\n'),
        // Only use after checking the supplied first frame against referenceRequirements.
        imageToVideoMotionPrompt: motion,
        directorTimeline: d.beats.map(b => ({ ...b, globalStart: shot.start + b.start, globalEnd: shot.start + b.end })),
        firstFrame: d.firstFrame, lastFrame: d.lastFrame, layout: d.layout,
        referenceRequirements: d.referenceRequirements, risk: d.risk,
        sound: d.sound.map(s => ({ ...s, globalStart: shot.start + s.start, globalEnd: shot.start + s.end })),
        spokenCues: plan.audio!.cues.filter(c => c.start < shot.end && c.end > shot.start),
        audioInstruction: plan.audio!.mode === 'post'
          ? '对白按全片时间单独配音，保留跨镜句连续；与本镜环境声后期混音。不要把这段说明当台词。'
          : '原生声音尚需核实模型能力；按全片时间和说话者安排，不把环境声当作已完成对白。',
        overlays: base.shots[i].overlays,
      };
    }),
  };
}
