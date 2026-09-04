import type { WorldIncident } from '@/lib/world-state';

export type SurpriseLevel = 1 | 2 | 3 | 4;

const incidents: Record<'storm' | 'draft', WorldIncident[]> = {
  storm: [
    {
      id: 'storm-fallen-photo',
      title: '被雷声震落的旧照片',
      narrative: '就在这时，一声近雷震得门廊墙面发颤。一张旧照片从相框背后落下，背面写着一串房间号。',
      clue: '旧照片背面的房间号',
      relationshipDelta: 1,
      impact: 'minor',
    },
    {
      id: 'storm-landslide',
      title: '山路被落石封住',
      narrative: '山体传来沉闷的断裂声，落石堵住了通往山下的唯一公路。原定在天亮前到达的警察现在无法进入山庄。',
      clue: '外部救援无法按计划抵达',
      relationshipDelta: -3,
      impact: 'moderate',
    },
    {
      id: 'storm-metal-case',
      title: '排水道冲出密封箱',
      narrative: '地下水位突然上涨，一只密封金属箱被水流冲到石阶下。箱内是三年前的报纸，头版照片里站着今夜所有到场的人。',
      clue: '三年前报纸中出现了今夜的宾客',
      relationshipDelta: -6,
      impact: 'major',
    },
  ],
  draft: [
    {
      id: 'draft-ringed-bird',
      title: '撞上玻璃的环志海鸟',
      narrative: '一只海鸟被强风推向玻璃，受惊后落在窗台。它的脚环没有破损，上面刻着的放归日期却是明天。',
      clue: '海鸟脚环标记着未来日期',
      relationshipDelta: 2,
      impact: 'minor',
    },
    {
      id: 'draft-broken-pier',
      title: '旧码头栈桥断裂',
      narrative: '浪头击断了连接旧码头的木栈桥，原本可以直接返回的路消失了。现在只能经过灯塔下方的维修管道。',
      clue: '通往旧码头的栈桥已断',
      relationshipDelta: -2,
      impact: 'moderate',
    },
    {
      id: 'draft-grounded-cargo',
      title: '雾中货船意外搁浅',
      narrative: '一艘被雾流推离航道的货船搁浅在岛外礁石上。漂来的木箱印着与那艘无名船完全相同的徽记。',
      clue: '搁浅货船携带无名船的徽记',
      relationshipDelta: -5,
      impact: 'major',
    },
  ],
};

export function normalizeSurpriseLevel(value: number): SurpriseLevel {
  return Math.max(1, Math.min(4, Math.round(value))) as SurpriseLevel;
}

export function selectIncident(
  worldKind: 'storm' | 'draft',
  levelValue: number,
  completedTurn: number,
): WorldIncident | null {
  const level = normalizeSurpriseLevel(levelValue);
  if (level === 1) return null;
  if (level === 2 && completedTurn !== 2) return null;
  const eventIndex = level === 2
    ? 0
    : level === 3
      ? Math.min(completedTurn - 1, 1)
      : Math.min(completedTurn, 2);
  return incidents[worldKind][eventIndex] ?? null;
}
