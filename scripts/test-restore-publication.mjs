import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationDraft } from '../lib/restore-publication.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';
test('publication restoration retains fiction and pictures without inventing private history', () => {
  for (const entry of studioWorlds) {
    const original = JSON.stringify(entry);
    const draft = publicationDraft({ ...entry, sourceId: 'original-draft', memories: ['PRIVATE_MARKER'] });
    assert.equal(draft.id, 'original-draft');
    assert.deepEqual(draft.data.generatedWorld, entry.world);
    assert.deepEqual(draft.data.creatorAssets.portraits, entry.portraits);
    assert.equal(draft.data.creatorAssets.cover, entry.cover);
    assert.equal(draft.data.draftRoles.length,entry.world.characters.length);
    assert.deepEqual(draft.data.creatorBrief.tasks,entry.world.tasks);
    assert.ok(!JSON.stringify(draft).includes('PRIVATE_MARKER'));
    assert.equal(draft.data.creatorMessages.length,1);
    draft.data.generatedWorld.title='edited';
    assert.equal(JSON.stringify(entry),original);
  }
});
test('legacy publications without source IDs use their publication ID', () => {
  const entry={...studioWorlds[0],id:'community-'+ 'a'.repeat(64)};
  assert.equal(publicationDraft(entry).id,entry.id);
});
