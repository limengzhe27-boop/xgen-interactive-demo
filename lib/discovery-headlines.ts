/** Public discovery invitations. Not dialogue, canon names, or completed actions.
 * Each entry is reviewed against its existing public premise and character persona.
 * Keys are stable; authors' explicit cardHook values still take precedence.
 */
export const DISCOVERY_HEADLINES: Record<string, { world: string; characters: Record<string, string> }> = {
  'libai-moon-debt': { world: '今夜，谁买得起李白的沉默？', characters: { r1: '别急着走，陪我喝完这杯', r2: '欠诗仙的人情，拿什么还', r3: '我惜才，可庇护不是没有条件' } },
  'jingke-map': { world: '地图再展开一寸，秦宫会发生什么？', characters: { r1: '陪荆轲走完这段殿前路', r2: '寡人就在这里，燕使为何迟疑？', r3: '满殿无人敢动，他握紧了药囊' } },
  'ximen-red-ledger': { world: '进了西门府，得宠就够了吗？', characters: { r1: '这一屋的脸色，我偏要看明白', r2: '来清河，怎能不见见西门庆', r3: '新来的妹妹，过来让我瞧瞧' } },
  'peach-source': { world: '桃花深处，竟有人等你说说外面', characters: { r1: '跟着桃花划进去，路还找得回吗', r2: '客从何来？坐下慢慢说', r3: '给我讲讲山外的日子吧' } },
  'borrow-arrows': { world: '借他二十条船，敢不敢瞒住周瑜？', characters: { r1: '船上的人，我得一个不少地带回来', r2: '借船的事，你能替我保密吗', r3: '军资调走了，我这个都督却不知情' } },
  'rome-three-percent': { world: '手机剩3%，在罗马找回飞去巴黎的行李', characters: { r1: '会的英语，怎么一着急全忘了', r2: 'Take your time. What happened?', r3: '手机快没电？先别急' } },
  'moon-parcel': { world: '去月球开快递站，六箱货真能算一箱？', characters: { r1: '这张月球运单，我想重新算算', r2: '秤都轻了，货难道没少？', r3: '别猜了，我们做个小实验' } },
  'campus-three-truths': { world: '一段视频，怎么拍出三个真相', characters: { r1: '今晚这篇报道，和我一起把关', r2: '先把视频看完，再说我打了谁', r3: '我的镜头，会不会也漏了什么' } },
  'cultivation-three-centuries': { world: '闭关三百年，送饭的姑娘说才过一夜', characters: { r1: '出关后，谁还记得我', r2: '昨天才送的饭，你说过了三百年？', r3: '山里的年月，不能这么算' } },
  'spider-under-table': { world: '只有一点蛛丝，怎样守住桌底的家', characters: { r1: '蹲下来，看一眼我的小世界' } },
  'final-circle-future': { world: '决赛圈里，未来的我叫我别捡枪', characters: { r1: '我的下一步，凭什么由他决定', r2: '听我一次，别捡那把枪', r3: '你看见的，和我看见的一样吗' } },
  'emperor-last-decree': { world: '龙椅还没坐热，百官先递来死诏', characters: { r1: '朕还活着，谁替朕写的遗诏', r2: '陛下，这一笔该落了', r3: '让我进殿，有话当面说' } },
  'president-dead-yesterday': { world: '电视在播我的悼词，我却刚上任', characters: { r1: '活着的总统，要怎样证明自己', r2: '悼词还在播，今天的演说怎么办', r3: '先回答我，昨晚死的是谁' } },
  'roommates-yesterday': { world: '今天才搬来，室友却说昨晚见过我', characters: { r1: '谁替我过了昨天', r2: '新室友，我们是不是见过', r3: '相机修好了，昨天的话还算数吗', r4: '先别怕，说说你亲眼看见的' } },
  'nightguard-double': { world: '监控里那个我，正在门外敲门', characters: { r1: '今晚的夜班，陪我盯一会儿', r2: '这份夜班，我也不敢说全懂', r3: '门外那张脸，和你一模一样' } },
  'surrounded-by-beauties': { world: '刚进门，三个姑娘都要我负责', characters: { r1: '租个房，怎么惹出这么多事', r2: '别躲镜头，我想拍真实的你', r3: '先尝一口，再说好不好吃', r4: '聊机器人我在行，聊喜欢就不一定了' } },
  'retro-family-tags': { world: '重回1992，这台缝纫机谁也别想拿走', characters: { r1: '这一世，不再白干一针一线', r2: '亲侄女，真要跟我算这笔账？', r3: '不听辈分，我只看针脚' } },
  'reborn-bride-auction': { world: '婚礼大屏亮起的，竟是股权转让预约', characters: { r1: '这句我愿意，先留给自己', r2: '不签股份，我们的以后怎么办', r3: '别误会，我看上的是公司' } },
  'apocalypse-labels': { world: '末世前囤货，救命药上却写着曾经受潮', characters: { r1: '这回囤货，我不想再信错人', r2: '车等着呢，这箱到底搬不搬', r3: '越慌，越要看清这盒药' } },
  'king-last-light': { world: '最后一道守城光，留给谁', characters: { r1: '来守我身后这一边', r2: '我的伞还没回来，别急着投降', r3: '往哪冲，你给我个准话' } },
  'king-minion-tags': { world: '全峡谷都不听小兵说话，直到他拦了李白的酒', characters: { r1: '小兵说句话，就这么难吗', r2: '想拦我的酒？说来听听', r3: '廊下那个人，一直在等什么' } },
  'king-fate-umbrella': { world: '桥快断了，别再替她选路', characters: { r1: '护得住她，留得住她吗', r2: '为我好，也得先听我说完', r3: '这一局，我不想弃掉任何人' } },
  'zhaoyun-run': { world: '跟赵云上马，还是照导航闯进曹营', characters: { r1: '上马！追兵就在后面', r2: '这单送到曹营，真不是导航坏了？', r3: '别只问追兵，先说箱上的印记' } },
  'pilgrimage-five-secrets': { world: '取经还没出发，队友已经想散伙', characters: { r1: '又要按手印？俺老孙先不签', r2: '先坐下，经可以慢慢念', r3: '这趟取经，你还有什么想问', r4: '取经不耽误吃饭，对吧', r5: '这一次，听听老沙怎么说' } },
  'honest-groom-wedding': { world: '婚礼前听见的那段录音，还要不要放完', characters: { r1: '老实，不等于什么都能忍', r2: '婚礼能继续，有些话却藏不住了', r3: '收据还在，这场婚礼怎么算' } },
  'wife-young-student': { world: '来问妻子的秘密，开门的人却喊我老师', characters: { r1: '这一声老师，把我问愣了', r2: '我以为，他不知道我丈夫是谁', r3: '有些后果，年轻也躲不过去' } },
  'blue-stamp-rumor': { world: '袖口一枚蓝章，街坊编出了十个版本', characters: { r1: '别替我编故事，听我自己说', r2: '我想信她，可街坊都在说', r3: '她忙着劝架，手里却攥着货单' } },
  'ascension-work-number': { world: '天门开了，为什么先叫我的工号', characters: { shen: '苦修百年，不是来换根锁链', registrar: '进门前，先看清这份契' } },
  'yoga-lotus-boundary': { world: '教练的手链没摘，丈夫的消息又来了', characters: { lin: '有人温柔一点，我就舍不得走了', lu: '他的体贴，止于哪一句追问', zhou: '一句你去接，把她推远了多少', wang: '原来被偏爱的，不止我一个？' } },
  'conquest-watermelon': { world: '这个瓜摊，等你开口', characters: { liu: '你这瓜保熟吗？', vendor: '买个瓜，何必较这个劲', companion: '再吵下去，我要不要管', witness: '这次不只看热闹，你会说什么' } },
  'five-supports-one-jungle': { world: '五个辅助抢打野，这把谁来救', characters: { shield: '都保我，这把真能赢', healer: '用治疗打野，是一种艺术', captain: '想赢之前，先把队友劝明白' } },
  'underworld-melon-market': { world: '阴间夜市买个瓜，老板问我付阳寿还是扫码', characters: { qiang: '人间的价，我在阴间也敢砍', judge: '别查业务了，先挑个瓜', courier: '阴阳两界送外卖，最怕替人背锅' } },
  'contract-expiry': { world: '离婚协议刚签，死对头来接人了', characters: { su: '这次道别，我想自己说了算', gu: '她真走了，他才开始慌', shen: '我来接你，不是来劝你回头' } },
  'client-comeback': { world: '被裁后回公司，这次我坐甲方席', characters: { lin: '先别敬酒，说说作品是谁做的', zhou: '前下属坐到对面，这杯酒怎么敬', tang: '名字写上去了，心里却没底' } },
  'inheritance-night': { world: '遗嘱没拆，放弃继承的纸已经递来了', characters: { xu: '不急着认亲，先把这张纸收回去', he: '撑起这个家，就不能多拿一点吗', lu: '谈亲情之前，先把文件看清' } },
  'banquet-creditor': { world: '主桌没有我的位子，债主却在门口等我', characters: { yan: '这顿寿宴，我该坐哪儿', yi: '丈夫不再沉默，她准备好了吗', ting: '酒能敬，过去的事能一笔勾销吗' } },
  'boardroom-reckoning': { world: '昨天逼我背锅，今天由我查账', characters: { chuan: '这口锅，我要一笔笔还回去', zheng: '会议室里，他还想谁都听他的', lan: '别只找我要记录，听听我的条件' } },
  'heir-substitute': { world: '亲生儿子刚回家，先被要求替养子认账', characters: { ye: '回家是团圆，还是替人受罚', yu: '他回来了，我的位置还在吗', zhao: '不想再替这个家收拾残局了' } },
  'palace-witness': { world: '认罪书写好了，连没收过的钱都替我编了', characters: { zhen: '要我认罪，先听完昨夜的事', jiang: '本宫给的恩情，你真要推开', heng: '他们催着移交，我偏要再问一句' } },
  'blood-seal': { world: '刚逐我出山门，传承石却只为我亮', characters: { li: '要我走的是你，不放人的也是你', shu: '荣誉在我身上，光却照向师兄', zhao: '不留你的山门，不一定值得留' } },
  'winter-gate': { world: '全城断暖，赶走我的人又来敲门', characters: { jin: '门可以开，旧账怎么算', xiao: '物资带来了，门为什么还不开', tang: '锅炉能修好，人能重新信吗' } },
  'live-apology': { world: '让我直播道歉？先把试镜原片放出来', characters: { yao: '比起道歉，我更想让你看见我的戏', xiao: '镜头已经开了，她怎么还不念稿', yin: '风向变了，这场直播谁说了算' } },
  'rival-invitation': { world: '我决定离开，他才带着戒指赶来', characters: { qiao: '这次，我想选自己', zheng: '现在把承诺补上，还来得及吗', heng: '先谈你的事业，再谈他的戒指' } },
  'peach-garden-delivery': { world: '外卖送进桃园，刘关张非要留我结义', characters: { man: '穿越可以，这单别给差评', bei: '桃园这碗酒，要不要一起喝', guan: '刀放这儿，咱们讲讲义气', zhang: '你的铁马不吃草，吃什么？' } },
  'monkey-pirate-avengers': { world: '路飞撞上复联，这回听谁的', characters: { luffy: '先吃肉，再去冒险！', wukong: '谁说这里的天不能捅', tony: '先别争队长，把巴士接住' } },
  'three-husbands-system': { world: '婚书刚撕，三个人同时喊我夫人', characters: { snow: '喊夫人之前，问过我了吗', xuan: '退婚还没完，兄长怎么醒了', night: '抢个婚，还得被儿子嫌丢人' } },
  'villain-mother-system': { world: '勇者来杀魔王，一见面却喊了妈', characters: { sui: '系统让我送死，我偏不配合', ran: '妈？你怎么坐魔王位上了', eve: '讨伐魔王，怎么领成了结缘任务' } },
};

export const LEGACY_DISCOVERY_HEADLINES: Record<string, string> = {
  'storm-manor': '暴雨封山，遗嘱却不见了',
  'sea-train': '趁海水回来前，赶上最后一班列车',
  'sixth-roommate': '五个人合租，谁住在第六间房？',
};

export function discoveryHeadline(key: string): { title?: string; tagline?: string } | undefined {
  const [kind, worldId, roleId] = key.split(':');
  const entry = DISCOVERY_HEADLINES[worldId];
  if (!entry) return kind === 'world' && LEGACY_DISCOVERY_HEADLINES[worldId] ? { title: LEGACY_DISCOVERY_HEADLINES[worldId] } : undefined;
  if (kind === 'world') return { title: entry.world };
  return kind === 'character' && entry.characters[roleId] ? { tagline: entry.characters[roleId] } : undefined;
}
