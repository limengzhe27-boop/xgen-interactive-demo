import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
test('creator transcript append and restore paths never truncate visible history', () => {
  const setters = source.split('\n').filter(line => line.includes('setCreatorMessages('));
  assert.ok(setters.length > 10);
  for (const line of setters) assert.doesNotMatch(line, /\.slice\(/, line);
  assert.doesNotMatch(source, /setCreatorMessages\(conversation\)/);
  assert.match(source, /setCreatorMessages\(current => \[\.\.\.current, userEntry\]\)/);
  assert.match(source, /creatorMessages\.map\(/);
});
test('model context remains bounded independently of persisted transcript', () => {
  assert.match(source, /const conversation = \[\.\.\.creatorMessages, userEntry\]\.slice\(-10\)/);
  assert.match(source, /setCreatorMessages\(data\.creatorMessages \?\? \[\]\)/);
});
