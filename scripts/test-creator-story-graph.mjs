import test from 'node:test';
import assert from 'node:assert/strict';
import { creatorStoryIssues, creatorEntryPaths, remapCreatorStoryRoles, isCreatorStoryGraph, preserveEventIntent } from '../lib/creator-story-graph.ts';
import { creatorChanges, combineCreatorChanges, applyCreatorChange } from '../lib/creator-changes.ts';
import { publicationWorld } from '../lib/publication.ts';
import { publicationDraft } from '../lib/restore-publication.ts';
import { readFileSync } from 'node:fs';

const graph = () => ({ startNodeId: 'start', nodes: [
  ['start', ['left', 'right']], ['left', ['late']], ['right', ['late']], ['late', []],
].map(([id, nextNodeIds]) => ({ id, title: id, location: '书店', scene: '等待决定', worldFacts: [id], nextNodeIds })), entries: [
  { roleId: 'draft-role-0', nodeId: 'start', defaultPath: ['start'], knownFacts: ['收到邀请'], beliefs: ['怀疑有人迟到'], scene: '你站在书店门前。' },
  { roleId: 'draft-role-1', nodeId: 'late', defaultPath: ['start', 'left', 'late'], knownFacts: ['听说读书会暂停'], beliefs: [], scene: '你刚到门口。' },
] });
test('shared DAG supports branching, merge and later role entry without merging histories', () => {
  assert.deepEqual(creatorStoryIssues(graph(), ['draft-role-0','draft-role-1']), []);
  assert.deepEqual(creatorEntryPaths(graph(), 'late'), [['start','left','late'], ['start','right','late']]);
  assert.deepEqual(graph().entries[1].knownFacts, ['听说读书会暂停']);
});
test('missing/oversized/malformed data is bounded and cannot reach graph rendering', () => {
  for (const bad of [null, {}, { nodes: null }, { ...graph(), nodes: Array(10000).fill({}) }, { ...graph(), entries: [null] }, { ...graph(), nodes: [{ ...graph().nodes[0], nextNodeIds: 'late' }] }]) assert.ok(creatorStoryIssues(bad).length);
  assert.deepEqual(creatorStoryIssues(undefined), []);
  assert.equal(isCreatorStoryGraph({ ...graph(), startNodeId: '__proto__' }), true);
  assert.ok(creatorStoryIssues({ ...graph(), startNodeId: '__proto__' }).length);
});
test('duplicate IDs, cycles, unreachable nodes and dangling refs are rejected', () => {
  for (const mutate of [g => g.nodes.push(g.nodes[0]), g => g.nodes[3].nextNodeIds.push('start'), g => g.nodes[0].nextNodeIds.push('missing'), g => g.nodes[0].nextNodeIds.pop(), g => g.entries.push(g.entries[0]), g => g.entries[0].nodeId = 'missing']) {
    const g = graph(); mutate(g); assert.ok(creatorStoryIssues(g).length);
  }
});
test('mutually exclusive histories and missing roles cannot be adopted', () => {
  const g = graph(); g.entries[1].defaultPath = ['start','left','right','late'];
  assert.ok(creatorStoryIssues(g).length);
  assert.ok(creatorStoryIssues(graph(), ['draft-role-0']).length);
});
test('role reorder/deletion follows editor identity, never index inheritance', () => {
  const before = [{ editorId: 'a' }, { editorId: 'b' }];
  const reordered = remapCreatorStoryRoles(graph(), before, [before[1], before[0]]);
  assert.equal(reordered.entries[0].roleId, 'draft-role-1');
  const replaced = remapCreatorStoryRoles(graph(), before, [before[0], { editorId: 'new' }]);
  assert.equal(replaced.entries.length, 1);
  assert.deepEqual(replaced.nodes, graph().nodes);
});
test('edited suggestion is adopted and undo/JSON round trip preserve graph exactly', () => {
  const before = { title: '原名', storyGraph: undefined };
  const changes = creatorChanges(before, { ...before, storyGraph: graph() }, { storyGraph: '画布' });
  changes[0].after.entries[1].scene = '用户修改后的入场';
  const combined = combineCreatorChanges(before, changes, true);
  const accepted = applyCreatorChange(before, combined);
  assert.equal(accepted.storyGraph.entries[1].scene, '用户修改后的入场');
  assert.deepEqual(JSON.parse(JSON.stringify(accepted)).storyGraph, changes[0].after);
  assert.deepEqual(applyCreatorChange(accepted, combined, true), before);
});
test('publication whitelist retains only graph fields and restore rebases role IDs', () => {
  // Use a repository fixture, never create or publish a real user's world.
  const source = JSON.parse(readFileSync(new URL('../scripts/fixtures/creator-story-world.json', import.meta.url), 'utf8'));
  const g = graph(); g.entries[0].roleId = 'person-a'; g.entries[1].roleId = 'person-b';
  g.nodes[1].trigger = '有人质疑邀请函';
  g.nodes[1].eventIntent = 'key_event';
  g.nodes[1].possibilities = [{ actor: '来访者', action: '公开邀请函', consequence: '获得解释，也暴露自己的来意', condition: '来访者愿意公开' }];
  g.privateChat = 'must not be public';
  const world = publicationWorld({ ...source, storyGraph: g });
  assert.equal(world.storyGraph.privateChat, undefined);
  assert.deepEqual(world.storyGraph.nodes[1].possibilities, g.nodes[1].possibilities);
  const restored = publicationDraft({ id: 'test-world', title: world.title, genre: '', premise: world.premise, cover: '', portraits: {}, world });
  assert.deepEqual(restored.data.creatorBrief.storyGraph.entries.map(e => e.roleId), ['draft-role-0', 'draft-role-1']);
  assert.deepEqual(restored.data.creatorBrief.storyGraph.nodes[1], { ...g.nodes[1], possibilities: g.nodes[1].possibilities.map(p => ({ ...p, roleId: null })) });
});
test('event possibilities remain optional and bounded without changing entry or facts', () => {
  const g = graph();
  assert.equal(isCreatorStoryGraph(g), true);
  const entries = structuredClone(g.entries), facts = structuredClone(g.nodes[0].worldFacts);
  g.nodes[0].possibilities = [{ actor: '', action: '', consequence: '' }];
  g.nodes[0].trigger = '';
  assert.equal(isCreatorStoryGraph(g), true);
  assert.deepEqual(g.entries, entries);
  assert.deepEqual(g.nodes[0].worldFacts, facts);
  g.nodes[0].possibilities = Array(7).fill({ actor: '', action: '', consequence: '' });
  assert.equal(isCreatorStoryGraph(g), false);
  g.nodes[0].possibilities = [{ actor: '来访者', action: {}, consequence: '' }];
  assert.equal(isCreatorStoryGraph(g), false);
});
test('model cannot promote possible events or erase author key-event intent', () => {
  const base = graph(); base.nodes[1].eventIntent = 'key_event';
  const proposed = graph(); proposed.nodes[0].eventIntent = 'key_event'; proposed.nodes[1].eventIntent = 'possible';
  const safe = preserveEventIntent(proposed, base);
  assert.equal(safe.nodes[0].eventIntent, undefined);
  assert.equal(safe.nodes[1].eventIntent, 'key_event');
  assert.equal(preserveEventIntent(proposed).nodes[0].eventIntent, undefined);
  assert.deepEqual(safe.entries, base.entries);
  assert.deepEqual(safe.nodes[0].worldFacts, base.nodes[0].worldFacts);
  proposed.nodes[0].eventIntent = 'always_random';
  assert.equal(isCreatorStoryGraph(proposed), false);
});
