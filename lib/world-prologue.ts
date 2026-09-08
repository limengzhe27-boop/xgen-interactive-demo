export type PrologueShot = { caption: string; poster: string; seconds: number };
export type WorldPrologue = {
  shots: PrologueShot[]; handoff: string; video?: string; captionsEmbedded?: boolean; hasAudio?: boolean;
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
export const yogaComparisonPrologue: WorldPrologue = {
  video: '/assets/prologues/yoga-v3/prologue.mp4',
  captionsEmbedded: true,
  shots: [
    { caption: '林栀，结婚九年的全职太太。陆晨，二十七岁的瑜伽私教——不是她的丈夫。', poster: '/assets/prologues/yoga-v3/poster.webp', seconds: 4 },
    { caption: '拉伸停了，她却没有走开。这次拥吻，已经越过了教学与婚姻的界线。', poster: '/assets/prologues/yoga-v3/poster.webp', seconds: 6 },
    { caption: '丈夫：幼儿园快关门了，你到底几点去接孩子？她低头看着手机，陆晨就在面前。', poster: '/assets/prologues/yoga-v3/poster.webp', seconds: 4 },
  ],
  handoff: '是先安排接送，还是面对门外这段关系？停在这里，接下来交给你。',
};
export const yogaAudioPrologue: WorldPrologue = {
  video: '/assets/prologues/yoga-v4/prologue.mp4', hasAudio: true, captionsEmbedded: true,
  shots: [
    { caption: '结婚九年，她等来的，只有丈夫低头看手机。', poster: '/assets/prologues/yoga-v4/poster.webp', seconds: 5 },
    { caption: '瑜伽私教陆晨，却把关心送到了她手里。', poster: '/assets/yoga-v1/lu.webp', seconds: 5 },
    { caption: '拉伸停了，她没有走。她要的，早已不只是私教课。', poster: '/assets/yoga-v1/lin.webp', seconds: 10 },
    { caption: '直到丈夫的消息，追了过来。', poster: '/assets/yoga-v1/cover.webp', seconds: 5 },
    { caption: '丈夫：幼儿园快关门了，你到底几点去接孩子？她尚未回复。', poster: '/assets/yoga-v1/lin.webp', seconds: 5 },
  ],
  handoff: '消息还没回复，孩子还在等她。接下来，由你决定。',
};
export const ascensionPrologue: WorldPrologue = {
  video: '/assets/prologues/ascension-v1/prologue.mp4',
  captionsEmbedded: true,
  shots: [
    { caption: '你是沈砚。百年修行，一柄断剑，终于走到了天门前。', poster: '/assets/ascension-v1/cover.webp', seconds: 5 },
    { caption: '接引官不问仙名，只说：“丁字九十七号，到你了。”', poster: '/assets/ascension-v1/cover.webp', seconds: 5 },
    { caption: '契牌下的金链探向你的手腕。飞升，为什么还要上锁？', poster: '/assets/ascension-v1/cover.webp', seconds: 5 },
    { caption: '你还没答应，金链已经缠上红绳。他转身引路——这是飞升，还是押送？', poster: '/assets/ascension-v1/cover.webp', seconds: 5 },
  ],
  handoff: '你还站在桥上，金链已缠住红绳。问清规矩、检查链扣，或用一次剑气斩断它。',
};
export function worldPrologue(worldId: string, publicPremise: string, cover: string): WorldPrologue {
  return worldId === 'ascension-work-number' ? ascensionPrologue : worldId === 'yoga-lotus-boundary' ? yogaPrologue : {
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
