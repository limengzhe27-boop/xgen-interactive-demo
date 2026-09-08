export type PrologueShot = { caption: string; poster: string; seconds: number };
export type WorldPrologue = {
  shots: PrologueShot[]; handoff: string; video?: string;
  message?: { at: number; until: number; sender: string; text: string };
};
export const yogaPrologue: WorldPrologue = {
  video: '/assets/prologues/yoga-v2/prologue.mp4',
  message: {at:17,until:20,sender:'丈夫',text:'幼儿园快关门了，你到底几点去接孩子？'},
  shots: [
    { caption: '结婚九年，林栀又来上瑜伽私教课。陆晨二十七岁，不是她的丈夫。', poster: '/assets/prologues/yoga-v2/poster.webp', seconds: 5 },
    { caption: '她原本只是想被关心。如今，这场拥吻早已越过师生与婚姻的界线。', poster: '/assets/yoga-v1/lu.webp', seconds: 5 },
    { caption: '两人的拥抱还没结束，她便拿起了手机。更衣室外，还有一个家等着她回去。', poster: '/assets/yoga-v1/lin.webp', seconds: 5 },
    { caption: '17:40。她还没走出更衣室，丈夫发来消息：“幼儿园快关门了，你几点去接？”', poster: '/assets/yoga-v1/cover.webp', seconds: 5 },
  ],
  handoff: '门还没打开，消息还没回复。接下来的事，尚未发生。',
};
export function worldPrologue(worldId: string, publicPremise: string, cover: string): WorldPrologue {
  return worldId === 'yoga-lotus-boundary' ? yogaPrologue : {
    shots: [{ caption: publicPremise, poster: cover, seconds: 0 }],
    handoff: '先了解这场故事，再选择你要成为的人。',
  };
}
export function prologueDuration(prologue: WorldPrologue) {
  return Math.min(30, prologue.shots.reduce((sum, shot) => sum + shot.seconds, 0));
}
export function prologueShotAt(prologue: WorldPrologue, seconds: number) {
  let end = 0;
  const index = prologue.shots.findIndex(shot => { end += shot.seconds; return seconds < end; });
  return index < 0 ? prologue.shots.length - 1 : index;
}
