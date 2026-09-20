import assert from 'node:assert/strict';
import { triagePersonalAgentMessage } from '../lib/typesafe-personal-triage.ts';
import {
  createFullWorldDraftFromIdea,
  buildWorldDefinitionFromDraft,
  createCreatorDocumentFromDraft,
} from '../lib/personal-world-generator.ts';

console.log('--- Testing Phase 2: Personal Agent World Generation Quality & Bridge ---');

// 1. Test triagePersonalAgentMessage
console.log('1. Testing triagePersonalAgentMessage intent & readiness...');

const chatTriage = await triagePersonalAgentMessage({
  userMessage: '今天有点累，先陪我聊聊，别急着给建议。',
});
assert.equal(chatTriage.intent, 'casual_chat', 'Expected casual chat intent');
assert.equal(chatTriage.creationReadiness, 'none', 'Expected no creation readiness');
assert.equal(chatTriage.shouldSuggestCreation, false, 'Should not suggest creation');

const browseTriage = await triagePersonalAgentMessage({
  userMessage: '有什么好看的故事，给我推荐几个？',
});
assert.equal(browseTriage.intent, 'browse_stories', 'Expected browse stories intent');

const creationTriage = await triagePersonalAgentMessage({
  userMessage: '想和你构思一个争家产的世界，还没想好人物。',
});
assert.equal(creationTriage.intent, 'create_world', 'Expected create_world intent');
assert.equal(creationTriage.creationReadiness, 'ready', 'Expected ready creation readiness');
assert.equal(creationTriage.targetGenre, '家族商战', 'Expected family estate genre');
assert.equal(creationTriage.shouldSuggestCreation, true, 'Should suggest creation');

const xianxiaTriage = await triagePersonalAgentMessage({
  userMessage: '帮我创建一个仙侠世界，宗门里有人偷了镇派之宝',
});
assert.equal(xianxiaTriage.intent, 'create_world', 'Expected create_world intent');
assert.equal(xianxiaTriage.creationReadiness, 'ready', 'Expected ready creation readiness');
assert.equal(xianxiaTriage.targetGenre, '仙侠悬疑', 'Expected xianxia genre');

console.log('✓ triagePersonalAgentMessage tests passed.');

// 2. Test createFullWorldDraftFromIdea
console.log('2. Testing createFullWorldDraftFromIdea quality & structure...');

const seed = '想和你构思一个争家产的世界，还没想好人物。';
const draft = createFullWorldDraftFromIdea(seed);

assert(draft.id && draft.id.startsWith('draft-'), 'Draft should have a valid ID');
assert(draft.worldTitle && draft.worldTitle.length > 0, 'Draft must have a title');
console.log(`  Draft Title: 《${draft.worldTitle}》`);

// Check premise length >= 200 chars
assert(
  draft.worldSeed.length >= 200,
  `Draft premise must be >= 200 chars, got ${draft.worldSeed.length} chars`
);
console.log(`  Premise Length: ${draft.worldSeed.length} chars (>= 200 check passed)`);

// Check characters: 3 characters, at least one playable and at least one NPC
assert.equal(draft.draftRoles.length, 3, 'Must have exactly 3 characters');
const playableRoles = draft.draftRoles.filter((r) => r.playable);
const npcRoles = draft.draftRoles.filter((r) => !r.playable);
assert.equal(playableRoles.length, 2, 'Must have 2 playable perspective roles');
assert.equal(npcRoles.length, 1, 'Must have 1 clear NPC role');
assert(npcRoles[0].name.includes('林叔') || npcRoles[0].identity.includes('NPC'), 'NPC must be clearly identified');
console.log(`  Playable Roles: ${playableRoles.map((r) => r.name).join(', ')}`);
console.log(`  NPC Role: ${npcRoles[0].name} (${npcRoles[0].identity})`);

// Check Story Graph DAG
const graph = draft.creatorBrief.storyGraph;
assert(graph, 'Story graph must be present');
assert.equal(graph.nodes.length, 3, 'Story graph must have 3 nodes');
assert.equal(graph.startNodeId, 'node_opening', 'Start node must be node_opening');
const startNode = graph.nodes.find((n) => n.id === graph.startNodeId);
assert(startNode.nextNodeIds.length >= 2, 'Opening node must branch to next nodes');
assert(graph.entries.length >= 2, 'Graph must provide role entries');
console.log(`  Story Graph DAG: ${graph.nodes.map((n) => n.title).join(' -> ')}`);

// Check Tasks & Prerequisites
const tasks = draft.creatorBrief.tasks;
assert(tasks.length >= 2, 'Must have at least 2 core tasks');
assert(tasks[0].prerequisiteTaskIds.length === 0, 'First task has no prerequisites');
assert(tasks[1].prerequisiteTaskIds.includes(tasks[0].id), 'Second task depends on first task');
console.log(`  Main Tasks: ${tasks.map((t) => t.title).join(' -> ')}`);

// Check Story Outline Beats
assert.equal(draft.generatedStoryOutline.length, 3, 'Must have 3 outline beats');
console.log('✓ createFullWorldDraftFromIdea quality tests passed.');

// 3. Test buildWorldDefinitionFromDraft
console.log('3. Testing buildWorldDefinitionFromDraft...');
const worldDef = buildWorldDefinitionFromDraft(draft);

assert.equal(worldDef.id, draft.id, 'WorldDefinition id should match draft id');
assert.equal(worldDef.characters.length, 3, 'WorldDefinition should have 3 characters');
assert.equal(worldDef.characters.filter((c) => c.playable).length, 2, 'Should preserve 2 playable characters');
assert.equal(worldDef.characters.filter((c) => !c.playable).length, 1, 'Should preserve 1 NPC character');
assert(worldDef.openingScene.choices.length >= 2, 'Opening scene should have choices');
assert.equal(worldDef.goals.length, 2, 'Goals should be populated');
assert.equal(worldDef.endingConditions.length, 2, 'Ending conditions should be populated');
console.log('✓ buildWorldDefinitionFromDraft tests passed.');

// 4. Test createCreatorDocumentFromDraft
console.log('4. Testing createCreatorDocumentFromDraft & creator workspace compatibility...');
const doc = createCreatorDocumentFromDraft(draft);

assert.equal(doc.id, draft.id, 'Doc id should match');
assert.equal(doc.data.worldTitle, draft.worldTitle, 'Doc title should match');
assert.equal(doc.data.draftRoles.length, 3, 'Doc should have 3 draftRoles');
assert.equal(doc.data.generatedWorld.id, draft.id, 'Doc generatedWorld should be present');
assert.equal(doc.data.creatorDetailBaseline.roles.length, 3, 'Doc baseline roles should match');
assert.equal(doc.data.creatorDetailBaseline.outline.length, 3, 'Doc baseline outline should match');
assert.equal(doc.data.publishedWorld, false, 'Should be draft, not published');
assert.equal(doc.data.generated, true, 'Should be marked as generated');
console.log('✓ createCreatorDocumentFromDraft tests passed.');

console.log('\nALL PHASE 2 TESTS PASSED SUCCESSFULLY! 🎯');
