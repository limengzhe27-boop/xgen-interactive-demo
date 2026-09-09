import type { WorldTurnRequest, WorldTurnResponse } from './ai-contracts';
import type { StudioWorld } from './studio-worlds';
import { getRoleOpening } from './studio-worlds';
import { commitTurn, createInitialWorldState, selectRoleGoal, turnMemoryText, type WorldState } from './world-state';
export type VideoChoice = {id:string;label:string;intent:string};
export function threeChoices(choices:VideoChoice[]):VideoChoice[] {
  const fallback=['观察眼前环境，寻找可以行动的线索','检查自己身边可见的物品','暂不表态，留意眼前的变化'];
  const result=choices.filter((c,i,a)=>c.label.trim()&&a.findIndex(x=>x.label===c.label)===i).slice(0,3);
  for(const [i,label] of fallback.entries())if(result.length<3&&!result.some(c=>c.label===label))result.push({id:`observe-${i}`,label,intent:label});
  return result;
}
export function initialVideoRole(entry:StudioWorld,roleId:string){
  const world=entry.world,role=world.characters.find(c=>c.id===roleId);
  if(!role)throw new Error('角色不存在');
  const location=world.locations.find(l=>l.id===role.startLocationId);
  const state=createInitialWorldState('draft',roleId,'',location?.name??role.startLocationId,{
    timeSetting:world.timeSetting,coreEvent:world.coreEvent,activeGoalId:selectRoleGoal(world,roleId)?.id,
    roleKnowledge:role.privateKnowledge,characterIds:world.characters.map(c=>c.id),
    characterLocations:Object.fromEntries(world.characters.map(c=>[c.id,c.startLocationId])),openingLocationId:role.startLocationId,
  });
  const custom=entry.roleChoices?.[roleId]?.map((label,i)=>({id:`role-${i}`,label,intent:label}));
  return {state,narrative:getRoleOpening(entry,roleId),choices:threeChoices(custom??(role.startLocationId===world.openingScene.locationId?world.openingScene.choices:[]))};
}
export function videoTurnRequest(entry:StudioWorld,roleId:string,state:WorldState,narrative:string,choices:VideoChoice[],action:string):WorldTurnRequest{
  return {contractVersion:'2026-09-04.v2',presentation:{medium:'native-video',seconds:15},world:entry.world,selectedRoleId:roleId,state,userAction:action,
    recentTurns:state.eventLedger.slice(-6).map(e=>({action:e.action,result:e.result})),
    currentScene:{id:`video-${state.turn}`,title:state.location,narrative,choices}};
}
export function videoMotionPrompt(entry:StudioWorld,roleId:string,state:WorldState,response:WorldTurnResponse,hasFrame:boolean){
  if(!response.actionDecision.allowed)throw new Error(response.actionDecision.reason||'这个行动暂时无法进行');
  const lines=response.dialogue.filter(l=>l.visibleToRoleIds.includes(roleId));
  if(lines.length>4||lines.reduce((n,l)=>n+l.text.replace(/[\s，。！？、：；“”‘’,.!?]/g,'').length,0)>55||response.narrative.length>650)
    throw new Error('这轮故事或对白太长，无法完整放进15秒视频；没有提交视频生成。请缩小本次行动再试。');
  const role=entry.world.characters.find(c=>c.id===roleId)!;
  // Only public visual descriptions of heard speakers. No secrets, personal memories or full world object.
  const cast=lines.map(l=>entry.world.characters.find(c=>c.id===l.characterId)).filter(c=>c&&c.id!==roleId);
  return `Generate a continuous 15-second story action video WITH native synchronized audio, not a moving poster. Strict first-person eyes of ${role.name}, ${role.imagePrompt}. Never show the player externally. ${hasFrame?'Continue from this exact last frame, preserve hands, props, characters and spatial positions.':'Re-establish the selected character’s own first-person location; this is a viewpoint change, not the old camera position.'}
Current location: ${state.location}. Visible/heard characters: ${cast.map(c=>`${c!.name}: ${c!.imagePrompt}`).join('; ')}.
Act out this already adjudicated short event in order (trigger, physical action, response, changed end state): ${response.narrative}
Native Mandarin dialogue, spoken once by the named speakers in the order below, voices appropriate to their identities, not narration: ${lines.map(l=>`${entry.world.characters.find(c=>c.id===l.characterId)?.name}: “${l.text}”`).join('; ')||'No dialogue; generate audible synchronized physical action and environmental sounds.'}
0–3 seconds start the authorized action; 3–9 seconds carry out the interaction and obstacle; 9–13 seconds show the visible reaction and changed situation; 13–15 seconds settle at the unresolved end state. Never stretch a static pose to fill time. Camera follows the player’s actual movement, never moves as a substitute for acting. Include audible footsteps, material/contact sounds only when the corresponding contact happens, and location-appropriate ambience below the dialogue. No external TTS, no added music, no subtitles, no looping or return to the starting pose. Do not invent extra powers, teleport, reveal off-screen secrets or make the next decision for the player. Stop at the event’s unresolved end state.`;
}
export function commitVideoTurn(entry:StudioWorld,roleId:string,state:WorldState,action:string,response:WorldTurnResponse){
  const patch=response.statePatch;
  return commitTurn(state,{...patch,action,result:turnMemoryText(response,entry.world,roleId),clue:'',nextLocation:entry.world.locations.find(l=>l.id===patch.locationId)?.name??state.location,
    relationshipDelta:0,incident:response.incident,reachedEndingId:response.ending.reached?response.ending.endingId:undefined});
}
export const videoErrors:Record<string,string>={
  fal_balance_exhausted:'fal 账户余额已耗尽，请维护者在 fal 补充余额。没有生成新片，也未推进剧情。',
  fal_not_configured:'尚未配置 fal，暂时不能生成续集。',fal_access_denied:'fal 拒绝访问，请维护者检查密钥权限和账户状态。',
  fal_input_rejected:'fal 拒绝了本次输入，未生成新片。不自动换词重试。',fal_rate_limited:'fal 请求限流，请稍后恢复查询。',
  fal_missing_native_audio:'模型返回的视频缺少原生音轨，未用于后续剧情；不会改用后期配音。',
  fal_generation_failed:'本次视频生成失败，剧情未推进，不会自动再次扣费。',
  daily_limit:'今天的视频试用次数已用完（每账号最多两段，全站最多六段）。剧情未推进。',
  storage_limit:'视频存储额度不足，未提交新生成。',
  reserved:'上次提交状态尚不确定。保留了原回合，不会重复提交付费请求；请稍后恢复查询或联系维护者。',
  failed:'这次视频没有成功，剧情未推进。请保留现场供维护者检查，不自动重复购买。',
};
