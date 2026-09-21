/** An explicit blank public field stays blank; never replace it with internal story text. */
export function publicSynopsis(value: string | undefined, legacyPublicText = ''): string {
  return (value === undefined ? legacyPublicText : value).trim();
}

export function publicRoleIntroduction(value: string | undefined, legacyPublicText = ''): string {
  return (value === undefined ? legacyPublicText : value).trim();
}
