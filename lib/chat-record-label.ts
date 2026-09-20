// The neutral chat participant is not an authored identity to advertise.
export function chatRecordSubtitle(name: string | undefined, worldTitle: string): string {
  const identity = name?.trim();
  const label = identity && identity !== '你' ? `扮演：${identity}` : '自由对话';
  return [label, worldTitle.trim()].filter(Boolean).join(' · ');
}
