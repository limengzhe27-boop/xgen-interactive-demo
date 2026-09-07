export type UserProfile = { introduction: string; preferences: string; communication: string };
export const emptyProfile: UserProfile = { introduction: '', preferences: '', communication: '' };
export function restoreUserProfile(value: unknown): UserProfile {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.keys(emptyProfile).map(key => [key, typeof source[key] === 'string' ? source[key].slice(0, 600) : ''])) as UserProfile;
}
export function profileMemories(profile: UserProfile): string[] {
  return [profile.introduction && `用户当前填写的自我介绍：${profile.introduction}`,
    profile.preferences && `用户当前填写的偏好：${profile.preferences}`,
    profile.communication && `用户希望助手这样交流：${profile.communication}`].filter(Boolean) as string[];
}
