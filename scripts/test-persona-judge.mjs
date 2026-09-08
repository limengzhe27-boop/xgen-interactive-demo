import test from 'node:test';
import assert from 'node:assert/strict';
import { studioWorlds } from '../lib/studio-worlds.ts';
import { makePersonaAdaptationRequest, readPersonaAdaptationRequest, readPersonaAdaptationSuggestion } from '../lib/persona-adaptation.ts';
import { joinWorldAsPersona, VISITOR_ID, validPersonaAdmission, restoreEntryPolicy, requiresAbilityJudgment } from '../lib/player-persona.ts';
import { publicationWorld } from '../lib/publication.ts';

const entry = structuredClone(studioWorlds.find(w=>w.id==='contract-expiry'));
entry.world.entryPolicy = {allowPersona:true,allowedRoleIds:[],abilityMode:'agent-judge',abilities:[]};
const persona = {version:1,ownerId:'test-account',name:'测试旅人',identity:'旅行者',personality:'冷静',appearance:'蓝色外套',abilities:'读心和观察',updatedAt:1};
const input = ()=>makePersonaAdaptationRequest(entry,VISITOR_ID,persona,'希望发挥观察能力');
const reply = ()=>({roleId:VISITOR_ID,summary:'作为新来者观察环境。',grantedAbilities:['敏锐观察：仅注意可见表情，不能读心，也不能保证判断准确'],limitations:'现实世界不允许读心；需要通过交流建立信任。'});

test('autonomous judgment needs no whitelist, but requires full bounded world rules',()=>{
  const request=input();
  assert.equal(requiresAbilityJudgment(request.policy),true);
  assert.equal(request.world.supernaturalAllowed,false);
  assert.deepEqual(request.world.rules,entry.world.rules.map(r=>`${r.kind}：${r.description}`));
  assert.equal(readPersonaAdaptationRequest({...request,world:{title:request.world.title,timeSetting:request.world.timeSetting}}),null);
  assert.equal(readPersonaAdaptationRequest({...request,world:{...request.world,rules:['x'.repeat(4001)]}}),null);
  for (const token of ['test-account','privateKnowledge','portraitUrl']) assert.ok(!JSON.stringify(request).includes(token));
  assert.equal(restoreEntryPolicy(request.policy).abilityMode,'agent-judge');
  assert.equal(publicationWorld(entry.world).entryPolicy.abilityMode,'agent-judge');
});
test('judge result accepts a bounded adaptation, rejects malformed and duplicate grants, allows refusal',()=>{
  assert.ok(readPersonaAdaptationSuggestion(reply(),input()));
  for(const grantedAbilities of [undefined,[''],['x','x'],['a','b','c','d'],['x'.repeat(201)]])
    assert.equal(readPersonaAdaptationSuggestion({...reply(),grantedAbilities},input()),null);
  assert.equal(readPersonaAdaptationSuggestion({...reply(),limitations:''},input()),null);
  assert.ok(readPersonaAdaptationSuggestion({...reply(),grantedAbilities:[]},input()));
  assert.equal(readPersonaAdaptationSuggestion({...reply(),grantedAbilities:['有限读心：对方同意后读取表层情绪，每天三次']},input()),null);
  assert.equal(readPersonaAdaptationSuggestion({...reply(),grantedAbilities:['瞬移：最多一米，每天一次']},input()),null);
  const fantasy={...input(),world:{...input().world,supernaturalAllowed:true}};
  assert.ok(readPersonaAdaptationSuggestion({...reply(),grantedAbilities:['瞬移：最多一米，每天一次']},fantasy));
});
test('confirmed judge grants and their limits persist without altering original roles or world',()=>{
  assert.throws(()=>joinWorldAsPersona(entry,persona));
  const before=JSON.stringify(entry);
  const joined=joinWorldAsPersona(entry,persona,reply().grantedAbilities);
  assert.equal(JSON.stringify(entry),before);
  assert.deepEqual(joined.world.characters.slice(0,-1),entry.world.characters);
  assert.deepEqual(joined.world.entryAdmission.grantedAbilities,reply().grantedAbilities);
  assert.ok(joined.world.rules.at(-1).description.includes(reply().grantedAbilities[0]));
  assert.ok(validPersonaAdmission(JSON.parse(JSON.stringify(joined.world)),VISITOR_ID));
  assert.deepEqual(joinWorldAsPersona(entry,persona,[]).world.entryAdmission.grantedAbilities,[]);
});
