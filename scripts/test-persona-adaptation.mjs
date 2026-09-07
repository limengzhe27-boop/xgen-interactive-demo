import test from 'node:test';
import assert from 'node:assert/strict';
import { makePersonaAdaptationRequest, readPersonaAdaptationRequest, readPersonaAdaptationSuggestion } from '../lib/persona-adaptation.ts';
import { admitPersona, validPersonaAdmission, personaEntryProblem } from '../lib/player-persona.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';
import { publicationWorld } from '../lib/publication.ts';
import { conversationEntry, chatRequest } from '../lib/studio-session.ts';
import { createInitialWorldState } from '../lib/world-state.ts';

const persona = {version:1,ownerId:'99999999-9999-4999-8999-999999999999',name:'林星',identity:'虚构星际旅人',personality:'谨慎、善于沟通',appearance:'银发黑外套',abilities:'读心、谈判',updatedAt:1};
const source = structuredClone(studioWorlds.find(w => w.id === 'contract-expiry'));
source.world.entryPolicy = {allowPersona:true,allowedRoleIds:['su'],abilityMode:'agent-select',abilities:['善于谈判，但不能替他人同意','擅长观察，不可读心']};
const request = () => makePersonaAdaptationRequest(source,'su',persona,'更擅长谈判');
const suggestion = () => ({roleId:'su',summary:'以自己的性格争取尊重，仍需自己作出选择。',grantedAbilities:[source.world.entryPolicy.abilities[0]],limitations:'不获得读心能力，不跳过角色目标和任务条件。'});

test('adaptation request whitelist excludes account, images, memories and world secrets at both boundaries',()=>{
  const input = makePersonaAdaptationRequest(source,'su',{...persona,memories:['PRIVATE-MEMORY'],portraitUrl:'/api/image/asset/'+'a'.repeat(64)},'更擅长谈判');
  assert.equal(input.persona.identity,persona.identity); assert.equal(input.persona.abilities,persona.abilities);
  assert.deepEqual(Object.keys(input.world),['title','timeSetting']);
  const clean = readPersonaAdaptationRequest({...input,memories:['PRIVATE-MEMORY'],world:{...input.world,secrets:['NPC-SECRET']},persona:{...input.persona,ownerId:persona.ownerId}});
  for(const token of [persona.ownerId,'PRIVATE-MEMORY','NPC-SECRET','portraitUrl','privateKnowledge']) assert.ok(!JSON.stringify(clean).includes(token));
});
test('closed policies, unknown roles, empty pools and oversized input never reach model',()=>{
  const input=request();
  assert.equal(readPersonaAdaptationRequest({...input,policy:{...input.policy,allowPersona:false}}),null);
  assert.equal(readPersonaAdaptationRequest({...input,role:{...input.role,id:'shen'}}),null);
  assert.equal(readPersonaAdaptationRequest({...input,policy:{...input.policy,abilities:[]}}),null);
  assert.equal(readPersonaAdaptationRequest({...input,preference:'a'.repeat(1001)}),null);
  assert.equal(readPersonaAdaptationRequest({...input,persona:{...input.persona,name:''}}),null);
  assert.throws(()=>makePersonaAdaptationRequest(source,'shen',persona,''));
});
test('Agent cannot grant outside pool, remove a limitation, repeat a skill or switch the plot role',()=>{
  const input=request();
  assert.ok(readPersonaAdaptationSuggestion(suggestion(),input));
  for(const grantedAbilities of [['读心'],['善于谈判'],[...suggestion().grantedAbilities,...suggestion().grantedAbilities]]) assert.equal(readPersonaAdaptationSuggestion({...suggestion(),grantedAbilities},input),null);
  assert.equal(readPersonaAdaptationSuggestion({...suggestion(),roleId:'gu'},input),null);
  const four={...input,policy:{...input.policy,abilities:['a','b','c','d']}};
  assert.equal(readPersonaAdaptationSuggestion({...suggestion(),grantedAbilities:four.policy.abilities},four),null);
  assert.ok(readPersonaAdaptationSuggestion({...suggestion(),grantedAbilities:[]},input));
});
test('role-only and fixed policies retain previous exact grant semantics',()=>{
  const input=request();
  assert.equal(readPersonaAdaptationSuggestion(suggestion(),{...input,policy:{...input.policy,abilityMode:'role-only'}}),null);
  assert.equal(readPersonaAdaptationSuggestion(suggestion(),{...input,policy:{...input.policy,abilityMode:'fixed'}}),null);
  assert.ok(readPersonaAdaptationSuggestion({...suggestion(),grantedAbilities:input.policy.abilities},{...input,policy:{...input.policy,abilityMode:'fixed'}}));
});
test('admission requires an explicit valid result, persists only granted subset and retains original world',()=>{
  const before=JSON.stringify(source);
  assert.throws(()=>admitPersona(source,'su',persona));
  assert.throws(()=>admitPersona(source,'su',persona,['读心']));
  const adapted=admitPersona(source,'su',persona,suggestion().grantedAbilities);
  assert.equal(validPersonaAdmission(adapted.world,'su'),true);
  assert.equal(JSON.stringify(source),before);
  assert.deepEqual(adapted.world.entryAdmission.grantedAbilities,suggestion().grantedAbilities);
  assert.deepEqual(adapted.world.tasks.map(t=>t.id),source.world.tasks.map(t=>t.id));
  assert.ok(!JSON.stringify(adapted).includes(persona.identity));
  const broken=structuredClone(adapted); broken.world.entryAdmission.grantedAbilities=['读心'];
  assert.equal(validPersonaAdmission(broken.world,'su'),false);
  assert.ok(personaEntryProblem(adapted.world,'su',persona));
});
test('selected abilities survive independent conversation restore but cannot be published as a world',()=>{
  const adapted=admitPersona(source,'su',persona,suggestion().grantedAbilities);
  const entry=conversationEntry(adapted,'su','gu');
  const session=JSON.parse(JSON.stringify({id:'adapt-test',entry,playerRoleId:'su',targetCharacterId:'gu',state:createInitialWorldState('draft','su','','客厅'),narrative:entry.world.openingScene.narrative,turns:[],savedAt:1}));
  assert.deepEqual(chatRequest(session,'你好').world.entryAdmission.grantedAbilities,suggestion().grantedAbilities);
  assert.deepEqual(publicationWorld(source.world).entryPolicy,source.world.entryPolicy);
  assert.throws(()=>publicationWorld(adapted.world),/private_session/);
});
