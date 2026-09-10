import test from 'node:test';
import assert from 'node:assert/strict';
import { validCardHook, characterHook } from '../lib/character-card.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';
import { editorialCopy } from '../lib/home-editorial.ts';
import { publicationWorld } from '../lib/publication.ts';
import { publicationDraft } from '../lib/restore-publication.ts';
import { preserveCreatorDetails } from '../lib/creator-framework.ts';
import { creatorChanges, applyCreatorChange, identifyProposedRoles } from '../lib/creator-changes.ts';

test('author copy including explicit removal wins; legacy cards still use reviewed invitations', () => {
  assert.equal(characterHook('我的版本', '旧文案'), '我的版本');
  assert.equal(characterHook('', '旧文案'), '');
  assert.equal(characterHook(undefined, '旧文案'), '旧文案');
  for (const value of [undefined, '', '试着问一句', '字'.repeat(60)]) assert.equal(validCardHook(value), true);
  for (const value of [null, 5, '字'.repeat(61), '两\n行']) assert.equal(validCardHook(value), false);
});
test('all discoverable built-in character cards have reviewed hooks without using identity fallback', () => {
  for (const w of studioWorlds.filter(w => !w.fixedRoleId)) for (const r of w.world.characters) {
    const hook = characterHook(r.cardHook, editorialCopy(`character:${w.id}:${r.id}`)?.tagline);
    assert.ok(hook, `${w.id}:${r.id}`);
    assert.ok(validCardHook(hook));
    assert.notEqual(hook, r.identity);
  }
});
test('publication and restored author draft preserve hooks and omit unknown private metadata', () => {
  const entry = structuredClone(studioWorlds[0]);
  entry.world.characters[0].cardHook = '这杯酒，先听你怎么说。';
  entry.world.characters[0].privateCardNotes = 'do not publish';
  const published = publicationWorld(entry.world);
  assert.equal(published.characters[0].cardHook, '这杯酒，先听你怎么说。');
  assert.equal(published.characters[0].privateCardNotes, undefined);
  const restored = publicationDraft({ ...entry, world: JSON.parse(JSON.stringify(published)) });
  assert.equal(restored.data.draftRoles[0].cardHook, published.characters[0].cardHook);
  const before = restored.data.creatorDetailBaseline, after = structuredClone(before);
  after.roles[0].cardHook = '';
  const edited = preserveCreatorDetails(published, published, before, after);
  assert.equal(publicationWorld(edited).characters[0].cardHook, '');
  assert.deepEqual(edited.openingScene, published.openingScene);
  assert.deepEqual(edited.characters[0].secrets, published.characters[0].secrets);
  entry.world.characters[0].cardHook = '字'.repeat(61);
  assert.throws(() => publicationWorld(entry.world), /invalid_card_hook/);
});
test('hook proposals apply independently, preserve manual edits and follow roles through reorder', () => {
  const roles = [{ editorId: 'a', name: '甲', identity: '', personality: '', relationship: '', appearance: '', cardHook: '原文案' },
    { editorId: 'b', name: '乙', identity: '', personality: '', relationship: '', appearance: '', cardHook: '' }];
  const reordered = identifyProposedRoles(roles, [{ ...roles[1], cardHook: undefined }, { ...roles[0], cardHook: undefined }]);
  assert.equal(reordered[0].cardHook, ''); assert.equal(reordered[1].cardHook, '原文案');
  const before = { castAndTasks: { roles, tasks: [] } }, after = structuredClone(before);
  after.castAndTasks.roles[0].cardHook = '建议文案';
  const [change] = creatorChanges(before, after, { castAndTasks: '角色任务' });
  assert.equal(change.target.field, 'cardHook');
  const applied = applyCreatorChange(before, change);
  assert.equal(applied.castAndTasks.roles[0].cardHook, '建议文案');
  assert.deepEqual(applyCreatorChange(applied, change, true), before);
  after.castAndTasks.roles[0].cardHook = '后来手写';
  assert.equal(applyCreatorChange(after, change), null);
});
