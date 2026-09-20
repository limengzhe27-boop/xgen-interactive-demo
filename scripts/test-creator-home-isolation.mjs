import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('homepage ideas never populate a template or inherit the previous world', () => {
  const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const start = source.slice(source.indexOf('  function newCreator('), source.indexOf('  function editCreator('));
  assert.doesNotMatch(start, /createFullWorldDraftFromIdea|buildWorldDefinitionFromDraft|已根据你的想法构思好/);
  for (const reset of ['cancelCreatorRequest()', 'setWorldSeed(trimmedSeed)', 'setGeneratedWorld(null)', 'setGenerated(false)', 'setCreatorBrief(emptyCreatorBrief)', 'setGeneratedStoryOutline([])', 'setCreatorProposal(null)', 'setCreatorDetailBaseline(null)', 'setCreatorAssets(undefined)', 'setRoleImages({})', 'setCompanionContext(restoreCompanionContext(context))', 'setReleasedEntry(undefined)', 'setContinuation(undefined)']) {
    assert.ok(start.includes(reset), reset);
  }
  assert.ok(start.includes("role: 'creator', content: trimmedSeed"));
  assert.ok(start.includes("name: '', identity: '', personality: ''"));
  assert.ok(start.includes('upsertById(current, { id: draftId'));
});
