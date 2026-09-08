import { createSerial, type Serial } from './serial-worlds.ts';
import type { StudioWorld } from './studio-worlds';

export type ExpansionRole = {
  name: string; identity: string; persona: string; knows: string; secret: string;
  goal: string; first: string; obstacle: string; choices: [string, string, string];
  start?: 'stage' | 'back' | 'side'; art?: number; side?: string;
};
export type ExpansionSeed = {
  id: string; title: string; genre: string; hook: string; opening: string;
  places: Serial['places']; roles: ExpansionRole[]; fixed?: boolean;
  time?: string; physics?: string; rules?: string[]; sourceNote: string;
  sources?: { title: string; url: string }[]; system?: string;
  twist: [string, string, string]; learning?: { evidence: string; misconception: string; transfer: string };
};

export function createExpansion(seed: ExpansionSeed): StudioWorld {
  const asset = (name: string) => `/assets/expansion/${seed.id}/${name}.webp`;
  const base = createSerial({
    id: seed.id, title: seed.title, genre: seed.genre, hook: seed.hook,
    time: seed.time ?? '故事开场当下；后续时间只随玩家行动合理推进。',
    event: seed.opening, cover: asset('cover'), physics: seed.physics,
    places: seed.places, opening: seed.opening,
    roles: seed.roles.map((r, i) => ({
      id: `r${i + 1}`, name: r.name, identity: r.identity, persona: r.persona,
      background: `${r.identity}。${r.persona}`, knowledge: r.knows, secret: r.secret,
      goal: r.goal, start: r.start ?? 'stage', portrait: r.art === 0 ? asset('cover') : asset(`r${r.art ?? Math.min(i + 1, 3)}`),
      appearance: `${r.identity}；${r.persona}。保持配图中已有外貌、时代服饰与标志性道具。`,
      entry: `${r.start && r.start !== 'stage' ? '你目前不在开场现场，不知道未传达的对话。' : '眼前的选择尚未发生，没人替你作答。'}${r.knows}`,
      choices: r.choices,
      arc: [['取得主动权', r.first, r.obstacle], ['把选择变成结果', r.goal, r.obstacle]],
      sideQuest: ['另一条路', r.side ?? `由${r.name}自行决定是否披露自己掌握的一项非公开信息，并与实际接收者谈妥一个具体交换条件；拒绝披露也可另找筹码。`, '旁人可以拒绝，知道秘密不等于拥有对方的信任或控制权。'],
    })),
    links: seed.roles.slice(1).map((_, i) => [0, i + 1, '同一事件中的独立当事人；关系以开场与人物设定为准', 25]),
    twists: [seed.twist],
  });
  base.artNote = seed.sourceNote;
  base.world.openingScene.choices = seed.roles[0].choices.map((label, i) => ({ id: `opening-${i + 1}`, label, intent: label }));
  // Topic fidelity wins over the generic serial builder's melodrama formula.
  base.world.rules = base.world.rules.filter(r => r.id !== 'melodrama' && !(seed.id === 'spider-under-table' && r.id === 'agency'));
  base.world.rules.push({ id: 'adaptation-boundary', kind: 'story', immutable: true, description: seed.sourceNote });
  if (!seed.learning) base.world.rules.push({ id: 'dramatic-action', kind: 'story', immutable: true, description: '每轮先让玩家看见具体动作与即时回应：人会伸手、挡路、抬价、躲避、递物、试探，场景里的物件和路线会被实际使用。不要让每个回合都变成开会核账、流程确认、列责任清单。证据只是争夺的筹码，不替代角色的欲望、犹豫与行动；允许冒险、调情、争执、逃离和出人意料的解法，按世界边界给后果，不因玩家不选最稳妥方案就说教。' });
  (seed.rules ?? []).forEach((description, i) => base.world.rules.push({ id: `authored-${i}`, kind: 'story', immutable: true, description }));
  if (seed.system) {
    base.world.rules.push({ id: 'visible-system', kind: 'physical', immutable: true, description: seed.system });
    base.world.system = {
      name: seed.genre.includes('怪谈') ? '异常观察' : '隐藏词条', premise: seed.system,
      entries: [{ id: 'initial-observation', title: '眼前的线索', description: seed.roles[0].knows, roleIds: ['r1'], requiredTaskIds: [], action: seed.roles[0].choices[0] },
        { id: 'verified-observation', title: '复核后继续追问', description: '已完成首项现场核验。原词条仍只是观察线索，不自动升级为全知；继续行动需面对当前资源与他人真实回应。', roleIds: ['r1'], requiredTaskIds: ['r1-main-1'], action: seed.roles[0].choices[1] }],
    };
  }
  if (seed.fixed) {
    base.fixedRoleId = 'r1'; base.openingImage = base.cover;
    base.world.rules.push({ id: 'first-person', kind: 'knowledge', immutable: true, description: '固定第一人称体验第一个角色。只呈现我当下可感知的信息；不切到他人内心，不代写我的回答与决定，不自动替我原谅、攻击、恋爱或获胜。NPC是独立行动者，没在现场的NPC不能直接插话。' });
  }
  if (seed.learning) {
    base.world.surpriseLevel = 1;
    base.world.rules.push({ id: 'learning-evidence', kind: 'knowledge', immutable: true, description: `通过场景推进而非连续答题框。可核对依据：${seed.learning.evidence}。常见误解：${seed.learning.misconception}。引导分三级：先问理由；仍误解给原文片段/可观察条件；再困难才解释并换例验证。不得因玩家引用了名字或点熟悉选项就判断理解；给开放选择保留不同结果，事实判断必须有证据。` });
    const lastId = 'r1-transfer';
    base.world.tasks.push({ id: lastId, title: '离开这一幕，再试一次', description: seed.learning.transfer, successCondition: seed.learning.transfer, difficulty: '换情境后必须独立说明理由，不复读刚给出的答案。', kind: 'main', assignedRoleIds: ['r1'], prerequisiteTaskIds: ['r1-main-2'] });
    base.world.goals.find(g => g.roleId === 'r1')!.requiredTaskIds.push(lastId);
    base.world.endingConditions.filter(e => e.outcome === 'success' && e.applicableRoleIds?.includes('r1')).forEach(e => { if (!e.requiredTaskIds.includes(lastId)) e.requiredTaskIds.push(lastId); });
  }
  return base;
}
