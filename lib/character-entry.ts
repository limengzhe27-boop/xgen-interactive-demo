import type { WorldDefinition } from './ai-contracts';
import type { WorldState } from './world-state';

// Old fixed-role works retain their authored restriction. New works use Character.
export function playableCharacters(world: WorldDefinition, fixedRoleId?: string) {
  const roles = world.characters.filter(role => role.playable !== false && (!fixedRoleId || role.id === fixedRoleId));
  return [...roles].sort((a, b) => Number(b.isDefault === true) - Number(a.isDefault === true));
}

export function characterRecap(world: WorldDefinition, roleId: string): string[] {
  const role = world.characters.find(role => role.id === roleId);
  if (!role?.entry || role.entry.storyAnchor === 'story_start') return [];
  // World facts, task descriptions and other characters' secrets are NOT recap sources.
  return [...new Set(role.entry.knownFacts.filter(Boolean))];
}

export function applyCharacterEntry(world: WorldDefinition, roleId: string, state: WorldState): WorldState {
  const role = world.characters.find(role => role.id === roleId);
  if (!role?.entry) return state;
  return { ...state, completedTaskIds: [...role.entry.completedTaskIds],
    committedFacts: [...role.entry.worldFacts],
    knownSecrets: [...new Set([...state.knownSecrets, ...role.entry.knownFacts])],
  };
}

export function validCharacterEntries(world: WorldDefinition): boolean {
  if (world.storyHook !== undefined && (typeof world.storyHook !== 'string' || world.storyHook.length > 240)) return false;
  if (!playableCharacters(world).length) return false;
  if (world.characters.filter(role => role.isDefault).length > 1) return false;
  return world.characters.every(role => {
    if ((role.playable !== undefined && typeof role.playable !== 'boolean') || (role.isDefault !== undefined && typeof role.isDefault !== 'boolean') || (role.isDefault && role.playable === false)) return false;
    const entry = role.entry;
    if (!entry) return true;
    const texts = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 60 && value.every(item => typeof item === 'string' && item.length <= 10000);
    if (typeof entry.storyAnchor !== 'string' || !entry.storyAnchor.trim() || entry.storyAnchor.length > 120 || typeof entry.scene !== 'string' || !entry.scene.trim() || entry.scene.length > 10000
      || !texts(entry.completedTaskIds) || !texts(entry.worldFacts) || !texts(entry.knownFacts)) return false;
    const done = new Set(entry.completedTaskIds);
    return entry.completedTaskIds.every(id => { const task = world.tasks.find(task => task.id === id); return !!task && task.prerequisiteTaskIds.every(id => done.has(id)); });
  });
}

export const CHARACTER_ENTRY_GUIDANCE = `
【作品入口】world.storyHook 是240字内的公开兴趣钩子，不讲后续结果或角色秘密。characters 可设置 playable:false 表示NPC、isDefault:true 表示默认可体验角色（最多一个）；未设置 playable 的旧角色仍可体验。
只有作者明确要求角色从中后段开始时，才给该角色 entry:{storyAnchor:"剧情节点标识",completedTaskIds:[],worldFacts:[],knownFacts:[],scene:"该角色登场时眼前的场景"}。不要使用第几天作为必填入口。completedTaskIds 只列登场之前已经完成的任务且包含前置；worldFacts 是此前真实发生的事件，knownFacts 仅包含该角色此时确实知道的事，不能复制全部世界事实或他人秘密。startLocationId 对应该入口场景。故事开始角色无需 entry。不要为了展示功能凭空编造后续剧情。`;
