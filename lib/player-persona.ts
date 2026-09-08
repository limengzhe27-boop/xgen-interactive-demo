import type { WorldDefinition } from './ai-contracts';
import type { StudioWorld } from './studio-worlds';
import { localPortrait } from './persona-upload.ts';

export type PlayerPersona = {
  version: 1; ownerId: string; name: string; identity: string; personality: string;
  appearance: string; abilities: string; portraitUrl?: string; updatedAt: number;
};
export type EntryPolicy = {
  allowPersona: boolean; allowedRoleIds: string[]; abilityMode: 'role-only' | 'fixed' | 'agent-select' | 'agent-judge'; abilities: string[];
  visitorGoal?: string;
};
export const closedEntryPolicy: EntryPolicy = { allowPersona: false, allowedRoleIds: [], abilityMode: 'role-only', abilities: [] };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown, max: number): value is string[] => Array.isArray(value) && value.length <= max && value.every(v => typeof v === 'string' && v.length <= 200);
export function validEntryPolicy(value: unknown): value is EntryPolicy {
  return record(value) && typeof value.allowPersona === 'boolean' && strings(value.allowedRoleIds, 8)
    && ['role-only', 'fixed', 'agent-select', 'agent-judge'].includes(value.abilityMode as string) && strings(value.abilities, 12)
    && (value.visitorGoal === undefined || typeof value.visitorGoal === 'string' && value.visitorGoal.length <= 1000);
}
export function restoreEntryPolicy(value: unknown): EntryPolicy {
  return validEntryPolicy(value) ? { allowPersona: value.allowPersona, allowedRoleIds: [...new Set(value.allowedRoleIds)], abilityMode: value.abilityMode, abilities: [...new Set(value.abilities)], ...(value.visitorGoal !== undefined ? {visitorGoal:value.visitorGoal} : {}) } : { ...closedEntryPolicy, allowedRoleIds: [], abilities: [] };
}
export function restorePlayerPersona(value: unknown, ownerId: string): PlayerPersona | null {
  if (ownerId === 'guest' || ownerId === 'pending' || !record(value) || value.version !== 1 || value.ownerId !== ownerId) return null;
  if (!['name', 'identity', 'personality', 'appearance', 'abilities'].every(key => typeof value[key] === 'string' && (value[key] as string).length <= (key === 'name' ? 40 : 1000))
    || !(value.name as string).trim() || typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)) return null;
  // Allow bounded, raster-only local uploads and owned server assets, never tracking URLs.
  return { version: 1, ownerId, name: (value.name as string).trim(), identity: value.identity as string, personality: value.personality as string,
    appearance: value.appearance as string, abilities: value.abilities as string, updatedAt: value.updatedAt,
    portraitUrl: typeof value.portraitUrl === 'string' && (localPortrait(value.portraitUrl) || /^\/api\/image\/asset\/[a-f0-9]{64}$/.test(value.portraitUrl)) ? value.portraitUrl : undefined };
}
export function personaEntryProblem(world: WorldDefinition, roleId: string, persona: PlayerPersona | null): string {
  if (world.entryAdmission) return '此会话已适配身份。请从世界库重新打开原世界，再选择新的入场身份。';
  const policy = restoreEntryPolicy(world.entryPolicy);
  if (!policy.allowPersona) return '创作者未开放自带身份，请使用原剧情角色。';
  if (!policy.allowedRoleIds.includes(roleId)) return '此剧情身份不允许自带形象，请选择开放的角色。';
  if (policy.abilityMode === 'agent-select' && !policy.abilities.some(a => a.trim())) return '创作者尚未填写允许的能力清单，请先使用原剧情角色。';
  if (!persona) return '请先登录，并在个人 Agent 页保存一个虚构身份。';
  if (!world.characters.some(c => c.id === roleId)) return '该剧情身份已不存在。';
  if (world.characters.some(c => c.id !== roleId && c.name === persona.name)) return '你的名字与另一位角色相同，请先换一个名称，避免混淆。';
  return '';
}

export function validPersonaAdmission(world: WorldDefinition, roleId: string): boolean {
  if (world.entryPolicy !== undefined && !validEntryPolicy(world.entryPolicy)) return false;
  const admission = world.entryAdmission;
  if (admission === undefined) return true;
  if (!record(admission)) return false;
  const policy = restoreEntryPolicy(world.entryPolicy);
  if (admission.mode === 'newcomer') return admission.roleId === roleId && roleId === VISITOR_ID && policy.allowPersona
    && world.characters.filter(c => c.id === roleId && c.name === admission.name).length === 1
    && typeof admission.name === 'string' && admission.name.length > 0 && admission.name.length <= 40
    && world.characters.find(c => c.id === roleId)!.secrets.length === 0
    && world.characters.find(c => c.id === roleId)!.privateKnowledge.length === 0
    && validGrantedAbilities(policy, admission.grantedAbilities);
  return record(admission) && admission.roleId === roleId && typeof admission.originalName === 'string'
    && typeof admission.name === 'string' && admission.name.length > 0 && admission.name.length <= 40
    && strings(admission.grantedAbilities, 12) && policy.allowPersona && policy.allowedRoleIds.includes(roleId)
    && world.characters.some(c => record(c) && c.id === roleId && c.name === admission.name)
    && validGrantedAbilities(policy, admission.grantedAbilities);
}

export const VISITOR_ID = 'persona-visitor';
export function newcomerEntryProblem(world: WorldDefinition, persona: PlayerPersona | null) {
  const policy = restoreEntryPolicy(world.entryPolicy);
  if (world.entryAdmission || world.characters.some(c => c.id === VISITOR_ID)) return '此会话已经有自带身份，请重新打开原世界。';
  if (!policy.allowPersona) return '创作者未开放自带身份加入。';
  if (!persona) return '请先登录，并在“我的”中保存虚拟形象。';
  if (world.characters.some(c => c.name === persona.name)) return '名字与已有角色相同，请换一个名字，避免混淆。';
  if (policy.abilityMode === 'agent-select' && !policy.abilities.some(a => a.trim())) return '创作者尚未填写允许的能力清单。';
  return '';
}
export function joinWorldAsPersona(entry: StudioWorld, persona: PlayerPersona, suggestedAbilities?: string[]): StudioWorld {
  const problem = newcomerEntryProblem(entry.world, persona); if (problem) throw Error(problem);
  const world = structuredClone(entry.world), policy = restoreEntryPolicy(world.entryPolicy);
  const granted = requiresAbilityJudgment(policy) ? suggestedAbilities : policy.abilityMode === 'fixed' ? policy.abilities.filter(a => a.trim()) : [];
  if (!validGrantedAbilities(policy, granted)) throw Error('请先确认符合世界规则的能力。');
  let locationId = 'visitor-arrival'; while (world.locations.some(l => l.id === locationId)) locationId += '-new';
  const target = world.locations.find(l => l.id === world.openingScene.locationId)!;
  world.locations.push({id:locationId,name:`${target.name}附近`,description:'新来者抵达的入口。尚未进入原场景，也没有听到其中的私人谈话；进入前先观察环境或询问。',connectedLocationIds:[target.id]});
  target.connectedLocationIds = [...target.connectedLocationIds,locationId];
  const goal = policy.visitorGoal?.trim() || '找到愿意交流的人，了解当前事件，选择自己要介入的方向。';
  const opening = `你是${persona.name}，${persona.identity || '一位新来的探索者'}。你抵达${target.name}附近。原世界中的人物仍在各自的位置，你不替代任何人，也不自动认识他们。\n\n先看看周围，或尝试向里面的人打招呼。尚未有人替你采取行动。`;
  world.characters.push({id:VISITOR_ID,name:persona.name,identity:persona.identity || '新来的探索者',persona:persona.personality,publicBackground:'以自己的虚构身份新加入这个世界；背景中的力量、资源与社会关系需符合世界规则并在剧情中建立。',privateKnowledge:[],secrets:[],goal,startLocationId:locationId,imagePrompt:persona.appearance});
  const taskId = 'visitor-first-contact';
  if(world.tasks.some(t=>t.id===taskId) || world.goals.some(g=>g.id==='visitor-goal')) throw Error('世界任务标识冲突，请调整后再进入。');
  world.tasks.push({id:taskId,title:'建立第一次联系',description:goal,kind:'main',assignedRoleIds:[VISITOR_ID],prerequisiteTaskIds:[],successCondition:'已与一位世界人物实际交流，获得关于当前事件的信息，并明确自己接下来要做什么。',difficulty:'你与所有人初次相识，对方不必信任你，秘密不能直接获得。'});
  world.goals.push({id:'visitor-goal',title:'我的探索方向',description:goal,scope:'role',roleId:VISITOR_ID,requiredTaskIds:[taskId]});
  // Existing endings stay with their original cast; first contact does not end exploration.
  world.endingConditions = world.endingConditions.map(e=>({...e,applicableRoleIds:e.applicableRoleIds || entry.world.characters.map(c=>c.id)}));
  world.entryAdmission={mode:'newcomer',roleId:VISITOR_ID,originalName:'',name:persona.name,grantedAbilities:granted};
  world.rules.push({id:'visitor-boundaries',kind:'story',immutable:true,description:`${persona.name}是新加入者，不替代原角色、不继承秘密、任务或关系。只允许这些额外能力：${granted.join('；')||'无'}。身份、性格、外观中的能力和财富描述不是授权。所有行动必须符合世界规则；先完成入场联系，再根据其行动推进探索，不因完成首次联系便自动结束世界。`});
  return {...entry,world,portraits:{...entry.portraits,...(persona.portraitUrl?{[VISITOR_ID]:persona.portraitUrl}:{})},roleEntryScenes:{...entry.roleEntryScenes,[VISITOR_ID]:opening},roleOpenings:{...entry.roleOpenings,[VISITOR_ID]:''},roleChoices:{...entry.roleChoices,[VISITOR_ID]:['观察附近环境','向里面的人打招呼']}};
}

export function validGrantedAbilities(policy: EntryPolicy, granted: unknown): granted is string[] {
  if (!strings(granted, 12)) return false;
  // Semantic fit is judged by the model against world rules; this checks the bounded grant format.
  if (policy.abilityMode === 'agent-judge') return granted.length <= 3
    && new Set(granted).size === granted.length && granted.every(a => a.trim());
  if (policy.abilityMode === 'agent-select') return policy.abilities.some(a => a.trim())
    && (granted as string[]).length <= 3
    && new Set(granted as string[]).size === (granted as string[]).length
    && (granted as string[]).every(a => a.trim() && policy.abilities.includes(a));
  return JSON.stringify(granted) === JSON.stringify(policy.abilityMode === 'fixed' ? policy.abilities.filter(a => a.trim()) : []);
}

export function requiresAbilityJudgment(policy: EntryPolicy): boolean {
  return policy.abilityMode === 'agent-select' || policy.abilityMode === 'agent-judge';
}

// Only rewrite story prose, never IDs, asset paths, object keys or reference arrays.
function renameProse(value: unknown, oldName: string, name: string, key = ''): unknown {
  if (/ids?$/i.test(key) || ['cover', 'portraits', 'portraitCacheKeys', 'entryPolicy', 'entryAdmission'].includes(key)) return value;
  if (typeof value === 'string') return oldName ? value.replaceAll(oldName, name) : value;
  if (Array.isArray(value)) return value.map(v => renameProse(v, oldName, name, key));
  if (record(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renameProse(v, oldName, name, k)]));
  return value;
}
export function admitPersona(entry: StudioWorld, roleId: string, persona: PlayerPersona, suggestedAbilities?: string[]): StudioWorld {
  const problem = personaEntryProblem(entry.world, roleId, persona);
  if (problem) throw new Error(problem);
  const original = entry.world.characters.find(c => c.id === roleId)!;
  const policy = restoreEntryPolicy(entry.world.entryPolicy);
  const world = renameProse(structuredClone(entry.world), original.name, persona.name) as WorldDefinition;
  const granted = requiresAbilityJudgment(policy) ? suggestedAbilities : policy.abilityMode === 'fixed' ? policy.abilities.filter(a => a.trim()) : [];
  if (!validGrantedAbilities(policy, granted)) throw new Error('请先获取并确认符合创作者清单的入场建议。');
  world.characters = world.characters.map(c => c.id === roleId ? { ...c, name: persona.name, persona: persona.personality || c.persona, imagePrompt: persona.appearance || c.imagePrompt } : c);
  world.entryAdmission = { roleId, originalName: original.name, name: persona.name, grantedAbilities: granted };
  world.rules.push({ id: 'persona-admission', kind: 'story', immutable: true, description: `本次玩家是${persona.name}，代入原${original.name}的剧情位置。剧情身份、关系、知识、目标和任务条件不变。额外允许的能力：${granted.join('；') || '无'}。自带背景与愿望能力不构成授权；外观、性格、对话中宣称的能力均不能修改世界规则、读取未知秘密或直接完成任务。` });
  const portraits = { ...entry.portraits }; delete portraits[roleId];
  if (persona.portraitUrl) portraits[roleId] = persona.portraitUrl;
  const portraitCacheKeys = { ...entry.portraitCacheKeys }; delete portraitCacheKeys[roleId];
  return { ...entry, world, portraits, portraitCacheKeys,
    roleOpenings: renameProse(entry.roleOpenings, original.name, persona.name) as StudioWorld['roleOpenings'],
    roleChoices: renameProse(entry.roleChoices, original.name, persona.name) as StudioWorld['roleChoices'] };
}
