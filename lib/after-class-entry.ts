import type { WorldDefinition } from './ai-contracts';

export const AFTER_CLASS_ID = 'community-56ed98581aeb49b16bfe83b22761525138a3a139c137955931288b7fe5dfa5d6';
const originalPremise = '高三下学期，成绩垫底的周野被新来的年轻班主任沈知夏抓住一次考试作弊。沈知夏没有上报，而是以此要挟周野替她做一件私事：帮她拿到一份能保住教职的材料。周野的同班女友林小满发现他频繁出入办公室，误以为他移情别恋。三个人都在用自己的方式争取想要的东西：周野想不被开除也不失去女友，沈知夏想留在学校并摆脱一段旧关系，林小满想弄清真相并守住自己的尊严。';
const entries = [
  {
    name: '周野',
    knownFacts: ['沈知夏抓住了你考试作弊，但还没有上报。', '她要你替她取一份材料，你还没有决定如何应对。', '林小满是你的女友，你没有向她说明这些事。'],
    scene: '放学后的办公室里，沈知夏就在你面前。她没有上报你的作弊，却提出要你帮她取材料。你还没答应，也不知道那份材料里到底是什么。',
    choices: ['问清要取什么材料', '询问不答应会怎样', '先听她把话说完'],
  },
  {
    name: '沈知夏',
    knownFacts: ['你抓住周野考试作弊，尚未上报。', '你需要一份能保住教职的材料，希望让周野帮你取来。', '你与校内某位领导有未了结的旧关系，但周野并不知道全部内情。'],
    scene: '放学后的办公室里，周野在桌前等你开口。你掌握他的作弊记录，也需要那份材料；他尚未承诺替你取回。你要说明多少、怎样提出要求，仍由你决定。',
    choices: ['说明需要他做什么', '先问他的打算', '考虑不用要挟的办法'],
  },
  {
    name: '林小满',
    knownFacts: ['周野是你的同班男友。', '你发现他最近频繁往办公室跑，却不知道原因。', '你想弄清发生了什么，目前还没有得到他的解释。'],
    scene: '放学后的走廊上，周野朝办公楼方向走去。你已经留意到他最近常来这里，但不清楚原因。你可以叫住他，也可以先观察；办公室里的谈话不是你已经知道的事。',
    choices: ['叫住周野问清楚', '先观察他的去向', '想想该怎么开口'],
  },
];

// A bounded read-time repair for the exact old published edition. Never overwrite
// author-specified entry points, new characters or a revised story; never migrate saves.
export function afterClassEntry(document: Record<string, unknown>): Record<string, unknown> {
  const world = document.world as WorldDefinition | undefined;
  if (document.id !== AFTER_CLASS_ID || world?.premise !== originalPremise
    || world.characters?.length !== 3 || world.locations?.length !== 3
    || !entries.every((entry, i) => world.characters[i]?.id === `draft-role-${i}` && world.characters[i]?.name === entry.name && !world.characters[i]?.entry)
    || !world.openingScene?.narrative?.includes('体验者将从所选角色')) return document;
  const facts = ['沈知夏抓住周野考试作弊，尚未上报。', '周野最近频繁出入办公室，林小满已留意到，但尚不知道原因。'];
  return { ...document,
    roleChoices: Object.fromEntries(entries.map((entry, i) => [`draft-role-${i}`, entry.choices])),
    world: { ...world,
      storyHook: '放学铃响了，有人却不敢离开办公室。',
      characters: world.characters.map((role, i) => ({ ...role,
        startLocationId: i === 2 ? world.locations[1].id : world.locations[0].id,
        privateKnowledge: entries[i].knownFacts,
        entry: { storyAnchor: 'after_class_before_decision', knownFacts: entries[i].knownFacts, worldFacts: facts, completedTaskIds: [], scene: entries[i].scene },
      })),
      locations: world.locations.map((location, i) => i === 0 ? { ...location, name: '教师办公室', description: '放学后的办公室，桌椅、资料和窗户；走廊在门外。' }
        : i === 1 ? { ...location, name: '办公楼走廊', description: '放学后的走廊连着办公室；从外面不能直接知道室内谈话。' } : location),
      openingScene: { ...world.openingScene, narrative: entries[0].scene, presentCharacterIds: ['draft-role-0', 'draft-role-1'] },
    },
  };
}
