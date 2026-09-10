import type { StudioWorld } from './studio-worlds';

export type CharacterGreeting = { scene: string; text: string };
// Authored encounter lines, not quotations from the original IP or model output.
const openings: Record<string, string> = {
  李白: '在下李白，字太白。既然来了，便坐一会儿。你是来听诗的，还是有件不便对旁人说的心事？',
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
  let text = openings[role.name];
  if (!text) {
    const tone = role.persona;
    const question = /冷|警惕|寡言|谨慎/.test(tone) ? '你找我有什么事？不妨直说。'
      : /活泼|热情|开朗|嘴贫|幽默/.test(tone) ? '正好，有人聊聊了。你想先聊什么？'
      : /古|仙|江湖/.test(entry.genre) ? '既然相见，便不必拘礼。你有何事想与我谈？'
      : '很高兴见到你。你今天有什么想聊的？';
    text = `我是${role.name}。${question}`;
  }
  return { scene: place ? `${place.name} · ${role.name}与你开始交谈。` : `${role.name}与你开始交谈。`, text };
}
