export type PrologueShot = { caption: string; poster: string; seconds: number };
export type WorldPrologue = {
  shots: PrologueShot[]; handoff: string; video?: string;
  message?: { at: number; until: number; sender: string; text: string };
};
export const yogaPrologue: WorldPrologue = {
  video: '/assets/prologues/yoga-v1/prologue.mp4',
  shots: [
    { caption: '结婚九年，林栀的生活围着家转。可她想说的话，总等不到一个回答。', poster: '/assets/prologues/yoga-v1/poster.webp', seconds: 5 },
    { caption: '在瑜伽馆，年轻私教陆晨记得她的生日，也愿意听她说话。', poster: '/assets/yoga-v1/lu.webp', seconds: 5 },
    { caption: '课越续越多，关系越走越近。一条莲花手链，让她不愿再问那句“为什么”。', poster: '/assets/yoga-v1/lin.webp', seconds: 5 },
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
