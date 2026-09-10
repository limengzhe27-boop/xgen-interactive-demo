import { compileNativeDirectedPrologue } from './prologue-direction.ts';

export const PROLOGUE_AGENT_VERSION = 'native-story-camera-2';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null;

/** Explicit public production brief only. Never forward the full world or companion memories. */
export function readPrologueAgentInput(value: unknown) {
  if (!object(value)) return null;
  const title = text(value.title, 200), publicStory = text(value.publicStory, 8000);
  const openingState = text(value.openingState, 3000), constraints = text(value.constraints, 4000);
  if (!title || !publicStory || !openingState || !constraints || !Array.isArray(value.characters) || !value.characters.length || value.characters.length > 12) return null;
  const characters = value.characters.map(v => object(v) ? {
    id: text(v.id, 80), identity: text(v.identity, 400), appearance: text(v.appearance, 1500),
  } : null);
  if (characters.some(c => !c?.id || !c.identity || !c.appearance)) return null;
  if (new Set(characters.map(c => c!.id)).size !== characters.length) return null;
  if (value.perspective !== 'external' && value.perspective !== 'first-person') return null;
  const povCharacterId = value.perspective === 'first-person' ? text(value.povCharacterId, 80) : undefined;
  if (value.perspective === 'first-person' && !characters.some(c => c!.id === povCharacterId)) return null;
  return { title, publicStory, openingState, constraints, characters, perspective: value.perspective,
    ...(povCharacterId ? { povCharacterId } : {}) };
}

export const prologueAgentInstructions = `【序章导演 ${PROLOGUE_AGENT_VERSION}】
只使用输入的已确认公开剧情。先锁定角色、视角、能力剩余次数、未作出的选择与openingState。不能为刺激添加已解决的救人、毁剑、签约、恋爱承诺或未来秘密。若原前情不足以形成事件，返回 {"needsRevision":true,"reason":"具体缺少的剧情证据"}，不制造已发生事实。
先拍一场有因果的戏，再拆模型片段：前3秒出现正在发生的矛盾，主体动作有目标、阻力、可见后果，尾帧与互动开场一致。身份可由短对白补充；主要事件必须真的在画面发生，不用人像慢推、反复递物或环境空镜替代，不靠旁白解释未拍到的动作。
默认20—25秒，最多30秒；每个独立生成片段4—15秒，每段承载一个主要变化，不把跑出、扑倒、拖走、救人、解锁、逃跑都塞入同一段。节拍细到动作起点、目标、阻力、反应和落点，不按提示字数判断质量。固定第一人称只从该角色眼睛看，不切拍其脸或背影。参考肖像只能锁定身份；首帧应容纳主要事件，不能以肖像直接替代动作首帧。
原生音画同步：audio.mode必须native；逐句指定说话者、原句、语气、时间与现场声源，环境/动作声单列。不得使用后期配音、TTS或音乐冒充原生对白；不依赖字幕完成叙事。台词不能跨模型片段边界。全片声音与画面分别验收，查到音轨不等于对白清楚。
输出 {"plan":{version:2,title,characters:[{id,identity,appearance}],facts:[{id,description,channel:"visual|overlay"}],shots:[{id,start,end,characterIds,location,startState,action,endState,continuity,evidence:[{factId,channel:"visual|overlay",detail}]}],handoff:{shotId,unresolved,choices:["尚未执行的选择","另一选择"]},story:{throughline,perspective:"external|first-person",povCharacterId:"第一人称才填",beats:[{shotId,cause,change}],recall:[{topic:"who|relationship|event|pressure|handoff",answer,factIds}]},audio:{mode:"native",cues:[{start,end,speakerId,kind:"dialogue|phone|narration",text,delivery}]}},"direction":{version:1,shots:[{shotId,layout,firstFrame,camera,beats:[{start,end,blocking,camera,change}],lastFrame,avoid,referenceRequirements,risk,sound:[{start,end,description}]}]}}。
这是字段说明，实际必须返回合法JSON，枚举每处只选一个值。recall须覆盖五种topic；所有引用有效。plan时间为全片秒数连续覆盖，direction时间为本段从0起连续覆盖。characters只使用输入同名同外观角色。返回完整细化方案，不声称生成了视频。计划将先被校验，随后仍需人物/音画/宏观事件/终态的成片验收；任何关键项失败不能自动发布或盲目重试。`;

export function readPrologueAgentReply(value: unknown, input: NonNullable<ReturnType<typeof readPrologueAgentInput>>) {
  if (!object(value)) return null;
  if (value.needsRevision === true) {
    const reason = text(value.reason, 2000);
    return reason ? { needsRevision: true as const, reason } : null;
  }
  try {
    const compiled = compileNativeDirectedPrologue(value.plan, value.direction);
    const plan = value.plan as { characters: {id: string; identity: string; appearance: string}[]; story: {perspective: string; povCharacterId?: string} };
    if (plan.story.perspective !== input.perspective || plan.story.povCharacterId !== input.povCharacterId) return null;
    if (plan.characters.some(c => !input.characters.some(original => original?.id === c.id && original.identity === c.identity && original.appearance === c.appearance))) return null;
    if (compiled.shots.some(s => s.seconds < 4 || s.seconds > 15)) return null;
    return { plan: value.plan, direction: value.direction, compiled,
      skillVersion: PROLOGUE_AGENT_VERSION, status: 'plan-only-awaiting-review' as const,
      videoGenerated: false, autoPublishAllowed: false };
  } catch { return null; }
}
