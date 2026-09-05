export const GUEST_SCOPE = 'guest';
export function accountStorageKey(base: string, account: string) {
  if (account === GUEST_SCOPE) return base;
  if (!/^[a-f0-9-]{36}$/i.test(account)) throw new Error('invalid_account_scope');
  return `${base}:account:${account}`;
}
