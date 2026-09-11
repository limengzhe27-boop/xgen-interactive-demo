import type { StudioWorld } from './studio-worlds';
import { generateSceneImage } from './remote-image-service.ts';
import { hasPublicationImage } from './publication-art.ts';
import { CREATOR_IMAGE_STYLE, creatorPortraitPrompt } from './creator-image-prompts.ts';
export { hasPublicationImage } from './publication-art.ts';

// Old publication placeholders are not images made for this work.
export async function preparePublicationImages(entry:StudioWorld,scope:string,onProgress:(entry:StudioWorld,label:string)=>void,generate=generateSceneImage){
 let next={...entry,portraits:{...entry.portraits}};
 const missing=entry.world.characters.filter(c=>!hasPublicationImage(next.portraits[c.id]));
 const total=missing.length+(hasPublicationImage(next.cover)?0:1);let done=0;
 async function image(purpose:'scene'|'portrait',sceneId:string,prompt:string){
   onProgress(next,`准备配图 ${done+1}/${total}`);
   const result=await generate({purpose,sceneId,prompt,seed:0,requestId:1},undefined,scope);
   if(!result.persistent)throw Error('配图尚未保存，暂不发布。请稍后重试。');
   done++;return result.assetUrl;
 }
 for(const c of missing){
   next={...next,portraits:{...next.portraits,[c.id]:await image('portrait',`publish-${entry.id}-${c.id}`,creatorPortraitPrompt({name:c.name,identity:c.identity,appearance:c.imagePrompt,personality:c.persona},entry.title,{scene:entry.world.openingScene.narrative,cast:entry.world.characters.map(r=>({name:r.name,appearance:r.imagePrompt}))}))}};
   onProgress(next,`配图已保存 ${done}/${total}`);
 }
 if(!hasPublicationImage(next.cover)){
   const cast=entry.world.characters.filter(c=>entry.world.openingScene.presentCharacterIds.includes(c.id));
   next={...next,cover:await image('scene',`publish-${entry.id}-cover`,`${CREATOR_IMAGE_STYLE}。故事封面。${entry.title}。开场：${entry.world.openingScene.narrative}。人物外观：${cast.map(c=>`${c.name}：${c.imagePrompt}`).join('；')}。聚焦开场事件与人物互动，不是人物拼贴，无文字、无水印。`)};
   onProgress(next,'配图已准备');
 }
 return next;
}
