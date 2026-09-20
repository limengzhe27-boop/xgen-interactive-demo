import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../components/studio-home.tsx', import.meta.url), 'utf8');
test('personal creation offers a handoff instead of claiming template generation', () => {
  assert.doesNotMatch(page, /createFullWorldDraftFromIdea|createCreatorDocumentFromDraft/);
  const branch = page.slice(page.indexOf("if (triage.intent === 'create_world'"), page.indexOf('const response = await runAI((adapter) => adapter.talkToPersonalAgent'));
  assert.match(branch, /setCreationSuggestion\(value\)/);
  assert.doesNotMatch(branch, /persistStudioSnapshot|setCreatorDocuments/);
});
test('recent drafts use their own cover and portrait count ignores empty values', () => {
  assert.ok(page.includes("cover: doc.data.creatorAssets?.cover || ''"));
  assert.ok(page.includes('draftRoles.filter((_, index) => !!roleImages[`draft-role-${index}`]?.trim()).length'));
});
test('homepage copy names the real actions', () => {
  for (const text of ['你想创作什么故事？', '最近使用', '发现故事', '搜索世界或角色', '暂无封面']) assert.ok(home.includes(text));
  assert.doesNotMatch(home, /未曾经历的人生|搜索世界、角色或心情|全部灵感/);
});
