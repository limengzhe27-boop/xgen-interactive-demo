import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creatorContentGaps } from '../lib/creator-completeness.ts';
import { readCreatorResponse } from '../lib/creator-response.ts';
import { creatorChanges, applyCreatorChange } from '../lib/creator-changes.ts';
import { publicationWorld } from '../lib/publication.ts';
import { publicationDraft } from '../lib/restore-publication.ts';

test('public introduction is a reviewable role edit, not lost during extraction', () => {
  const role={editorId:'stable-a',name:'甲',identity:'店员',personality:'安静',relationship:'同事',appearance:'蓝衬衫',publicIntroduction:''};
  const before={castAndTasks:{roles:[role],tasks:[]}};
  const changes=creatorChanges(before,{castAndTasks:{roles:[{...role,publicIntroduction:'旧书店的店员。'}],tasks:[]} },{});
  assert.equal(changes[0].target.field,'publicIntroduction');
  const next=applyCreatorChange(before,changes[0]);
  assert.equal(next.castAndTasks.roles[0].publicIntroduction,'旧书店的店员。');
  assert.deepEqual(applyCreatorChange(next,changes[0],true),before);
});
test('completion inventory sees missing presentation and preserves proposed public fields', () => {
  const character={name:'甲',identity:'店员',persona:'安静',appearance:'',relationship:'同事',goal:'找回旧书'};
  const input={characters:[character],userMessage:'完善展示',currentDraft:{title:'书店',premise:'找书',surpriseLevel:2,brief:{coreGoal:'找书',preferredDirection:'',alternativeDirection:'',tasks:[],difficulties:[],scheduledEvents:[],complexityLevel:2}}};
  assert.ok(creatorContentGaps(input).some(x=>x.includes('外貌')));
  const result=readCreatorResponse({reply:'建议如下',readiness:'ready',proposal:{brief:{synopsis:'一起找回旧书。'},characters:[{...character,appearance:'蓝衬衫',publicIntroduction:'旧书店的店员。',cardHook:'一起找书'}]}},input);
  assert.equal(result.proposal.brief.synopsis,'一起找回旧书。');
  assert.equal(result.proposal.characters[0].publicIntroduction,'旧书店的店员。');
  assert.deepEqual(creatorContentGaps({...input,pendingProposal:result.proposal}),[]);
});
test('public synopsis survives publication and draft restoration', () => {
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/creator-story-world.json',import.meta.url),'utf8'));
  const world=publicationWorld({...fixture,publicSynopsis:'面向读者的介绍'});
  const doc=publicationDraft({id:'test',title:world.title,genre:'',premise:world.premise,cover:'',portraits:{},world});
  assert.equal(doc.data.creatorBrief.synopsis,'面向读者的介绍');
});
