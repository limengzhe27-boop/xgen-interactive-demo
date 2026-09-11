import type {StudioWorld} from './studio-worlds';
import type {WorldState} from './world-state';
import type {WorldTurnResponse} from './ai-contracts';
import {commitVideoTurn,threeChoices,videoMotionPrompt,videoTurnRequest,type VideoChoice} from './video-exploration.ts';
export type BranchSource={roleId:string;state:WorldState;narrative:string;choices:VideoChoice[];hasFrame:boolean};
export type BranchPlan={action:string;response:WorldTurnResponse;prompt:string};
export type BranchCache={key:string;plans:BranchPlan[]};
export function branchKey(entry:StudioWorld,source:BranchSource){
  return JSON.stringify(['branch-plans-v1',source.hasFrame,videoTurnRequest(entry,source.roleId,source.state,source.narrative,source.choices,'')]);
}
export function afterPending(entry:StudioWorld,source:BranchSource,pending:{action:string;response:WorldTurnResponse}):BranchSource|null{
  if(pending.response.ending.reached)return null;
  return {roleId:source.roleId,state:commitVideoTurn(entry,source.roleId,source.state,pending.action,pending.response),narrative:pending.response.narrative,choices:threeChoices(pending.response.nextChoices),hasFrame:true};
}
export function compileBranch(entry:StudioWorld,source:BranchSource,action:string,response:WorldTurnResponse):BranchPlan{
  const prompt=videoMotionPrompt(entry,source.roleId,source.state,response,source.hasFrame);
  if(prompt.length>6500)throw Error('视频脚本过长，请重新准备此分支');
  return {action,response,prompt};
}
