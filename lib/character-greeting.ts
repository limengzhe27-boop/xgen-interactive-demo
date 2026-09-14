import type { StudioWorld } from './studio-worlds';

export type CharacterGreeting = { scene: string; text: string };
// Authored encounter lines, not quotations from the original IP or model output.
const openings: Record<string, string> = {
  吴月娘: '先坐吧。内宅人多，各有各的性情。你今日想问哪一桩事？',
  潘金莲: '才进这宅门，便有许多称呼、许多脸色要认。你找我，是想听句实话，还是也来教我规矩？',
  刘华强: '找我有事？别站那么远，有话当面说。',
  卖瓜老板: '来看看瓜？你想挑个什么样的，跟我说。',
  张飞: '来得正好！有话直说，俺最不耐烦拐弯抹角。你找俺做什么？',
  关羽: '既然来了，便请直言。你有何事要与关某商议？',
  刘备: '请坐，不必拘礼。今日来见我，可是有什么难处？',
  孙悟空: '你倒不怕生。说说，找俺老孙有什么事？',
  唐僧: '施主有礼了。若有什么疑惑，不妨说来听听。',
  猪八戒: '你找俺老猪？先说好，费力不讨好的事，俺可得问个明白。',
  林栀: '你是来找我的？抱歉，我刚才有些走神。你想跟我聊什么？',
  陆晨: '你好，先放松一点。今天是想聊聊训练，还是有别的事想问我？',
};

export function characterGreeting(entry: StudioWorld, targetId: string): CharacterGreeting {
  const role = entry.world.characters.find(item => item.id === targetId);
  if (!role) throw new Error('invalid_conversation_target');
  const place = entry.world.locations.find(item => item.id === role.startLocationId);
  // World + role identity, never a name-only override across unrelated adaptations.
  if (role.chatOpening?.scene?.trim() && role.chatOpening?.text?.trim()) return { ...role.chatOpening };
  if (entry.id === 'libai-moon-debt' && targetId === 'r1') return {
    scene: '临月酒楼三层，窗外月色落在宫墙上，楼下闭坊鼓催得人心里发紧。李白坐在酒桌旁，手边的笔还没有蘸墨。空白诗笺旁压着一张借据，他看了看纸，又把酒杯放下，嘴角带着一点不肯服软的笑意。见你走近，他将诗笺转了个方向。',
    text: '酒倒是好酒，只是有人连我该写什么都替我想好了。你说，诗还没落笔，就先定了价，写出来还能算我的么？',
  };
  let text = openings[role.name];
  if (!text) {
    const tone = role.persona;
    const question = /冷|警惕|寡言|谨慎/.test(tone) ? '你找我有什么事？不妨直说。'
      : /活泼|热情|开朗|嘴贫|幽默/.test(tone) ? '正好，有人聊聊了。你想先聊什么？'
      : /古|仙|江湖/.test(entry.genre) ? '既然相见，便不必拘礼。你有何事想与我谈？'
      : '很高兴见到你。你今天有什么想聊的？';
    text = place ? `在${place.name}碰面，倒也正好。${question}` : question;
  }
  const context = role.publicBackground?.trim();
  return { scene: [place ? `${place.name}。${place.description}` : entry.world.timeSetting,
    context ? `${role.name}此刻的处境：${context}` : `${role.name}就在这里。`,
    `${role.name}注意到你的到来，暂时将目光转向你。`].filter(Boolean).join('\n\n'), text };
}
