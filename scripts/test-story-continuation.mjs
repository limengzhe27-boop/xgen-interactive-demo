import test from 'node:test';
import assert from 'node:assert/strict';
import { appendStory, continuationSummary } from '../lib/story-continuation.ts';
import { publicationWorld } from '../lib/publication.ts';
import { publicationDraft, historicalPublicationDraft } from '../lib/restore-publication.ts';
import { restoreCreatorSession } from '../lib/creator-session.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';
import { playableCharacters } from '../lib/character-entry.ts';

const base = publicationWorld(studioWorlds[0].world);
test('a new playable character can be appended without inventing extra tasks',()=>{
 const next=structuredClone(base);
 next.characters.push({...next.characters[0],id:'new-visitor',name:'新访客',isDefault:false,playable:true});
 const result=appendStory(base,next);
 assert.deepEqual(result.tasks,base.tasks);
 assert.ok(playableCharacters(result).some(c=>c.id==='new-visitor'));
 assert.deepEqual(result.characters.slice(0,base.characters.length),base.characters);
});
test('historical published revision restores independently without overwriting source or exposing old chat', () => {
  const original = { ...structuredClone(studioWorlds[0]), sourceId: 'current-draft' };
  const snapshot = structuredClone(original);
  const draft = historicalPublicationDraft(original, 2, 'separate-draft');
  assert.deepEqual(original, snapshot);
  assert.equal(draft.id, 'separate-draft');
  assert.equal(draft.data.generatedWorld.id, 'separate-draft');
  assert.equal(draft.data.publishedWorld, false);
  assert.equal(draft.data.releasedEntry, undefined);
  assert.deepEqual(draft.data.releaseHistory, []);
  assert.deepEqual(draft.data.generatedWorld.characters, original.world.characters);
  assert.equal(draft.data.creatorMessages.length, 1);
  assert.match(draft.data.creatorMessages[0].content, /发布版 2/);
});
const proposal = () => {
  const next = structuredClone(base);
  next.tasks.push({ ...next.tasks[0], id: 'sequel-task', title: '后续线索', prerequisiteTaskIds: [next.tasks.at(-1).id] });
  return next;
};
test('append keeps original fiction and does not mutate an existing save snapshot', () => {
  const snapshot = structuredClone(base), next = proposal();
  next.characters[0].persona = '不应覆盖'; next.openingScene.narrative = '不应重开';
  const result = appendStory(base, next);
  assert.deepEqual(base, snapshot);
  assert.deepEqual(result.characters, base.characters);
  assert.deepEqual(result.openingScene, base.openingScene);
  assert.deepEqual(result.tasks.slice(0, base.tasks.length), base.tasks);
  assert.equal(result.tasks.at(-1).id, 'sequel-task');
  assert.deepEqual(appendStory(base, result), result);
  assert.ok(continuationSummary(base, result).includes('剧情：后续线索'));
});
test('invalid continuation cannot replace the original', () => {
  assert.throws(() => appendStory(base, base));
  const next = proposal(); next.tasks.at(-1).prerequisiteTaskIds = ['missing'];
  assert.throws(() => appendStory(base, next));
});
test('pending proposal survives refresh without automatically applying', () => {
  const world = appendStory(base, proposal());
  const storyOutline = publicationDraft({ ...studioWorlds[0], world }).data.generatedStoryOutline;
  const session = restoreCreatorSession(JSON.parse(JSON.stringify({ continuation: { base, draftFingerprint: 'original', proposal: { world, storyOutline, generationNotes: [], unresolvedQuestions: [] } }, input: '继续调整' })));
  assert.deepEqual(session.continuation.base, base);
  assert.equal(session.continuation.proposal.world.tasks.at(-1).id, 'sequel-task');
  assert.equal(session.input, '继续调整');
});
test('restored editor has valid positional role assignments and a separate saved snapshot', () => {
  const entry = { ...studioWorlds[0], world: base };
  const draft = publicationDraft(entry).data;
  assert.ok(draft.creatorBrief.tasks.every(t => t.assignedRoleIds.every(id => /^draft-role-\d+$/.test(id))));
  draft.generatedWorld.title = '未发布草稿';
  assert.equal(draft.releasedEntry.world.title, base.title);
});
