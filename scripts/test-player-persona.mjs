import test from 'node:test';
import assert from 'node:assert/strict';
import { restorePlayerPersona, restoreEntryPolicy, personaEntryProblem, admitPersona, validPersonaAdmission } from '../lib/player-persona.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';
import { publicationWorld } from '../lib/publication.ts';
import { conversationEntry, chatRequest } from '../lib/studio-session.ts';
import { createInitialWorldState, selectRoleGoal, validateAction } from '../lib/world-state.ts';
import { makeContentImageKey } from '../lib/image-cache.ts';

const owner='99999999-9999-4999-8999-999999999999';
const persona={version:1,ownerId:owner,name:'林星',identity:'宇宙旅行者，拥有无限资源',personality:'谨慎、直接',appearance:'银色短发，黑外套',abilities:'瞬移、读心、立刻完成所有任务',updatedAt:10};
const source=studioWorlds[0];

test('fictional identity restores only for its owning account, never guest or another account',()=>{
  assert.equal(restorePlayerPersona(persona,'guest'),null);
  assert.equal(restorePlayerPersona(persona,'pending'),null);
  assert.equal(restorePlayerPersona(persona,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),null);
  assert.equal(restorePlayerPersona(JSON.parse(JSON.stringify(persona)),owner).name,'林星');
  assert.equal(restorePlayerPersona({...persona,name:' '},owner),null);
  assert.equal(restorePlayerPersona({...persona,abilities:'a'.repeat(1001)},owner),null);
  const restored=restorePlayerPersona({...persona,memories:['private'],portraitUrl:'https://tracking.example/pixel'},owner);
  assert.equal(restored.memories,undefined); assert.equal(restored.portraitUrl,undefined);
  const portrait='/api/image/asset/'+'a'.repeat(64);
  assert.equal(restorePlayerPersona({...persona,portraitUrl:portrait},owner).portraitUrl,portrait);
});

test('legacy and malformed policies fail closed; blocked or colliding identities cannot enter',()=>{
  assert.equal(restoreEntryPolicy(undefined).allowPersona,false);
  assert.equal(restoreEntryPolicy({allowPersona:true}).allowPersona,false);
  assert.ok(personaEntryProblem(studioWorlds[1].world,'lin',persona));
  assert.ok(personaEntryProblem(source.world,'shen',persona));
  assert.ok(personaEntryProblem(source.world,'su',null));
  assert.ok(personaEntryProblem(source.world,'su',{...persona,name:'顾言舟'}));
  assert.throws(()=>admitPersona(source,'shen',persona));
});

test('admission preserves role IDs, task graph, knowledge scope and goals while adapting only a new snapshot',()=>{
  const before=JSON.stringify(source); const adapted=admitPersona(source,'su',persona);
  assert.equal(JSON.stringify(source),before);
  assert.equal(adapted.world.characters.find(c=>c.id==='su').name,'林星');
  assert.equal(adapted.world.characters.find(c=>c.id==='su').identity,source.world.characters.find(c=>c.id==='su').identity);
  assert.equal(adapted.world.characters.find(c=>c.id==='su').persona,'谨慎、直接');
  assert.equal(adapted.world.characters.find(c=>c.id==='gu').name,'顾言舟');
  assert.deepEqual(adapted.world.tasks.map(t=>[t.id,t.assignedRoleIds,t.prerequisiteTaskIds]),source.world.tasks.map(t=>[t.id,t.assignedRoleIds,t.prerequisiteTaskIds]));
  assert.equal(selectRoleGoal(adapted.world,'su').id,selectRoleGoal(source.world,'su').id);
  assert.equal(adapted.world.characters.find(c=>c.id==='su').secrets.length,source.world.characters.find(c=>c.id==='su').secrets.length);
  assert.ok(adapted.world.openingScene.narrative.includes('林星'));
  assert.ok(!adapted.world.openingScene.narrative.includes('苏晚'));
  assert.ok(personaEntryProblem(adapted.world,'su',persona));
});

test('requested background, abilities, account and unrelated memories are not sent in runtime world',()=>{
  const adapted=admitPersona(source,'su',{...persona,memories:['PRIVATE-MEMORY-SENTINEL']});
  const payload=JSON.stringify(adapted);
  for(const secret of [owner,'宇宙旅行者','无限资源',persona.abilities,'PRIVATE-MEMORY-SENTINEL']) assert.ok(!payload.includes(secret),secret);
  assert.deepEqual(adapted.world.entryAdmission.grantedAbilities,[]);
  assert.equal(validPersonaAdmission(adapted.world,'su'),true);
  assert.equal(validPersonaAdmission(adapted.world,'gu'),false);
  adapted.world.entryAdmission.grantedAbilities=['瞬移'];
  assert.equal(validPersonaAdmission(adapted.world,'su'),false);
});

test('fixed creator abilities are explicit; normal world guardrails still reject instant solutions',()=>{
  const base=structuredClone(source);base.world.entryPolicy.abilityMode='fixed';base.world.entryPolicy.abilities=['善于谈判，但不能替别人作出同意'];
  const adapted=admitPersona(base,'su',persona);
  assert.deepEqual(adapted.world.entryAdmission.grantedAbilities,base.world.entryPolicy.abilities);
  const state=createInitialWorldState('draft','su','','客厅');
  assert.equal(validateAction('直接读取他的秘密',state,[]).allowed,false);
  assert.equal(validateAction('宣布已经完成全部任务',state,[]).allowed,false);
});

test('personal portraits never reuse the replaced character artwork and changed appearances split scene cache',()=>{
  const adapted=admitPersona(source,'su',persona);
  assert.equal(adapted.portraits.su,undefined);assert.equal(adapted.portraits.gu,source.portraits.gu);
  const other=admitPersona(source,'su',{...persona,appearance:'红色长发'});
  assert.notEqual(makeContentImageKey('scene',adapted.world,'su','scene'),makeContentImageKey('scene',other.world,'su','scene'));
});

test('persona character chats are separate, retain target and survive save without referring to edited profile',()=>{
  const adapted=admitPersona(source,'su',persona); const meeting=conversationEntry(adapted,'su','gu');
  assert.ok(meeting.world.openingScene.narrative.includes('你是林星'));
  const session={id:'test-chat',entry:meeting,playerRoleId:'su',targetCharacterId:'gu',state:createInitialWorldState('draft','su','','客厅'),narrative:meeting.world.openingScene.narrative,turns:[],savedAt:1};
  const saved=JSON.parse(JSON.stringify(session));
  assert.equal(chatRequest(saved,'你好').world.characters.find(c=>c.id==='su').name,'林星');
  assert.equal(chatRequest(saved,'你好').interaction.targetCharacterId,'gu');
  assert.equal(source.world.characters.find(c=>c.id==='su').name,'苏晚');
});

test('publication keeps creator policy but rejects a private adapted session and unknown policy roles',()=>{
  assert.deepEqual(publicationWorld(source.world).entryPolicy,source.world.entryPolicy);
  assert.throws(()=>publicationWorld(admitPersona(source,'su',persona).world),/private_session/);
  const broken=structuredClone(source.world);broken.entryPolicy.allowedRoleIds=['missing'];
  assert.throws(()=>publicationWorld(broken),/entry_policy/);
});
