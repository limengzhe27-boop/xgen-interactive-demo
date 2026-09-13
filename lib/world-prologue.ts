export type PrologueShot = { caption: string; poster: string; seconds: number };
export type WorldPrologue = {
  shots: PrologueShot[]; handoff: string; video?: string; captionsEmbedded?: boolean; hasAudio?: boolean;
  audioOrigin?: 'native' | 'post';
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
export const ascensionNativePrologue: WorldPrologue = {
  video:'/assets/prologues/ascension-native-v3/preview.mp4', hasAudio:true, audioOrigin:'native',
  shots:[{poster:'/assets/prologues/ascension-native-v3/poster.webp',seconds:15,caption:'逃出的灰衣修士被锁链拖回门内。你尚未接牌，左腕也被束住；执籍官就在面前，断剑仍在右手。'}],
  handoff:'你仍在天门外，未签契、未挥剑。追问逃亡者、检查锁链，或付出剑气斩链，由你决定。',
};
export function worldPrologue(worldId: string, publicPremise: string, cover: string): WorldPrologue {
  if (worldId === 'nightguard-double') return nightguardNativePrologue;
  if (worldId === 'final-circle-future') return finalcircleNativePrologue;
  if (worldId === 'spider-under-table') return spiderNativePrologue;
  if (worldId === 'emperor-last-decree') return emperorNativePrologue;
  if (worldId === 'surrounded-by-beauties') return beautiesNativePrologue;
  return worldId === 'ascension-work-number' ? ascensionNativePrologue : worldId === 'yoga-lotus-boundary' ? yogaAudioPrologue : {
    shots: [{ caption: publicPremise, poster: cover, seconds: 0 }],
    handoff: '先了解这场故事，再选择你要成为的人。',
  };
}
export const emperorNativePrologue: WorldPrologue = {
  video: '/assets/prologues/emperor-native-v1/preview.mp4', hasAudio: true, audioOrigin: 'native',
  shots: [{poster:'/assets/prologues/emperor-native-v1/poster.webp',seconds:15,caption:'丞相推来诏书与笔；门外传来求见声。你尚未签字。'}],
  handoff:'诏书尚未签下。核对军令、要求隔门对话，或检查玺印，接下来由你决定。',
};
export const beautiesNativePrologue: WorldPrologue = {
  video: '/assets/prologues/beauties-native-v1/preview.mp4', hasAudio: true, audioOrigin: 'native',
  shots: [{poster:'/assets/expansion/surrounded-by-beauties/cover-v2.webp',seconds:15,caption:'你刚搬进公寓，就撞上试镜、试菜和拿错的样机箱。你还没来得及解释自己只是新租客。'}],
  handoff:'箱子还没打开，你尚未答应任何事。先向谁解释，或先处理什么，由你决定。',
};
export const spiderNativePrologue: WorldPrologue = {
  video: '/assets/prologues/spider-native-v1/preview.mp4', hasAudio: true, audioOrigin: 'native',
  shots: [{poster:'/assets/expansion/spider-under-table/cover.webp',seconds:15,caption:'桌腿震动，清洁刷正在逼近。身后的卵囊仍完好，通向墙缝的旧丝松了。'}],
  handoff:'刷毛尚未碰到蛛网。试探旧丝、观察刷子的方向，或先固定卵囊，由你决定。',
};
export const finalcircleNativePrologue: WorldPrologue = {
  video:'/assets/prologues/finalcircle-native-v1/preview.mp4',hasAudio:true,audioOrigin:'native',
  shots:[{poster:'/assets/expansion/final-circle-future/cover.webp',seconds:15,caption:'模拟对战只剩两人，弹匣已空。无线电里的对手自称十分钟后的你，警告你别碰补给。'}],
  handoff:'来者身份尚未证实，补给未取。核验暗号、观察补给，或追问警告来源，由你决定。',
};
export const nightguardNativePrologue: WorldPrologue = {
  video:'/assets/prologues/nightguard-native-v1/preview.mp4',hasAudio:true,audioOrigin:'native',
  shots:[{poster:'/assets/expansion/nightguard-double/cover.webp',seconds:15,caption:'夜班第一晚，你还在屋里，监控里的你却先敲了玻璃。新贴纸条警告你不要回答自己的声音。'}],
  handoff:'你尚未回答或开门。核对画面时间、无声联系何姨，或查看纸条下的旧记录，由你决定。',
};
export function prologueDuration(prologue: WorldPrologue) {
  return Math.min(30, prologue.shots.reduce((sum, shot) => sum + shot.seconds, 0));
}
export function prologueShotAt(prologue: WorldPrologue, seconds: number) {
  let end = 0;
  const index = prologue.shots.findIndex(shot => { end += shot.seconds; return seconds < end; });
  return index < 0 ? prologue.shots.length - 1 : index;
}
