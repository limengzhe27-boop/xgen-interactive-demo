'use client';
/* oxlint-disable next/no-img-element -- local prototype assets avoid vinext/next-image runtime duplication */

import { SyntheticEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  ImageIcon,
  Lightbulb,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  UsersRound,
  WandSparkles,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StudioHome, StudioNav } from '@/components/studio-home';
import { AccountBar, PublishWorldDialog } from '@/components/account-publication';
import { AccountBoundary } from '@/components/account-boundary';
import { accountStorageKey } from '@/lib/account-scope';
import { PersonalAgent } from '@/components/personal-agent';
import { pendingMemories, restorePersonalConversation } from '@/lib/personal-memory';
import { knownRecommendations, restoreRecommendations, resolveWorldSelection, recommendationReply } from '@/lib/personal-recommendations';
import type { PersonalAgentRequest, PersonalAgentResponse } from '@/lib/ai-contracts';
import { CharacterChat, CharacterEntry } from '@/components/character-chat';
import { studioWorlds, getRoleOpening } from '@/lib/studio-worlds';
import type { StudioWorld } from '@/lib/studio-worlds';
import { upsertById } from '@/lib/studio-session';
import type { ChatSession } from '@/lib/studio-session';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MessageTextarea } from '@/components/message-textarea';
import { AI_CONTRACT_VERSION, mockAIAdapter } from '@/lib/mock-ai-adapter';
import { cacheSceneImage as cacheImage, getCachedSceneImage as readImage, makeContentImageKey } from '@/lib/image-cache';
import { createInitialImageTask, finishImageTask, startImageTask } from '@/lib/image-task';
import { getRemoteAIStatus, createRemoteAIAdapter } from '@/lib/remote-ai-adapter';
import { generateSceneImage, getRemoteImageStatus } from '@/lib/remote-image-service';
import { shouldGenerateImage } from '@/lib/image-policy';
import {
  commitTurn,
  createInitialWorldState,
  selectRoleGoal,
  recordInterruptedEvent,
  recordRejectedEvent,
  validateAction,
} from '@/lib/world-state';
import { normalizeSurpriseLevel } from '@/lib/surprise-engine';
import { preserveCreatorDetails, preserveCreatorFramework } from '@/lib/creator-framework';
import type { CreatorDetailBaseline } from '@/lib/creator-framework';
import type {
  AgentMemory,
  AIAdapter,
  CreatorAgentResponse,
  CreatorBrief,
  CreatorChatMessage,
  CreatorTaskDraft,
  ImageDirective,
  StoryOutlineBeat,
  WorldDefinition,
  WorldTask,
  WorldTurnRequest,
  WorldTurnResponse,
} from '@/lib/ai-contracts';
import type { ImageTask } from '@/lib/image-task';
import type { ActionValidation, EventRecord, WorldIncident, WorldState } from '@/lib/world-state';

type View = 'home' | 'library' | 'characters' | 'personal' | 'chat' | 'roles' | 'play' | 'create' | 'ending';
type WorldKind = 'storm' | 'suggestion' | 'draft';
type ModelMode = 'checking' | 'real' | 'mock' | 'fallback';
type ImageModelMode = 'checking' | 'real' | 'off' | 'fallback';
type Role = {
  id: string;
  name: string;
  identity: string;
  personality: string;
  publicStory: string;
  secret: string;
  goal: string;
  crop: string;
  visualAnchor: string;
  imageUrl?: string;
};

type StoryChoice = {
  label: string;
  result: string;
  clue: string;
  relationDelta: number;
};

type StoryBeat = {
  title: string;
  location: string;
  text: string;
  speaker: string;
  dialogue: string;
  choices: StoryChoice[];
};

type DraftRole = {
  name: string;
  identity: string;
  personality: string;
  relationship: string;
  appearance: string;
};

type SavedRun = {
  id?: string;
  worldSnapshot?: StudioWorld;
  version: 1;
  worldKind: WorldKind;
  presetId?: PresetWorld['id'];
  worldTitle: string;
  surpriseLevel: number;
  roleId: string;
  turn: number;
  narrative: string;
  lastAction: string;
  lastIncident: WorldIncident | null;
  endingDecision: string;
  worldState: WorldState;
  status: 'playing' | 'ending';
  imageCacheKey?: string;
  currentBeat?: StoryBeat;
  savedAt: number;
};

type PresetWorld = {
  id: 'sea-train' | 'sixth-roommate';
  title: string;
  genre: string;
  complexityLabel: string;
  premise: string;
  surpriseLevel: 1 | 2 | 3 | 4;
  roles: DraftRole[];
  outline: StoryOutlineBeat[];
};

type PersistedDemoState = {
  memories: string[];
  agentConversation?: NonNullable<PersonalAgentRequest['conversation']>;
  personalRecommendations?: PersonalAgentResponse['recommendations'];
  liveMode: boolean;
  surprise: number;
  worldTitle: string;
  worldSeed: string;
  generated: boolean;
  publishedWorld: boolean;
  draftRoles: DraftRole[];
  generatedWorld?: WorldDefinition;
  creatorDetailBaseline?: CreatorDetailBaseline;
  generatedStoryOutline?: StoryOutlineBeat[];
  creatorBrief?: CreatorBrief;
  creatorMessages?: CreatorChatMessage[];
  savedRun?: SavedRun;
};

type CreatorDocument = {
  id: string; savedAt: number;
  data: Pick<PersistedDemoState, 'worldTitle' | 'worldSeed' | 'surprise' | 'draftRoles' | 'generated' | 'generatedWorld' | 'creatorDetailBaseline' | 'generatedStoryOutline' | 'creatorBrief' | 'creatorMessages' | 'publishedWorld'>;
};
type StudioStorage = { version: 1; runs: (SavedRun & { id: string })[]; chats: ChatSession[]; documents: CreatorDocument[]; draftId: string };

function entryRoles(entry: StudioWorld): Role[] {
  return entry.world.characters.map((role, index) => ({ id: role.id, name: role.name, identity: role.identity, personality: role.persona,
    publicStory: role.publicBackground, secret: role.secrets[0] || role.privateKnowledge[0] || '暂无额外私密信息', goal: role.goal,
    crop: ['left', 'center', 'right'][index % 3], visualAnchor: role.imagePrompt, imageUrl: entry.portraits[role.id] }));
}

function entryStory(entry: StudioWorld, roleId: string): StoryBeat[] {
  const role = entry.world.characters.find((item) => item.id === roleId) ?? entry.world.characters[0];
  const present = entry.world.characters.filter((item) => item.id !== role.id && item.startLocationId === role.startLocationId);
  return [{ title: entry.title, location: entry.world.locations.find((place) => place.id === role.startLocationId)?.name ?? '',
    text: getRoleOpening(entry, role.id), speaker: '', dialogue: '',
    choices: entry.roleChoices?.[role.id]?.map((label) => ({ label: `${role.name}：${label}`, clue: '表达自己的立场', result: '', relationDelta: 0 })) ?? [
      { label: `${role.name}：观察眼前的情况，整理我已经知道的信息`, clue: '观察与梳理', result: '', relationDelta: 0 },
      { label: `${role.name}：${present[0] ? `询问${present[0].name}现在的打算` : '尝试联系其他人，询问他们是否方便交谈'}`, clue: '主动沟通', result: '', relationDelta: 0 },
      { label: `${role.name}：检查与我目标有关的公开资料`, clue: '核对资料', result: '', relationDelta: 0 },
    ] }];
}

type RegisteredTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: unknown) => unknown;
};

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: RegisteredTool, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}


const emptyCreatorBrief: CreatorBrief = {
  coreGoal: '',
  successCondition: '',
  failureCondition: '',
  complexityLevel: 2,
  tasks: [],
  difficulties: [],
  scheduledEvents: [],
};

const presetWorlds: PresetWorld[] = [
  {
    id: 'sea-train',
    title: '最后一班海上列车',
    genre: '冒险 · 低意外',
    complexityLabel: '3 个主线条件',
    premise: '一列只在退潮后出现的列车正穿过海床。终点站关闭前，乘客必须找回被调换的通行证；一旦涨潮，所有人都只能留在下一座无人岛。',
    surpriseLevel: 2,
    roles: [
      { name: '沈遥', identity: '临时列车员', personality: '行动果断、方向感极强、不愿欠人情', relationship: '知道顾川的通行证来自失踪的前任列车员', appearance: '二十七岁东亚女性，短黑发，深蓝列车员制服，胸前别旧铜哨' },
      { name: '顾川', identity: '海洋摄影师', personality: '温和、敏锐、遇到危险反而冷静', relationship: '曾在三年前的事故中救过沈遥，却隐瞒了当晚的一段照片', appearance: '三十岁东亚男性，微卷黑发，灰绿防水夹克，斜挎旧相机' },
      { name: '莫叔', identity: '末班车检票员', personality: '守规矩、话少、会优先保护乘客', relationship: '掌握列车停靠无人岛的真实原因', appearance: '五十八岁东亚男性，灰白寸发，黑色检票制服，左手拿老式打孔钳' },
    ],
    outline: [
      { id: 'train-1', title: '退潮后的发车铃', location: '海床站台', objective: '在发车前确认被调换的通行证属于谁', turningPoint: '检票钳在一张空白车票上打出了前任列车员的编号' },
      { id: 'train-2', title: '车窗外的旧站牌', location: '第二节车厢', objective: '判断是否让列车停靠地图上不存在的站点', turningPoint: '顾川的旧照片证明这座站台三年前就曾出现' },
      { id: 'train-3', title: '涨潮前的最后岔轨', location: '驾驶室', objective: '选择驶向终点或转入无人岛支线', turningPoint: '每个角色必须公开一件隐瞒的信息才能改变轨道' },
    ],
  },
  {
    id: 'sixth-roommate',
    title: '合租屋的第六位房客',
    genre: '都市关系 · 高意外',
    complexityLabel: '3 个主线条件',
    premise: '五个人合租的房子里突然多出一套有人生活过的痕迹。房东坚持合同上一直有第六个人，而每位住客都收到了一段只可能由熟人录下的语音。',
    surpriseLevel: 4,
    roles: [
      { name: '唐禾', identity: '新媒体编辑', personality: '细腻、会照顾气氛、习惯把怀疑留到最后', relationship: '与程野是大学同学，却没有告诉其他人两人曾共同租过另一套房', appearance: '二十五岁东亚女性，黑色低马尾，米白针织衫，手腕系绿色发圈' },
      { name: '程野', identity: '自由摄影师', personality: '外向、回避冲突、观察人时过于直接', relationship: '认得第六间房门上的划痕，但否认此前来过', appearance: '二十六岁东亚男性，蓬松短发，深灰连帽衫，肩背相机包' },
      { name: '乔岚', identity: '急诊科护士', personality: '务实、警觉、对不合理细节零容忍', relationship: '半年前曾为一名自称住在这里的人处理过伤口', appearance: '二十九岁东亚女性，齐耳短发，墨绿色夹克，胸袋放蓝色签字笔' },
    ],
    outline: [
      { id: 'room-1', title: '餐桌上的第六副碗筷', location: '合租屋客厅', objective: '确认谁摆出了没有人承认的第六套餐具', turningPoint: '语音里出现了只有其中两位住客知道的旧称呼' },
      { id: 'room-2', title: '打不开的储物间', location: '走廊尽头', objective: '找到储物间钥匙并核对房东的合同', turningPoint: '门内的生活用品分别来自五位住客，却都少了一件' },
      { id: 'room-3', title: '凌晨退租的人', location: '屋顶晒台', objective: '决定公开共同隐瞒的往事还是保护其中一人', turningPoint: '所谓第六位房客其实是五个人对同一段记忆的不同版本' },
    ],
  },
];

const worldCatalog = [
  { id: 'storm-manor', title: '暴雨山庄：缺席的继承人', genre: '悬疑推理', surpriseLevel: 2, premise: '封闭山庄、遗嘱失窃与多角色秘密，适合观察、追问和调查。' },
  ...presetWorlds.map((world) => ({ id: world.id, title: world.title, genre: world.genre, surpriseLevel: world.surpriseLevel, premise: world.premise })),
] as const;

function isSavedRun(value: unknown): value is SavedRun {
  if (!value || typeof value !== 'object') return false;
  const run = value as Partial<SavedRun>;
  const state = run.worldState as Partial<WorldState> | undefined;
  return run.version === 1
    && (run.worldKind === 'storm' || run.worldKind === 'suggestion' || run.worldKind === 'draft')
    && typeof run.worldTitle === 'string'
    && typeof run.surpriseLevel === 'number'
    && typeof run.roleId === 'string'
    && typeof run.turn === 'number'
    && typeof run.narrative === 'string'
    && typeof run.lastAction === 'string'
    && (run.lastIncident === null || typeof run.lastIncident === 'object')
    && typeof run.endingDecision === 'string'
    && (run.status === 'playing' || run.status === 'ending')
    && (run.imageCacheKey === undefined || typeof run.imageCacheKey === 'string')
    && (run.currentBeat === undefined || (typeof run.currentBeat === 'object' && run.currentBeat !== null))
    && typeof run.savedAt === 'number'
    && Boolean(state)
    && typeof state?.turn === 'number'
    && typeof state?.clock === 'string'
    && typeof state?.location === 'string'
    && Array.isArray(state?.clues)
    && Array.isArray(state?.inventory)
    && Array.isArray(state?.eventLedger);
}

const roles: Role[] = [
  {
    id: 'lin-xia',
    name: '林夏',
    identity: '失踪者的姐姐',
    personality: '敏锐、克制、不轻易相信别人',
    publicStory: '为了参加弟弟的遗嘱公布仪式回到阔别十年的山庄。',
    secret: '你收到过弟弟在失踪前发来的空白录音，里面只有三次钟声。',
    goal: '在天亮前找到弟弟，并确认律师是否隐瞒了遗嘱内容。',
    crop: 'left',
    visualAnchor: '二十八岁东亚女性，齐肩黑发，酒红色防雨风衣，银色细链，目光锐利',
  },
  {
    id: 'gu-huai',
    name: '顾淮',
    identity: '家族律师',
    personality: '冷静、谨慎、擅长隐藏情绪',
    publicStory: '受托在午夜公布一份改变所有人命运的新遗嘱。',
    secret: '你知道遗嘱在三天前被替换，但签名看起来完全真实。',
    goal: '找出替换遗嘱的人，同时确保自己保管的原件不被发现。',
    crop: 'center',
    visualAnchor: '三十二岁东亚男性，黑色短发，深灰三件套西装，窄框眼镜，随身携带黑色公文包',
  },
  {
    id: 'zhou-bo',
    name: '周伯',
    identity: '山庄管家',
    personality: '沉默、守序、对旧主人极度忠诚',
    publicStory: '在这座山庄服务了三十年，熟悉每一道门和每一条旧规矩。',
    secret: '你保管着地下酒窖的铜钥匙，昨晚却发现门从里面被打开过。',
    goal: '在警察抵达前封住地下通道，并判断谁值得托付真相。',
    crop: 'right',
    visualAnchor: '六十岁东亚男性，灰白短发与修整胡须，深棕管家制服，右手戴旧皮手套',
  },
];

const sharedFinalChoices: StoryChoice[] = [
  { label: '带上铜钥匙进入地下', result: '你把钥匙握在掌心，率先走进潮湿的地下通道。', clue: '铜钥匙可以打开地下档案室', relationDelta: 12 },
  { label: '要求先公开遗嘱内容', result: '你拦住众人，迫使顾淮说出遗嘱中关于山庄所有权的附加条款。', clue: '遗嘱附加条款：失踪者必须亲自到场', relationDelta: -5 },
  { label: '回到大厅观察谁想离开', result: '你假装放弃调查，却看见一道人影将一张纸塞进了壁炉。', clue: '壁炉里没有烧尽的旧遗嘱', relationDelta: 4 },
];

const roleStoryBeats: Record<string, StoryBeat[]> = {
  'lin-xia': [
    {
      title: '空白录音中的钟声', location: '山庄主厅',
      text: '大厅的座钟敲过十一下，整座山庄忽然断电。黑暗里传来瓷器碎裂的声音。应急灯亮起时，顾淮手中的遗嘱袋不见了。你想起弟弟留下的那段录音，钟声的间隔和刚才一模一样。',
      speaker: '周伯', dialogue: '林小姐，今晚最好不要独自行动。',
      choices: [
        { label: '播放弟弟留下的空白录音', result: '录音里的钟声与大厅座钟重合，但第三声后多出一次金属摩擦声。', clue: '录音暗示座钟内有机关', relationDelta: 8 },
        { label: '追问顾淮为何提前拆封遗嘱', result: '顾淮没有否认，只是把空信封推到你面前：他在断电前就知道里面是空的。', clue: '遗嘱在断电前已被替换', relationDelta: -4 },
        { label: '检查碎瓷片附近的脚印', result: '你在瓷片下找到一点潮湿的红泥，这种泥只出现在山庄西坡。', clue: '来自西坡的红泥', relationDelta: 3 },
      ],
    },
    {
      title: '封闭的西侧走廊', location: '西侧门厅',
      text: '侧门被风吹开，一串带钉靴印延伸向西侧走廊。你的弟弟从不穿这种鞋，但靴印的步幅却与他异常相似。',
      speaker: '顾淮', dialogue: '如果你真的在找他，先想想他为什么希望你听见钟声。',
      choices: [
        { label: '沿靴印直接追进走廊', result: '脚印在一幅旧主人画像前消失，画框后传来极轻的呼吸声。', clue: '脚印在可移动画像前中断', relationDelta: 6 },
        { label: '把红泥拿给周伯辨认', result: '周伯承认西坡有一座封闭的钟楼，而钥匙一直在他手中。', clue: '西坡钟楼与地下通道相连', relationDelta: 12 },
        { label: '当面拆穿顾淮知道录音内容', result: '顾淮的表情第一次失控。他从公文包里取出一把本不该属于他的铜钥匙。', clue: '顾淮也拥有地下区域的钥匙', relationDelta: -8 },
      ],
    },
    { title: '三声钟响之后', location: '画像后的石阶', text: '画像后的窄门打开了。向下的石阶尽头传来三声钟响，与弟弟留下的录音完全一致。', speaker: '周伯', dialogue: '走下去之前，你要决定更相信真相，还是更想保护你弟弟。', choices: sharedFinalChoices },
  ],
  'gu-huai': [
    {
      title: '被替换的遗嘱', location: '山庄主厅',
      text: '十一点的钟声响起，山庄忽然断电。你下意识按住公文包，手中用来掩人耳目的遗嘱袋却被人抽走了。你知道真正的原件还在夹层里。',
      speaker: '林夏', dialogue: '顾律师，你似乎并不惊讶。',
      choices: [
        { label: '说出信封早已被替换', result: '你公开了部分真相，却隐去原件仍在自己手中。林夏暂时放下了敌意。', clue: '失窃的只是伪造遗嘱', relationDelta: 14 },
        { label: '继续隐瞒，检查公文包夹层', result: '原件还在，但封口多了一道新鲜划痕，证明断电前有人尝试打开它。', clue: '原件封口有新鲜划痕', relationDelta: -3 },
        { label: '要求所有人展示双手', result: '周伯右手的手套沾着封蜡，但他声称那是傍晚封闭酒窖时留下的。', clue: '周伯手套上的红色封蜡', relationDelta: -6 },
      ],
    },
    {
      title: '律师的两份原件', location: '山庄书房',
      text: '你避开众人进入书房，却在保险柜里看见另一份签名完全相同的遗嘱。两份文件中，至少有一份来自那位失踪的继承人。',
      speaker: '周伯', dialogue: '顾律师，有些门是为了防外人，有些门是为了防自己人。',
      choices: [
        { label: '对比两份遗嘱的纸张水印', result: '你发现保险柜中的那份使用了十年前停产的家族信笺，内容新，纸张却很旧。', clue: '伪造者能进入家族旧档案室', relationDelta: 5 },
        { label: '把第二份遗嘱交给林夏', result: '林夏读完后告诉你，遗嘱中夹着弟弟只会写给她的一句暗语。', clue: '第二份遗嘱包含失踪者的真实留言', relationDelta: 18 },
        { label: '暂时藏起两份文件', result: '你刚合上保险柜，走廊就传来带钉靴踩过地板的声音。对方知道你在这里。', clue: '穿带钉靴的人在监视书房', relationDelta: -10 },
      ],
    },
    { title: '原件与失踪者', location: '地下档案室入口', text: '你在画像后找到通往档案室的石阶。如果失踪者就在下面，你保管的原件将决定这场失踪是犯罪、逃亡，还是一场自导自演。', speaker: '林夏', dialogue: '你还有最后一次机会告诉我，你究竟在保护谁。', choices: sharedFinalChoices },
  ],
  'zhou-bo': [
    {
      title: '管家丢失的三分钟', location: '山庄主厅',
      text: '座钟响起时，你比任何人都早一秒知道会断电，因为地下配电柜已经三十年没有自动跳闸。应急灯亮起时，遗嘱不见了，而你腰间的铜钥匙也被人动过。',
      speaker: '顾淮', dialogue: '周伯，这里只有你知道所有锁的位置。',
      choices: [
        { label: '立刻检查地下配电柜', result: '配电柜不是故障，有人用铜片卡住了闸刀。铜片来自一把复制钥匙。', clue: '断电者使用了铜钥匙的复制品', relationDelta: 7 },
        { label: '封锁大厅并收走每个人的钥匙', result: '林夏拒绝交出她的房门钥匙，却主动给你听了一段只有钟声的录音。', clue: '失踪者在录音里留下三声钟响', relationDelta: -2 },
        { label: '隐瞒铜钥匙被动过的事', result: '你将钥匙藏进袖口，却发现钥齿上沾着新鲜的地下苔藓。', clue: '有人刚用铜钥匙打开过地下门', relationDelta: -8 },
      ],
    },
    {
      title: '不该打开的酒窖门', location: '地下酒窖',
      text: '酒窖铁门的锁芯没有破坏，门却从里面打开过。地上的水渍尚未干透，通往西坡的老排水道里传来脚步声。',
      speaker: '林夏', dialogue: '我弟弟知道这条路，对吗？你从来没有告诉过我。',
      choices: [
        { label: '承认失踪者曾用这里偷偷离开', result: '你说出了保守十年的秘密：山庄的孩子们曾把这里当作逃生通道。', clue: '排水道可以绕过所有锁住的门', relationDelta: 18 },
        { label: '独自进入排水道追踪', result: '你在通道深处找到一只带钉长靴，尺码比失踪者大了两号。', clue: '带钉靴是为伪造失踪者脚印而准备的', relationDelta: -3 },
        { label: '先查看铁门内侧的锁', result: '锁舌上夹着一根红色纤维，与林夏大衣的颜色很像，纹理却完全不同。', clue: '有人故意用红色纤维嫁祸林夏', relationDelta: 9 },
      ],
    },
    { title: '老主人留下的最后一道锁', location: '地下档案室入口', text: '排水道和画像后的石阶在同一道铜门前交汇。你守了三十年的秘密就在门后，而原本只有一把的钥匙，现在出现了复制品。', speaker: '顾淮', dialogue: '你不能同时保护这座房子和里面的人。', choices: sharedFinalChoices },
  ],
};

function makePlayableDraftRoles(drafts: DraftRole[]): Role[] {
  const crops = ['left', 'center', 'right'];
  const fallbackAppearances = [
    '二十多岁东亚人物，齐肩黑发，墨绿色防风外套，随身携带旧笔记本',
    '三十岁左右东亚人物，黑色短发，深蓝日常外套，佩戴机械表',
    '四十岁左右东亚人物，微卷深色头发，灰色长外套，携带帆布工具包',
  ];
  return drafts.map((draft, index) => ({
    id: `draft-role-${index}`,
    name: draft.name.trim() || `角色 ${index + 1}`,
    identity: draft.identity.trim() || '身份待定',
    personality: draft.personality.trim() || '性格待定',
    publicStory: draft.relationship.trim() || '人物背景尚待创作者补充。',
    secret: '暂无额外私密信息',
    goal: '根据当前世界的目标推进事件。',
    crop: crops[index % crops.length],
    visualAnchor: draft.appearance.trim() || fallbackAppearances[index % fallbackAppearances.length],
  }));
}

function makeDraftStory(playableRoles: Role[], seed: string): Record<string, StoryBeat[]> {
  return Object.fromEntries(playableRoles.map((role, index) => {
    const companion = playableRoles[(index + 1) % playableRoles.length] ?? role;
    return [role.id, [
      {
        title: '雾潮前的第十三次守夜', location: '灯塔值班室',
        text: `${seed || '百年一次的雾潮封锁了海岛。'}你以${role.identity}的身份翻开航海日志，发现最后一页记载的日期是明天。`,
        speaker: companion.name, dialogue: '日志没有写错。错的也许是我们认为的“今天”。',
        choices: [
          { label: '检查日志上的墨迹', result: '墨迹还没有完全干，写下它的人刚离开不久。', clue: '来自明天的记录墨迹未干', relationDelta: 6 },
          { label: `追问${companion.name}是否见过这一页`, result: `${companion.name}承认凌晨醒来时曾看见一个与你身形相似的人在写日志。`, clue: '有人在刻意模仿你的行动', relationDelta: -4 },
          { label: '先将这一页撕下藏起来', result: '纸页离开装订线时，灯塔顶端的光芒瞬间熄灭了一秒。', clue: '航海日志与灯塔设备会相互影响', relationDelta: -7 },
        ],
      },
      {
        title: '无人回应的求救信号', location: '灯塔无线电室',
        text: '无线电里传来一段循环求救，声音听起来就像你，背景中却有尚未发生的第三次雾笛。',
        speaker: companion.name, dialogue: '如果这是预警，我们还有时间改掉它。如果是圈套，对方知道你会怎么选。',
        choices: [
          { label: '录下信号并尝试反向回应', result: '你的回应穿过杂音，对面竟然在你开口前就说出了同一句话。', clue: '信号可能来自数分钟后', relationDelta: 9 },
          { label: '切断无线电与主灯的连接', result: '信号停止后，第一次雾笛提前响起，你的行动显然改变了某个时间点。', clue: '主灯是异常信号的放大器', relationDelta: 3 },
          { label: '根据声音背景定位发送者', result: '背景里有海水涌入铁门的声音，发送位置是灯塔下方已封闭的旧码头。', clue: '求救信号来自旧码头', relationDelta: 5 },
        ],
      },
      {
        title: '凌晨三点的灯', location: '灯塔顶层',
        text: '第三次雾笛即将响起，日志中的明天正在变成现在。主灯的开关就在你手边，雾中则出现了一艘不存在于任何名册上的船。',
        speaker: companion.name, dialogue: '熄灯，我们也许能打破循环。亮着，那艘船也许会找到我们。',
        choices: [
          { label: '按照日志的记载熄灯', result: '灯灭后，雾中的船没有消失，反而第一次露出了名字。', clue: '无名船与日志记载的时间循环相关', relationDelta: 8 },
          { label: '违背记录，让主灯继续亮着', result: '光束穿过雾墙，照出了旧码头上另一个正在向你挥手的自己。', clue: '雾潮中存在另一条重叠的世界线', relationDelta: 2 },
          { label: `把最后的决定交给${companion.name}`, result: `${companion.name}没有去碰开关，而是撕掉了航海日志中属于明天的那一页。`, clue: '关系与信任也能改写预定事件', relationDelta: 18 },
        ],
      },
    ] satisfies StoryBeat[]];
  }));
}

function makeGeneratedDraftStory(
  playableRoles: Role[],
  world: WorldDefinition,
  outline: StoryOutlineBeat[],
): Record<string, StoryBeat[]> {
  const locationNames = new Map(world.locations.map((location) => [location.id, location.name]));
  return Object.fromEntries(playableRoles.map((role, roleIndex) => {
    const companion = playableRoles[(roleIndex + 1) % playableRoles.length] ?? role;
    const beats = outline.map((outlineBeat, beatIndex) => {
      const otherNames = playableRoles.filter((item) => item.id !== role.id).map((item) => item.name).join('、');
      const openingChoices: StoryChoice[] = [
        {
          label: `${role.name}：先不表态，观察${otherNames || '其他人'}各自的反应`,
          result: `${role.name}暂时没有暴露真实目的，而是留意每个人回避的问题。`,
          clue: `观察${otherNames || '其他人'}面对核心事件时的即时反应`,
          relationDelta: 1,
        },
        {
          label: `${role.name}：主动找${companion.name}单独谈话，试探真实想法`,
          result: `${role.name}把${companion.name}带到一旁，要求对方说清楚自己的立场。`,
          clue: `确认${companion.name}对“${outlineBeat.objective}”的真实态度`,
          relationDelta: 6,
        },
        {
          label: `${role.name}：暂时保留秘密，先检查现场可以验证的细节`,
          result: `${role.name}从现场细节入手，避免在证据不足时被其他人牵着走。`,
          clue: outlineBeat.turningPoint,
          relationDelta: 3,
        },
      ];
      const fallbackChoices: StoryChoice[] = [
        { label: `直接调查${outlineBeat.location}`, result: `你开始围绕“${outlineBeat.objective}”检查现场。`, clue: outlineBeat.objective, relationDelta: 3 },
        { label: `询问${companion.name}对此事的看法`, result: `${companion.name}必须对当前矛盾作出回应。`, clue: `观察${companion.name}面对问题时的反应`, relationDelta: 7 },
        { label: '暂不表态，观察其他人的行动', result: '你没有立刻暴露目的，而是把注意力放在其他人的下一步。', clue: outlineBeat.turningPoint, relationDelta: 1 },
      ];
      return {
        title: outlineBeat.title,
        location: beatIndex === 0
          ? locationNames.get(world.openingScene.locationId) ?? outlineBeat.location
          : outlineBeat.location,
        text: beatIndex === 0
          ? `${world.openingScene.narrative}\n\n你以${role.name}的身份进入，当前目标是：${role.goal}`
          : `${outlineBeat.objective}。${outlineBeat.turningPoint}`,
        speaker: companion.name,
        dialogue: beatIndex === 0 ? `${role.name}，事情已经开始偏离我们原先的判断。` : `如果要继续，我们必须先处理“${outlineBeat.objective}”。`,
        choices: beatIndex === 0 ? openingChoices : fallbackChoices,
      } satisfies StoryBeat;
    });
    return [role.id, beats];
  }));
}

function normalizeGeneratedWorld(world: WorldDefinition, drafts: DraftRole[]): WorldDefinition {
  const characterIdMap = new Map<string, string>();
  world.characters.forEach((character, index) => characterIdMap.set(character.id, `draft-role-${index}`));
  return {
    ...world,
    id: 'draft-generated-world',
    characters: world.characters.map((character, index) => ({
      ...character,
      id: `draft-role-${index}`,
      name: drafts[index]?.name.trim() || character.name,
      identity: drafts[index]?.identity.trim() || character.identity,
      persona: drafts[index]?.personality.trim() || character.persona,
      imagePrompt: drafts[index]?.appearance.trim() || character.imagePrompt,
    })),
    relationships: world.relationships.map((relationship) => ({
      ...relationship,
      fromCharacterId: characterIdMap.get(relationship.fromCharacterId) ?? relationship.fromCharacterId,
      toCharacterId: characterIdMap.get(relationship.toCharacterId) ?? relationship.toCharacterId,
    })),
    goals: world.goals.map((goal) => ({
      ...goal,
      roleId: goal.roleId ? characterIdMap.get(goal.roleId) ?? goal.roleId : undefined,
    })),
    tasks: world.tasks.map((task) => ({
      ...task,
      assignedRoleIds: task.assignedRoleIds.map((id) => characterIdMap.get(id) ?? id),
    })),
    endingConditions: world.endingConditions.map((ending) => ({
      ...ending,
      applicableRoleIds: ending.applicableRoleIds?.map((id) => characterIdMap.get(id) ?? id),
    })),
    openingScene: {
      ...world.openingScene,
      presentCharacterIds: world.openingScene.presentCharacterIds.map((id) => characterIdMap.get(id) ?? id),
    },
  };
}

function enforceRolePerspective(choice: StoryChoice, selectedRole: Role, availableRoles: Role[]): StoryChoice {
  const label = choice.label.trim();
  const selectedPrefix = `${selectedRole.name}：`;
  if (label.startsWith(selectedPrefix)) return choice;
  if (label.startsWith(selectedRole.name)) {
    return { ...choice, label: `${selectedPrefix}${label.slice(selectedRole.name.length).replace(/^[\s，,:：]+/, '')}` };
  }
  const foreignActor = availableRoles.find((role) => role.id !== selectedRole.id && label.startsWith(role.name));
  if (foreignActor) {
    return {
      ...choice,
      label: `${selectedPrefix}针对${foreignActor.name}的行动作出回应，并${choice.clue}`,
    };
  }
  return { ...choice, label: `${selectedPrefix}${label}` };
}

function enforceBeatPerspective(beat: StoryBeat, selectedRole: Role, availableRoles: Role[]): StoryBeat {
  return {
    ...beat,
    choices: beat.choices.map((choice) => enforceRolePerspective(choice, selectedRole, availableRoles)),
  };
}

function responseToStoryBeat(response: WorldTurnResponse, fallback: StoryBeat, availableRoles: Role[], selectedRole: Role, world?: WorldDefinition): StoryBeat {
  const firstDialogue = response.dialogue[0];
  const speaker = availableRoles.find((role) => role.id === firstDialogue?.characterId)?.name ?? fallback.speaker;
  const dialogue = response.dialogue.filter((item) => item.visibleToRoleIds.includes(selectedRole.id)).map((item) => item.text).join('\n');
  const choices = response.nextChoices.length > 0
    ? response.nextChoices.map((choice) => enforceRolePerspective({
      label: choice.label,
      result: `你选择了“${choice.label}”。`,
      clue: choice.intent,
      relationDelta: 3,
    }, selectedRole, availableRoles))
    : fallback.choices.map((choice) => enforceRolePerspective(choice, selectedRole, availableRoles));
  return {
    title: fallback.title,
    location: world?.locations.find((location) => location.id === response.statePatch.locationId)?.name
      || response.statePatch.locationId
      || fallback.location,
    text: response.narrative,
    speaker,
    dialogue,
    choices,
  };
}

const surpriseLabels = ['平稳推进', '偶有插曲', '充满变数', '命运难料'];

function toAgentMemories(values: string[]): AgentMemory[] {
  return values.map((value, index) => ({
    id: `saved-memory-${index + 1}`,
    category: 'profile',
    value,
    confidence: 1,
    source: 'explicit',
    requiresConfirmation: false,
  }));
}

function tasksFromStory(story: StoryBeat[], roleIds: string[]): WorldTask[] {
  return story.map((beat, index) => ({
    id: `task-${index + 1}`,
    title: beat.title,
    description: beat.text,
    kind: 'main',
    assignedRoleIds: roleIds,
    prerequisiteTaskIds: index > 0 ? [`task-${index}`] : [],
    successCondition: beat.choices.map((choice) => choice.clue).join('／'),
    difficulty: index === 0 ? '需要从不同角色的说法中判断真伪' : '前一项主线条件完成后才能稳定推进',
  }));
}

function briefTasksToWorldTasks(tasks: CreatorTaskDraft[], roleIds: string[]): WorldTask[] {
  return tasks.map((task, index) => ({
    ...task,
    id: task.id || `creator-task-${index + 1}`,
    assignedRoleIds: roleIds,
  }));
}

function normalizeCreatorBrief(brief: CreatorBrief): CreatorBrief {
  return {
    coreGoal: brief.coreGoal?.trim() || '',
    successCondition: brief.successCondition?.trim() || '',
    failureCondition: brief.failureCondition?.trim() || '',
    complexityLevel: normalizeSurpriseLevel(brief.complexityLevel || 2),
    tasks: Array.isArray(brief.tasks) ? brief.tasks : [],
    difficulties: Array.isArray(brief.difficulties) ? brief.difficulties : [],
    scheduledEvents: Array.isArray(brief.scheduledEvents) ? brief.scheduledEvents : [],
  };
}

function buildWorldDefinition(
  kind: 'storm' | 'draft',
  title: string,
  premise: string,
  availableRoles: Role[],
  story: StoryBeat[],
  surpriseLevel: number,
): WorldDefinition {
  const locationIds = new Map<string, string>();
  story.forEach((beat, index) => locationIds.set(beat.location, `location-${index + 1}`));
  const taskDefinitions = tasksFromStory(story, availableRoles.map((role) => role.id));
  const mainTaskIds = taskDefinitions.map((task) => task.id);
  return {
    id: kind === 'storm' ? 'storm-manor' : 'draft-lighthouse',
    title,
    premise,
    timeSetting: kind === 'storm' ? '暴雨封山的午夜之前' : '雾潮抵达顶峰前的二十分钟',
    locations: story.map((beat, index) => ({
      id: locationIds.get(beat.location) ?? `location-${index + 1}`,
      name: beat.location,
      description: beat.text,
      connectedLocationIds: story[index + 1] ? [locationIds.get(story[index + 1].location) ?? `location-${index + 2}`] : [],
    })),
    characters: availableRoles.map((role) => ({
      id: role.id,
      name: role.name,
      identity: role.identity,
      persona: role.personality,
      publicBackground: role.publicStory,
      privateKnowledge: [role.secret],
      secrets: [role.secret],
      goal: role.goal,
      startLocationId: locationIds.get(story[0].location) ?? 'location-1',
      imagePrompt: `${role.visualAnchor}，${role.identity}，${role.personality}，电影感角色立绘`,
    })),
    relationships: availableRoles.slice(1).map((role) => ({
      fromCharacterId: availableRoles[0].id,
      toCharacterId: role.id,
      publicLabel: '共同卷入核心事件，但彼此掌握的信息不同',
      initialTrust: 42,
    })),
    rules: [
      { id: 'physical-consistency', description: '遵守现实物理规律，行动必须具备可执行条件。', kind: 'physical', immutable: true },
      { id: 'limited-knowledge', description: '角色只能使用自己知道或已经发现的信息。', kind: 'knowledge', immutable: true },
      { id: 'committed-history', description: '已经发生的事件不能被后续叙事无故推翻。', kind: 'story', immutable: true },
    ],
    coreEvent: premise,
    surpriseLevel: normalizeSurpriseLevel(surpriseLevel),
    goals: [{ id: 'world-goal', title: '完成你的角色目标', description: '完成必要条件并对核心事件作出决定。', scope: 'world', requiredTaskIds: mainTaskIds }],
    tasks: taskDefinitions,
    difficultyConstraints: taskDefinitions.map((task, index) => ({
      id: `constraint-${index + 1}`,
      description: task.difficulty,
      blocksTaskId: task.id,
      bypassCondition: task.successCondition,
      consequence: '强行跳过只会导致失败或触发新代价',
    })),
    scheduledEvents: [{ id: 'pressure-event', title: '外部压力逼近', trigger: '当玩家长时间未推进主线时', earliestTurn: 3, effect: '改变角色立场或可用路线，不直接给出答案' }],
    endingConditions: [{ id: 'core-event', description: '完成所有必要任务并对核心事件作出决定。', requiredTaskIds: mainTaskIds, requiredFacts: [] }],
    openingScene: {
      locationId: locationIds.get(story[0].location) ?? 'location-1',
      narrative: story[0].text,
      presentCharacterIds: availableRoles.map((role) => role.id),
      choices: story[0].choices.map((choice, index) => ({
        id: `opening-choice-${index + 1}`,
        label: choice.label,
        intent: choice.clue,
      })),
    },
  };
}

function makeEditableOutline(seed: string, drafts: DraftRole[]): StoryOutlineBeat[] {
  const lead = drafts[0]?.name.trim() || '主角';
  const counterpart = drafts[1]?.name.trim() || '另一位角色';
  const event = seed.trim() || `${lead}与${counterpart}被卷入一件必须共同解决的事件。`;
  return [
    { id: 'manual-1', title: '事件发生', location: '最初的会面现场', objective: `让所有角色面对“${event.slice(0, 36)}”`, turningPoint: `${counterpart}的反应暴露出一条没有说出口的信息` },
    { id: 'manual-2', title: '关系开始变化', location: '可以私下交谈的空间', objective: '通过行动、观察或对话验证彼此的说法', turningPoint: `${lead}必须决定相信谁，并为这个判断承担后果` },
    { id: 'manual-3', title: '作出最后选择', location: '核心事件的关键现场', objective: '解决当前事件，并决定人物关系的去向', turningPoint: '体验者的选择形成阶段结局，但可以继续探索结局后的世界' },
  ];
}

function briefFromOutline(outline: StoryOutlineBeat[], premise: string, complexityLevel: 1 | 2 | 3 | 4 = 2): CreatorBrief {
  const tasks: CreatorTaskDraft[] = outline.map((beat, index) => ({
    id: `brief-task-${index + 1}`,
    title: beat.title,
    description: beat.objective,
    kind: 'main',
    prerequisiteTaskIds: index > 0 ? [`brief-task-${index}`] : [],
    successCondition: beat.turningPoint,
    difficulty: index === 0 ? '需要从多名角色手中拼出真实立场' : '上一项条件完成后才能稳定推进',
  }));
  return {
    coreGoal: premise,
    successCondition: '完成全部主线条件并对核心冲突作出选择',
    failureCondition: '关键时限到达，或核心目标已无法完成',
    complexityLevel,
    tasks,
    difficulties: ['信息分散在不同角色手中', '跳过前置条件会引发代价'],
    scheduledEvents: [{ title: '外部压力逼近', trigger: '玩家停滞或接近最终任务时', effect: '改变可用路线和角色立场' }],
  };
}

function buildCreatorWorld(
  title: string,
  seed: string,
  drafts: DraftRole[],
  outline: StoryOutlineBeat[],
  surpriseLevel: number,
  creatorBrief: CreatorBrief,
  baseWorld?: WorldDefinition | null,
): WorldDefinition {
  const playableRoles = makePlayableDraftRoles(drafts);
  const safeTitle = title.trim() || `${playableRoles[0]?.name || '角色'}的小世界`;
  const safeSeed = seed.trim() || `${playableRoles.map((role) => role.name).join('、')}正在面对一件会改变彼此关系的事件。`;
  const safeOutline = outline.length >= 3 ? outline : makeEditableOutline(safeSeed, drafts);
  const fallbackStory: StoryBeat[] = safeOutline.map((beat) => ({
    title: beat.title, location: beat.location, text: `${safeSeed}\n\n${beat.objective}。${beat.turningPoint}`,
    speaker: '', dialogue: '', choices: [
      { label: '先观察当前现场', result: '根据观察确认当前情况。', clue: beat.objective, relationDelta: 0 },
      { label: '询问在场的人', result: '通过交流了解对方的立场。', clue: beat.turningPoint, relationDelta: 0 },
    ],
  }));
  const fallbackWorld = buildWorldDefinition('draft', safeTitle, safeSeed, playableRoles, fallbackStory, surpriseLevel);
  const locationIds = safeOutline.map((_, index) => `creator-location-${index + 1}`);
  const nextWorld = baseWorld ?? fallbackWorld;
  const normalizedBrief = normalizeCreatorBrief(creatorBrief);
  const creatorTasks = normalizedBrief.tasks.length > 0
    ? briefTasksToWorldTasks(normalizedBrief.tasks, playableRoles.map((role) => role.id))
    : tasksFromStory(fallbackStory, playableRoles.map((role) => role.id));
  const mainTaskIds = creatorTasks.filter((task) => task.kind === 'main').map((task) => task.id);
  return {
    ...nextWorld,
    id: baseWorld?.id || 'draft-generated-world',
    title: safeTitle,
    premise: safeSeed,
    timeSetting: baseWorld?.timeSetting || '故事开始的当下；具体时间以创作者设定为准',
    coreEvent: safeSeed,
    surpriseLevel: normalizeSurpriseLevel(surpriseLevel),
    goals: [{
      id: 'creator-world-goal',
      title: normalizedBrief.coreGoal || '完成你的角色目标',
      description: normalizedBrief.successCondition || '完成主线任务并对核心事件作出选择',
      scope: 'world',
      requiredTaskIds: mainTaskIds,
    }],
    tasks: creatorTasks,
    difficultyConstraints: normalizedBrief.difficulties.map((description, index) => ({
      id: `creator-constraint-${index + 1}`,
      description,
      blocksTaskId: mainTaskIds[Math.min(index, mainTaskIds.length - 1)],
      bypassCondition: creatorTasks[Math.min(index, creatorTasks.length - 1)]?.successCondition || '满足对应任务条件',
      consequence: '强行跳过会造成失败、信任损失或新障碍',
    })),
    scheduledEvents: normalizedBrief.scheduledEvents.map((event, index) => ({
      id: `creator-event-${index + 1}`,
      ...event,
      earliestTurn: Math.max(2, index + 2),
    })),
    endingConditions: [{
      id: 'creator-ending',
      description: normalizedBrief.successCondition || '完成所有主线任务后触发结局',
      requiredTaskIds: mainTaskIds,
      requiredFacts: [],
      outcome: 'success',
      forbiddenFacts: normalizedBrief.failureCondition ? [normalizedBrief.failureCondition] : [],
    }, ...(normalizedBrief.failureCondition ? [{
      id: 'creator-failure', outcome: 'failure' as const,
      description: normalizedBrief.failureCondition, requiredTaskIds: [],
      requiredFacts: [normalizedBrief.failureCondition],
    }] : [])],
    locations: safeOutline.map((beat, index) => ({
      id: locationIds[index],
      name: beat.location.trim() || `场景 ${index + 1}`,
      description: `${beat.objective}。${beat.turningPoint}`,
      connectedLocationIds: locationIds[index + 1] ? [locationIds[index + 1]] : [],
    })),
    characters: playableRoles.map((role, index) => {
      const existing = baseWorld?.characters[index];
      return {
        ...(existing ?? fallbackWorld.characters[index]),
        id: role.id,
        name: role.name,
        identity: role.identity,
        persona: role.personality,
        publicBackground: role.publicStory,
        privateKnowledge: existing?.privateKnowledge ?? [role.secret],
        secrets: existing?.secrets ?? [role.secret],
        goal: existing?.goal || normalizedBrief.coreGoal || role.goal,
        startLocationId: locationIds[0],
        imagePrompt: role.visualAnchor,
      };
    }),
    openingScene: {
      ...nextWorld.openingScene,
      locationId: locationIds[0],
      narrative: `${safeSeed}\n\n${safeOutline[0].objective}。${safeOutline[0].turningPoint}。体验者将从所选角色的身份、目标和已知信息出发决定下一步。`,
      presentCharacterIds: playableRoles.map((role) => role.id),
    },
  };
}

function stableVisualSeed(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function portraitCacheKey(role: DraftRole) {
  return makeContentImageKey('portrait', role.name, role.identity, role.personality, role.appearance);
}

function toSceneContext(beat: StoryBeat, sceneIndex: number, availableRoles: Role[]): WorldTurnRequest['currentScene'] {
  return {
    id: `scene-${sceneIndex + 1}`,
    title: beat.title,
    narrative: beat.text,
    speakerCharacterId: availableRoles.find((role) => role.name === beat.speaker)?.id,
    dialogue: beat.dialogue,
    choices: beat.choices.map((choice, index) => ({
      id: `scene-${sceneIndex + 1}-choice-${index + 1}`,
      label: choice.label,
      intent: choice.clue,
      outcomeHint: choice.result,
      statePatchHint: { addClues: [choice.clue], relationshipDeltas: { world: choice.relationDelta } },
    })),
  };
}

export default function Home() {
  return <AccountBoundary>{scope => <WorldStudio accountScope={scope} />}</AccountBoundary>;
}

function WorldStudio({ accountScope }: { accountScope: string }) {
  const demoStorageKey = accountScope === 'pending' ? '' : accountStorageKey('xgen-small-world-demo-v1', accountScope);
  const studioStorageKey = accountScope === 'pending' ? '' : accountStorageKey('xgen-worldstudio-v1', accountScope);
  const getCachedSceneImage = (key: string) => readImage(key, accountScope);
  const cacheSceneImage = (key: string, url: string) => cacheImage(key, url, accountScope);
  const remoteAIAdapter = createRemoteAIAdapter(accountScope);
  const [view, setView] = useState<View>('home');
  const [message, setMessage] = useState('');
  const [agentConversation, setAgentConversation] = useState<NonNullable<PersonalAgentRequest['conversation']>>([]);
  const [agentError, setAgentError] = useState('');
  const [personalRecommendations, setPersonalRecommendations] = useState<PersonalAgentResponse['recommendations']>([]);
  const personalRequestBusy = useRef(false);
  const navigationRevision = useRef(0);
  const [modelMode, setModelMode] = useState<ModelMode>('checking');
  const [imageModelMode, setImageModelMode] = useState<ImageModelMode>('checking');
  const lastImageAttemptTurnRef = useRef(0);
  const [agentThinking, setAgentThinking] = useState(false);
  const [memories, setMemories] = useState<string[]>([]);
  const [pendingPersonalMemories, setPendingPersonalMemories] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role>(roles[0]);
  const [turn, setTurn] = useState(0);
  const [narrative, setNarrative] = useState(roleStoryBeats[roles[0].id][0].text);
  const [lastAction, setLastAction] = useState('');
  const [endingDecision, setEndingDecision] = useState('');
  const [freeAction, setFreeAction] = useState('');
  const [worldState, setWorldState] = useState(() => createInitialWorldState('storm', roles[0].id, roles[0].secret, roleStoryBeats[roles[0].id][0].location));
  const [actionFeedback, setActionFeedback] = useState<ActionValidation | null>(null);
  const [lastIncident, setLastIncident] = useState<WorldIncident | null>(null);
  const [imageTask, setImageTask] = useState<ImageTask>(() => createInitialImageTask('/assets/storm-manor-cover.png'));
  const [isThinking, setIsThinking] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [surprise, setSurprise] = useState(2);
  const [worldTitle, setWorldTitle] = useState('');
  const [worldSeed, setWorldSeed] = useState('');
  const [creatorBrief, setCreatorBrief] = useState<CreatorBrief>(emptyCreatorBrief);
  const [creatorMessages, setCreatorMessages] = useState<CreatorChatMessage[]>([{
    role: 'agent',
    content: '先告诉我：玩家在这个世界里最想得到什么？我会和你一起把它变成目标、任务、困难和结局条件。',
  }]);
  const [creatorMessage, setCreatorMessage] = useState('');
  const [creatorAgentThinking, setCreatorAgentThinking] = useState(false);
  const [creatorProposal, setCreatorProposal] = useState<CreatorAgentResponse['proposal'] | null>(null);
  const [creatorQuestions, setCreatorQuestions] = useState<string[]>(['玩家最终获得什么？', '谁最希望阻止他？', '走捷径要付出什么代价？']);
  const [generated, setGenerated] = useState(false);
  const [generatedWorld, setGeneratedWorld] = useState<WorldDefinition | null>(null);
  const [creatorDetailBaseline, setCreatorDetailBaseline] = useState<CreatorDetailBaseline | null>(null);
  const [generatedStoryOutline, setGeneratedStoryOutline] = useState<StoryOutlineBeat[]>([]);
  const [worldGenerating, setWorldGenerating] = useState(false);
  const [runtimeBeat, setRuntimeBeat] = useState<StoryBeat | null>(null);
  const [roleImages, setRoleImages] = useState<Record<string, string>>({});
  const [roleImageStates, setRoleImageStates] = useState<Record<string, 'idle' | 'generating' | 'ready' | 'error'>>({});
  const [publishedWorld, setPublishedWorld] = useState(false);
  const [communityWorlds, setCommunityWorlds] = useState<StudioWorld[]>([]);
  const [publicationEntry, setPublicationEntry] = useState<StudioWorld | null>(null);
  const [publicationNotice, setPublicationNotice] = useState('');
  const [savedRun, setSavedRun] = useState<SavedRun | null>(null);
  const [savedRuns, setSavedRuns] = useState<(SavedRun & { id: string })[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [creatorDocuments, setCreatorDocuments] = useState<CreatorDocument[]>([]);
  const [draftId, setDraftId] = useState('creator-world');
  const [runId, setRunId] = useState('legacy-run');
  const [activeLibrary, setActiveLibrary] = useState<StudioWorld | null>(null);
  const [libraryRoleImages, setLibraryRoleImages] = useState<Record<string, string>>({});
  const [chatEntry, setChatEntry] = useState<{ entry: StudioWorld; targetId: string } | null>(null);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [storageError, setStorageError] = useState('');
  const [activeWorld, setActiveWorld] = useState<WorldKind>('storm');
  const [suggestedPreset, setSuggestedPreset] = useState<PresetWorld | null>(null);
  const [draftRoles, setDraftRoles] = useState([
    { name: '许知遥', identity: '民俗学研究生', personality: '理性、好奇、怕欠人情', relationship: '为调查失踪渔船首次上岛，对陆沉保持警惕', appearance: '二十四岁，齐肩黑发，墨绿色防风外套，随身携带旧笔记本' },
    { name: '陆沉', identity: '守塔人', personality: '寡言、谨慎、极度守时', relationship: '受上一任守塔人委托保护许知遥，却不愿说明原因', appearance: '三十一岁，黑色短发，深蓝守塔人工作服，左腕佩戴旧机械表' },
  ]);
  const [storageReady, setStorageReady] = useState(false);
  const responseTimerRef = useRef<number | null>(null);
  const streamTimerRef = useRef<number | null>(null);
  const generationControllerRef = useRef<AbortController | null>(null);
  const imageControllerRef = useRef<AbortController | null>(null);
  const imageRequestRef = useRef(0);
  const roleImageRequestRef = useRef<Record<string, number>>({});
  const roleImageKeysRef = useRef<string[]>([]);
  const storageReadFailed = useRef(false);
  const portraitSignature = JSON.stringify(draftRoles.map(portraitCacheKey));

  const playableDraftRoles = makePlayableDraftRoles(draftRoles).map((role, index) => {
    const generatedCharacter = generatedWorld?.characters[index];
    return {
      ...role,
      personality: generatedCharacter?.persona || role.personality,
      publicStory: generatedCharacter?.publicBackground || role.publicStory,
      secret: generatedCharacter?.secrets[0] || role.secret,
      goal: generatedCharacter?.goal || role.goal,
      visualAnchor: generatedCharacter?.imagePrompt || role.visualAnchor,
      imageUrl: roleImages[role.id],
    };
  });
  const suggestedRoles = suggestedPreset ? makePlayableDraftRoles(suggestedPreset.roles) : [];
  const suggestedWorldDefinition = suggestedPreset
    ? buildCreatorWorld(
      suggestedPreset.title,
      suggestedPreset.premise,
      suggestedPreset.roles,
      suggestedPreset.outline,
      suggestedPreset.surpriseLevel,
      briefFromOutline(suggestedPreset.outline, suggestedPreset.premise, suggestedPreset.id === 'sixth-roommate' ? 3 : 2),
    )
    : null;
  const suggestedStories: Record<string, StoryBeat[]> = suggestedPreset && suggestedWorldDefinition
    ? makeGeneratedDraftStory(suggestedRoles, suggestedWorldDefinition, suggestedPreset.outline)
    : {};
  const currentRoles = activeLibrary ? entryRoles(activeLibrary).map((role) => ({ ...role, imageUrl: role.imageUrl || libraryRoleImages[`${activeLibrary.id}:${role.id}`] })) : activeWorld === 'draft' ? playableDraftRoles : activeWorld === 'suggestion' ? suggestedRoles : roles;
  const draftStories = generatedWorld && generatedStoryOutline.length > 0
    ? makeGeneratedDraftStory(playableDraftRoles, generatedWorld, generatedStoryOutline)
    : makeDraftStory(playableDraftRoles, worldSeed);
  const currentStory = activeLibrary ? entryStory(activeLibrary, selectedRole.id) : activeWorld === 'draft'
    ? draftStories[selectedRole.id]
    : activeWorld === 'suggestion'
      ? suggestedStories[selectedRole.id]
      : roleStoryBeats[selectedRole.id];
  const currentBeat = enforceBeatPerspective(
    runtimeBeat ?? currentStory[Math.min(turn, currentStory.length - 1)],
    selectedRole,
    currentRoles,
  );
  const activeWorldTitle = activeLibrary ? activeLibrary.title : activeWorld === 'draft'
    ? (worldTitle || '雾潮灯塔：第十三次守夜')
    : activeWorld === 'suggestion'
      ? suggestedPreset?.title || '推荐世界'
      : '暴雨山庄：缺席的继承人';
  const activeSurprise = activeLibrary ? activeLibrary.world.surpriseLevel : activeWorld === 'draft' ? surprise : activeWorld === 'suggestion' ? suggestedPreset?.surpriseLevel ?? 2 : 2;
  const activeWorldDefinition = activeLibrary ? activeLibrary.world : activeWorld === 'draft'
    ? (generatedWorld?.tasks?.length
      ? { ...generatedWorld, surpriseLevel: normalizeSurpriseLevel(activeSurprise) }
      : buildCreatorWorld(
        worldTitle,
        worldSeed,
        draftRoles,
        generatedStoryOutline,
        activeSurprise,
        creatorBrief.tasks.length > 0 ? creatorBrief : briefFromOutline(generatedStoryOutline.length >= 3 ? generatedStoryOutline : makeEditableOutline(worldSeed, draftRoles), worldSeed),
      ))
    : activeWorld === 'suggestion' && suggestedWorldDefinition
      ? suggestedWorldDefinition
      : buildWorldDefinition('storm', activeWorldTitle, currentStory[0].text, currentRoles, currentStory, activeSurprise);
  const userWorlds: StudioWorld[] = creatorDocuments.filter((doc) => doc.data.publishedWorld && doc.data.generatedWorld).map((doc) => ({
    id: doc.id, title: doc.data.worldTitle, genre: '我的创作', premise: doc.data.worldSeed, cover: '/assets/storm-manor-cover.png', portraits: {},
    world: { ...doc.data.generatedWorld!, id: doc.id, title: doc.data.worldTitle },
    portraitCacheKeys: Object.fromEntries(doc.data.draftRoles.map((role, index) => [doc.data.generatedWorld!.characters[index]?.id ?? `draft-role-${index}`, portraitCacheKey(role)])),
  }));
  const availableStudioWorlds = [...studioWorlds, ...userWorlds, ...communityWorlds];
  useEffect(() => {
    let live = true;
    void fetch('/api/worlds', { cache: 'no-store' }).then(async r => {
      if (!r.ok) return;
      const data = await r.json() as { worlds?: StudioWorld[] };
      if (live && Array.isArray(data.worlds)) setCommunityWorlds(data.worlds);
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  const personalCatalog = [...worldCatalog, ...availableStudioWorlds.map((entry) => ({ id: entry.id, title: entry.title, genre: entry.genre, premise: entry.premise, surpriseLevel: entry.world.surpriseLevel }))];
  const libraryPortraitJSON = JSON.stringify({ id: activeLibrary?.id, keys: activeLibrary?.portraitCacheKeys ?? {} });
  useEffect(() => {
    let active = true;
    const entry = JSON.parse(libraryPortraitJSON) as { id?: string; keys: Record<string, string> };
    void Promise.all(Object.entries(entry.keys).map(async ([id, key]) => [id, await getCachedSceneImage(key).catch(() => null)] as const)).then((images) => {
      if (active) setLibraryRoleImages(Object.fromEntries(images.filter((pair): pair is readonly [string, string] => Boolean(pair[1])).map(([id, url]) => [`${entry.id}:${id}`, url])));
    });
    return () => { active = false; };
  }, [libraryPortraitJSON]);

  useEffect(() => {
    let active = true;
    void Promise.all([getRemoteAIStatus(), getRemoteImageStatus()]).then(([textStatus, imageStatus]) => {
      if (!active) return;
      setModelMode(textStatus.configured ? 'real' : 'mock');
      setImageModelMode(imageStatus.configured ? 'real' : 'off');
    }).catch(() => {
      if (!active) return;
      setModelMode('mock');
      setImageModelMode('off');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (responseTimerRef.current !== null) window.clearTimeout(responseTimerRef.current);
    if (streamTimerRef.current !== null) window.clearInterval(streamTimerRef.current);
    generationControllerRef.current?.abort();
    imageControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (accountScope === 'pending') return;
      try {
        const raw = window.localStorage.getItem(demoStorageKey);
        if (raw) {
          const backupKey = `${demoStorageKey}-before-worldstudio`;
          if (!window.localStorage.getItem(backupKey)) window.localStorage.setItem(backupKey, raw);
          const saved = JSON.parse(raw) as Partial<PersistedDemoState>;
          if (Array.isArray(saved.memories)) setMemories(saved.memories.filter((item) => typeof item === 'string').slice(0, 24));
          setAgentConversation(restorePersonalConversation(saved.agentConversation));
          setPersonalRecommendations(restoreRecommendations(saved.personalRecommendations));
          if (typeof saved.liveMode === 'boolean') setLiveMode(saved.liveMode);
          if (typeof saved.surprise === 'number') setSurprise(Math.max(1, Math.min(4, saved.surprise)));
          if (typeof saved.worldTitle === 'string') setWorldTitle(saved.worldTitle);
          if (typeof saved.worldSeed === 'string') setWorldSeed(saved.worldSeed);
          if (saved.creatorBrief && typeof saved.creatorBrief === 'object') setCreatorBrief(normalizeCreatorBrief(saved.creatorBrief));
          if (Array.isArray(saved.creatorMessages) && saved.creatorMessages.length > 0) {
            setCreatorMessages(saved.creatorMessages.filter((item) => item && (item.role === 'creator' || item.role === 'agent') && typeof item.content === 'string').slice(-12));
          }
          if (typeof saved.generated === 'boolean') setGenerated(saved.generated);
          if (typeof saved.publishedWorld === 'boolean') setPublishedWorld(saved.publishedWorld);
          if (saved.generatedWorld
            && typeof saved.generatedWorld.title === 'string'
            && Array.isArray(saved.generatedWorld.characters)
            && saved.generatedWorld.openingScene
            && Array.isArray(saved.generatedWorld.openingScene.choices)) {
            setGeneratedWorld(saved.generatedWorld);
            const baseline = saved.creatorDetailBaseline;
            if (baseline && Array.isArray(baseline.roles) && Array.isArray(baseline.outline)) setCreatorDetailBaseline(baseline);
            else if (Array.isArray(saved.draftRoles) && Array.isArray(saved.generatedStoryOutline)) {
              setCreatorDetailBaseline({ roles: saved.draftRoles, outline: saved.generatedStoryOutline });
            }
          }
          if (Array.isArray(saved.generatedStoryOutline)
            && saved.generatedStoryOutline.every((beat) => beat && typeof beat.title === 'string' && typeof beat.location === 'string')) {
            setGeneratedStoryOutline(saved.generatedStoryOutline);
          }
          if (isSavedRun(saved.savedRun)) {
            const legacy = saved.savedRun;
            const frozenWorld = legacy.worldSnapshot ?? (legacy.worldKind === 'draft' && saved.generatedWorld ? {
              id: saved.generatedWorld.id, title: legacy.worldTitle, genre: '我的创作', premise: saved.generatedWorld.premise,
              cover: '/assets/storm-manor-cover.png', portraits: {}, world: saved.generatedWorld,
            } : undefined);
            setSavedRun({ ...legacy, worldSnapshot: frozenWorld });
          }
          if (Array.isArray(saved.draftRoles) && saved.draftRoles.length > 0) {
            setDraftRoles(saved.draftRoles.map((role) => ({ ...role, relationship: role.relationship ?? '', appearance: role.appearance ?? '' })));
          }
        }
      } catch {
        storageReadFailed.current = true;
        setStorageError('旧记录无法读取，原始数据仍保留在浏览器中，请勿清除浏览器数据。');
      }
      try {
        const raw = window.localStorage.getItem(studioStorageKey);
        if (raw) {
          const saved = JSON.parse(raw) as StudioStorage;
          if (saved.version !== 1 || !Array.isArray(saved.runs) || !Array.isArray(saved.chats) || !Array.isArray(saved.documents)) throw new Error('unsupported_studio_storage');
          if (!saved.runs.every((run) => isSavedRun(run) && typeof run.id === 'string')
            || !saved.chats.every((chat) => chat?.id && chat.entry?.world?.characters?.some((role) => role.id === chat.playerRoleId)
              && chat.entry.world.characters.some((role) => role.id === chat.targetCharacterId) && chat.playerRoleId !== chat.targetCharacterId
              && chat.state?.characterStates && Array.isArray(chat.turns))
            || !saved.documents.every((doc) => doc?.id && typeof doc.data?.worldTitle === 'string' && typeof doc.data?.worldSeed === 'string' && Array.isArray(doc.data?.draftRoles))) throw new Error('invalid_studio_storage');
          if (saved.version === 1) {
            setSavedRuns(Array.isArray(saved.runs) ? saved.runs.filter((run) => isSavedRun(run) && typeof run.id === 'string') : []);
            setChatSessions(Array.isArray(saved.chats) ? saved.chats.filter((chat) => chat?.id && chat.entry?.world?.characters && Array.isArray(chat.turns)) : []);
            setCreatorDocuments(Array.isArray(saved.documents) ? saved.documents.filter((doc) => doc?.id && doc.data && Array.isArray(doc.data.draftRoles)) : []);
            if (typeof saved.draftId === 'string') setDraftId(saved.draftId);
          }
        }
      } catch { storageReadFailed.current = true; setStorageError('世界库记录读取失败，原始数据已保留，请勿清除浏览器数据。'); }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady || storageReadFailed.current) return;
    const snapshot: PersistedDemoState = {
      memories,
      agentConversation: agentConversation.slice(-40),
      personalRecommendations,
      liveMode,
      surprise,
      worldTitle,
      worldSeed,
      creatorBrief,
      creatorMessages,
      generated,
      publishedWorld,
      draftRoles,
      generatedWorld: generatedWorld ?? undefined,
      creatorDetailBaseline: creatorDetailBaseline ?? undefined,
      generatedStoryOutline,
      savedRun: savedRun ?? undefined,
    };
    try { window.localStorage.setItem(demoStorageKey, JSON.stringify(snapshot)); }
    catch { window.setTimeout(() => setStorageError('浏览器空间不足，最新修改还没有保存。请保持页面打开，勿刷新。'), 0); }
  }, [agentConversation, personalRecommendations, creatorBrief, creatorDetailBaseline, creatorMessages, draftRoles, generated, generatedStoryOutline, generatedWorld, liveMode, memories, publishedWorld, savedRun, storageReady, surprise, worldSeed, worldTitle]);

  const creatorDocumentJSON = JSON.stringify({ worldTitle, worldSeed, surprise, draftRoles, generated, generatedWorld: generatedWorld ?? undefined,
    creatorDetailBaseline: creatorDetailBaseline ?? undefined, generatedStoryOutline, creatorBrief, creatorMessages, publishedWorld });
  useEffect(() => {
    if (!storageReady) return;
    const data = JSON.parse(creatorDocumentJSON) as CreatorDocument['data'];
    if (!data.worldTitle.trim() && !data.worldSeed.trim() && !data.generatedWorld) return;
    const timer = window.setTimeout(() => setCreatorDocuments((current) => upsertById(current, { id: draftId, savedAt: Date.now(), data })), 0);
    return () => window.clearTimeout(timer);
  }, [creatorDocumentJSON, draftId, storageReady]);

  useEffect(() => {
    if (!storageReady || storageReadFailed.current) return;
    try { window.localStorage.setItem(studioStorageKey, JSON.stringify({ version: 1, runs: savedRuns, chats: chatSessions, documents: creatorDocuments, draftId } satisfies StudioStorage)); }
    catch { window.setTimeout(() => setStorageError('世界库保存失败，当前修改尚未落盘。请保持页面打开，勿刷新。'), 0); }
  }, [storageReady, savedRuns, chatSessions, creatorDocuments, draftId]);

  useEffect(() => {
    if (!storageReady || !savedRun) return;
    const migrated = { ...savedRun, id: savedRun.id ?? 'legacy-run' };
    const timer = window.setTimeout(() => setSavedRuns((current) => current.some((run) => run.id === migrated.id && run.savedAt >= migrated.savedAt) ? current : upsertById(current, migrated)), 0);
    return () => window.clearTimeout(timer);
  }, [storageReady, savedRun]);

  useEffect(() => {
    if (!storageReady) return;
    let active = true;
    const keys = JSON.parse(portraitSignature) as string[];
    const unchangedIds = new Set(keys.flatMap((key, index) => key === roleImageKeysRef.current[index] ? [`draft-role-${index}`] : []));
    keys.forEach((key, index) => {
      if (roleImageKeysRef.current[index] && key !== roleImageKeysRef.current[index]) {
        const id = `draft-role-${index}`;
        roleImageRequestRef.current[id] = (roleImageRequestRef.current[id] ?? 0) + 1;
      }
    });
    roleImageKeysRef.current = keys;
    void Promise.all(keys.map(async (key, index) => {
      const roleId = `draft-role-${index}`;
      return [roleId, await getCachedSceneImage(key).catch(() => null)] as const;
    })).then((entries) => {
      if (!active) return;
      const restored = Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1])));
      setRoleImages((current) => ({ ...Object.fromEntries(Object.entries(current).filter(([id]) => unchangedIds.has(id))), ...restored }));
    });
    return () => { active = false; };
  }, [portraitSignature, storageReady]);

  const runSnapshotJSON = JSON.stringify({
    version: 1, id: runId, worldKind: activeWorld, presetId: activeWorld === 'suggestion' ? suggestedPreset?.id : undefined,
    worldTitle: activeWorldTitle, surpriseLevel: activeSurprise, roleId: selectedRole.id, turn, narrative, lastAction, lastIncident,
    endingDecision, worldState, status: view === 'ending' ? 'ending' : 'playing', imageCacheKey: imageTask.cacheKey, currentBeat,
    worldSnapshot: activeLibrary ?? { id: activeWorldDefinition.id, title: activeWorldTitle, genre: '小世界', premise: activeWorldDefinition.premise,
      world: activeWorldDefinition, cover: activeWorld === 'suggestion' ? (suggestedPreset?.id === 'sea-train' ? '/assets/sea-train-cover.jpg' : '/assets/roommate-cover.jpg') : '/assets/storm-manor-cover.png',
      portraits: Object.fromEntries(currentRoles.filter((role) => role.imageUrl && !role.imageUrl.startsWith('data:')).map((role) => [role.id, role.imageUrl!])) },
  });
  useEffect(() => {
    if (!storageReady || isThinking || actionFeedback?.allowed === false || (view !== 'play' && view !== 'ending')) return;
    const timer = window.setTimeout(() => { setSavedRun({ ...JSON.parse(runSnapshotJSON), savedAt: Date.now() }); }, 0);
    return () => window.clearTimeout(timer);
  }, [runSnapshotJSON, actionFeedback?.allowed, isThinking, storageReady, view]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'start_world_exploration',
          title: '开始探索小世界',
          description: '打开暴雨山庄的角色选择页，让用户选择一个身份进入世界。',
          inputSchema: {
            type: 'object',
            properties: { worldId: { type: 'string', enum: ['storm-manor'] } },
            required: ['worldId'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            const worldId = (input as { worldId?: string })?.worldId;
            if (worldId !== 'storm-manor') throw new Error('未知的世界 ID');
            setActiveWorld('storm');
            setSelectedRole(roles[0]);
            setView('roles');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return { worldId, status: 'role_selection_opened' };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function navigate(next: View) {
    navigationRevision.current++;
    if (next !== 'play') stopActiveGeneration();
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function stopActiveGeneration() {
    if (responseTimerRef.current !== null) {
      window.clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
    }
    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    generationControllerRef.current?.abort();
    generationControllerRef.current = null;
    cancelImageTask();
    setIsThinking(false);
  }

  function cancelImageTask() {
    imageRequestRef.current += 1;
    imageControllerRef.current?.abort();
    imageControllerRef.current = null;
    setImageTask((current) => current.status === 'generating'
      ? { ...current, status: 'reused', message: '旧图片任务已停止，继续使用当前场景图' }
      : current);
  }

  function applyImageDirective(directive: ImageDirective, context: {
    sceneTitle: string;
    narrative: string;
    turn: number;
    hasOpeningArt?: boolean;
  }) {
    if (!shouldGenerateImage(directive, context.turn, lastImageAttemptTurnRef.current, context.hasOpeningArt)) {
      // Do not abort a paid request just because the next line of dialogue reuses its scene.
      setImageTask((current) => current.status === 'generating' ? current : {
        ...current, status: 'reused', message: '节省生图 · 沿用场景画面，关键变化时更新',
      });
      return;
    }
    cancelImageTask();
    const requestId = imageRequestRef.current;
    setImageTask((current) => startImageTask(current, directive, requestId));
    if (!directive.required || directive.reason === 'reuse') return;

    if (imageModelMode !== 'real') {
      setImageTask((current) => finishImageTask(current, requestId, {
        error: imageModelMode === 'fallback' ? '生图服务暂时不可用，已复用上一张场景图' : '图片模型未配置，已复用上一张场景图',
      }));
      return;
    }

    const imageController = new AbortController();
    imageControllerRef.current = imageController;
    const cast = currentRoles.map((role) => `${role.name}：${role.visualAnchor}；性格为${role.personality}`).join('。');
    const prompt = ((directive.prompt?.trim() || `${activeWorldTitle}，${context.sceneTitle}。${context.narrative}。角色：${cast}。`).slice(0, 3_200)
      + ` 角色视觉圣经：${cast}。严格保持每个角色的年龄、发型、服装、配饰和体态连续。电影感叙事插画，横向宽银幕构图，暗色克制氛围，环境细节清晰，无文字、无字幕、无水印、无界面元素。`).slice(0, 3_900);
    const cacheKey = makeContentImageKey('scene', activeWorldDefinition, selectedRole.id, directive.sceneId, prompt);
    const seed = stableVisualSeed(`${activeWorld}:${activeWorldTitle}:${selectedRole.id}`);
    void getCachedSceneImage(cacheKey).catch(() => null).then(async (cachedAssetUrl) => {
      if (imageRequestRef.current !== requestId || imageController.signal.aborted) return;
      if (cachedAssetUrl) {
        imageControllerRef.current = null;
        setImageTask((current) => finishImageTask(current, requestId, {
          assetUrl: cachedAssetUrl,
          cacheKey,
        }));
        return;
      }
      lastImageAttemptTurnRef.current = context.turn;
      const result = await generateSceneImage({ requestId, sceneId: directive.sceneId, prompt, seed, purpose: 'scene' }, imageController.signal, accountScope);
      if (imageRequestRef.current !== requestId || imageController.signal.aborted) return;
      const cached = result.persistent
        ? await cacheSceneImage(cacheKey, result.assetUrl).catch(() => false)
        : false;
      if (imageRequestRef.current !== requestId || imageController.signal.aborted) return;
      imageControllerRef.current = null;
      setImageTask((current) => finishImageTask(current, requestId, {
        assetUrl: result.assetUrl,
        cacheKey: cached ? cacheKey : undefined,
      }));
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (imageRequestRef.current !== requestId) return;
      imageControllerRef.current = null;
      setImageTask((current) => finishImageTask(current, requestId, {
        error: '硅基流动生图失败，已复用上一张场景图',
      }));
    });
  }

  async function runAI<T>(operation: (adapter: AIAdapter) => Promise<T>, allowFallback = true): Promise<T> {
    if (modelMode === 'real' || modelMode === 'fallback') {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const result = await operation(remoteAIAdapter);
          setModelMode('real');
          return result;
        } catch {
          if (attempt === 1) setModelMode('fallback');
        }
      }
    }
    if (!allowFallback) throw new Error('真实模型暂时不可用，进度已保留，请重试这次行动。');
    return operation(mockAIAdapter);
  }

  function openStormWorld() {
    setActiveLibrary(null);
    setActiveWorld('storm');
    setSelectedRole(roles[0]);
    setRuntimeBeat(null);
    navigate('roles');
  }

  function openDraftWorld() {
    setActiveLibrary(null);
    const nextRoles = makePlayableDraftRoles(draftRoles);
    if (nextRoles.length === 0) return false;
    if (!generatedWorld?.tasks?.length) materializeCreatorWorld();
    setActiveWorld('draft');
    setSelectedRole(nextRoles[0]);
    setRuntimeBeat(null);
    navigate('roles');
    return true;
  }

  function openCatalogWorld(worldId: string) {
    const libraryEntry = availableStudioWorlds.find((entry) => entry.id === worldId);
    if (libraryEntry) {
      if (!libraryEntry.world.characters.length) return false;
      setActiveLibrary(libraryEntry); setActiveWorld('draft'); setSelectedRole(entryRoles(libraryEntry)[0]); setRuntimeBeat(null); navigate('roles'); return true;
    }
    if (worldId === 'creator-world') {
      return openDraftWorld();
    }
    if (worldId === 'storm-manor') {
      openStormWorld();
      return true;
    }
    const preset = presetWorlds.find((world) => world.id === worldId);
    if (!preset) return false;
    const nextRoles = makePlayableDraftRoles(preset.roles);
    setActiveLibrary(null);
    setSuggestedPreset(preset);
    setActiveWorld('suggestion');
    setSelectedRole(nextRoles[0]);
    setRuntimeBeat(null);
    navigate('roles');
    return true;
  }

  function resumeSavedWorld(input?: SavedRun) {
    const savedRun = input ?? savedRuns[0];
    if (!savedRun) return;
    const savedPreset = savedRun.worldKind === 'suggestion'
      ? presetWorlds.find((world) => world.id === savedRun.presetId)
      : null;
    const savedRoles = savedRun.worldSnapshot ? entryRoles(savedRun.worldSnapshot) : savedRun.worldKind === 'draft'
      ? playableDraftRoles
      : savedRun.worldKind === 'suggestion' && savedPreset
        ? makePlayableDraftRoles(savedPreset.roles)
        : roles;
    const savedRole = savedRoles.find((role) => role.id === savedRun.roleId);
    if (!savedRole || (savedRun.worldKind === 'suggestion' && !savedPreset)) {
      setSavedRun(null);
      return;
    }
    stopActiveGeneration();
    setActiveLibrary(savedRun.worldSnapshot ?? null);
    setRunId(savedRun.id ?? 'legacy-run');
    if (savedPreset) setSuggestedPreset(savedPreset);
    setActiveWorld(savedRun.worldKind);
    if (savedRun.worldKind !== 'storm') setSurprise(normalizeSurpriseLevel(savedRun.surpriseLevel));
    setSelectedRole(savedRole);
    setTurn(savedRun.turn);
    lastImageAttemptTurnRef.current = savedRun.turn;
    setRuntimeBeat(savedRun.currentBeat ?? null);
    setNarrative(savedRun.narrative);
    setLastAction(savedRun.lastAction);
    setEndingDecision(savedRun.endingDecision);
    setWorldState(savedRun.worldState);
    setActionFeedback(null);
    setLastIncident(savedRun.lastIncident);
    const restoredSceneId = `scene-${savedRun.turn + 1}`;
    const restoreRequestId = imageRequestRef.current;
    setImageTask({
      ...createInitialImageTask(savedRun.worldSnapshot?.cover || '/assets/storm-manor-cover.png'),
      requestId: restoreRequestId,
      sceneId: restoredSceneId,
      status: savedRun.imageCacheKey && savedRun.status === 'playing' ? 'generating' : 'reused',
      message: savedRun.imageCacheKey && savedRun.status === 'playing' ? '正在恢复保存的场景图' : '已恢复探索进度',
    });
    if (savedRun.imageCacheKey && savedRun.status === 'playing') {
      void getCachedSceneImage(savedRun.imageCacheKey).then((assetUrl) => {
        if (imageRequestRef.current !== restoreRequestId) return;
        setImageTask((current) => assetUrl
          ? { ...current, status: 'ready', assetUrl, cacheKey: savedRun.imageCacheKey, message: '已恢复保存的场景图' }
          : { ...current, status: 'reused', message: '场景图缓存已失效，已使用世界封面' });
      }).catch(() => {
        if (imageRequestRef.current !== restoreRequestId) return;
        setImageTask((current) => ({ ...current, status: 'reused', message: '场景图恢复失败，已使用世界封面' }));
      });
    }
    navigate(savedRun.status === 'ending' ? 'ending' : 'play');
  }

  async function submitMessage(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = message.trim();
    if (!value || agentThinking || personalRequestBusy.current) return;
    setAgentError('');
    const selection = resolveWorldSelection(value, personalRecommendations, personalCatalog);
    if (selection.kind === 'open') { openPersonalWorld(selection.worldId, value); return; }
    if (selection.kind === 'clarify') {
      setAgentConversation((current) => restorePersonalConversation([...current, { role: 'user', content: value }, { role: 'assistant', content: selection.reply }]));
      setMessage(''); return;
    }
    personalRequestBusy.current = true;
    const revision = navigationRevision.current;
    setAgentThinking(true);
    try {
      const response = await runAI((adapter) => adapter.talkToPersonalAgent({
        contractVersion: AI_CONTRACT_VERSION,
        userMessage: value,
        conversation: agentConversation.slice(-8),
        recommendationContext: personalRecommendations,
        currentMemories: toAgentMemories(memories),
        recentExperiences: [],
        availableWorldIds: personalCatalog.map((entry) => entry.id),
        availableWorlds: personalCatalog,
      }), false);
      // A late response must never pull someone back from a different screen.
      if (revision !== navigationRevision.current) return;
      const recommendations = knownRecommendations(response.recommendations, personalCatalog.map((entry) => entry.id));
      if (response.action?.type === 'open-world') {
        if (!openPersonalWorld(response.action.worldId, value)) return;
      } else {
        setAgentConversation((current) => restorePersonalConversation([...current, { role: 'user', content: value }, { role: 'assistant', content: recommendationReply(response.reply, recommendations, personalCatalog) }]));
      }
      setMessage('');
      setPendingPersonalMemories(pendingMemories(response.memoryCandidates, memories));
      if (recommendations.length) setPersonalRecommendations(recommendations);
    } catch {
      setAgentError('这次没有收到有效回应。输入、已有对话和记忆已保留，可以重试。');
    } finally {
      personalRequestBusy.current = false;
      setAgentThinking(false);
    }
  }

  function openPersonalWorld(worldId: string, userMessage?: string) {
    const world = personalCatalog.find((entry) => entry.id === worldId);
    if (!world || !openCatalogWorld(worldId)) { setAgentError('这本世界目前不可用，请重新推荐或选择其他世界。'); return false; }
    setAgentConversation((current) => restorePersonalConversation([...current,
      { role: 'user', content: userMessage || `打开《${world.title}》` },
      { role: 'assistant', content: `已打开《${world.title}》的身份选择。选好角色后，再开始体验；现在还没有创建新的游戏进度。` }]));
    setMessage('');
    return true;
  }

  function beginWorld() {
    stopActiveGeneration();
    lastImageAttemptTurnRef.current = 0;
    setRunId(crypto.randomUUID());
    const openingBeat = currentStory[0];
    setTurn(0);
    setRuntimeBeat(openingBeat);
    setNarrative(openingBeat.text);
    setLastAction('');
    setEndingDecision('');
    const roleDefinition = activeWorldDefinition.characters.find((character) => character.id === selectedRole.id);
    const openingLocationId = activeLibrary ? roleDefinition?.startLocationId ?? activeWorldDefinition.openingScene.locationId : activeWorldDefinition.openingScene.locationId;
    setWorldState(createInitialWorldState(
      activeWorld,
      selectedRole.id,
      selectedRole.secret,
      openingBeat.location,
      {
        timeSetting: activeWorldDefinition.timeSetting,
        coreEvent: activeWorldDefinition.coreEvent,
        activeGoalId: selectRoleGoal(activeWorldDefinition, selectedRole.id)?.id,
        roleKnowledge: roleDefinition ? [...roleDefinition.privateKnowledge, ...roleDefinition.secrets] : [selectedRole.secret],
        characterLocations: Object.fromEntries(activeWorldDefinition.characters.map((character) => [character.id,
          character.id === selectedRole.id ? openingLocationId : character.startLocationId])),
        characterIds: activeWorldDefinition.characters.map((character) => character.id),
        openingLocationId,
      },
    ));
    setActionFeedback(null);
    setLastIncident(null);
    setImageTask(createInitialImageTask(activeLibrary?.cover || (activeWorld === 'suggestion' ? (suggestedPreset?.id === 'sea-train' ? '/assets/sea-train-cover.jpg' : '/assets/roommate-cover.jpg') : '/assets/storm-manor-cover.png')));
    applyImageDirective({
      required: true,
      reason: 'opening',
      sceneId: `${activeWorld}-opening-${selectedRole.id}`,
      prompt: `${activeWorldTitle}，${openingBeat.title}。${openingBeat.text}。体验者代入${selectedRole.name}，${selectedRole.identity}，${selectedRole.personality}。`,
    }, { sceneTitle: openingBeat.title, narrative: openingBeat.text, turn: 0,
      hasOpeningArt: activeLibrary ? studioWorlds.some((entry) => entry.id === activeLibrary.id) && openingLocationId === activeLibrary.world.openingScene.locationId : activeWorld !== 'draft',
    });
    navigate('play');
  }

  function continueWorld() {
    cancelImageTask();
    // Returning to play does not advance time, reset tasks, or invent a new event.
    setTurn(worldState.turn);
    setNarrative(endingDecision || narrative);
    setRuntimeBeat((current) => ({
      ...(current ?? currentBeat),
      text: endingDecision || narrative,
    }));
    setActionFeedback(null);
    setLastIncident(null);
    navigate('play');
  }

  function takeAction(action: string) {
    const nextAction = action.trim();
    if (!nextAction || (isThinking && !liveMode)) return;
    const validation = validateAction(nextAction, worldState, currentBeat.choices.map((choice) => choice.label));
    if (!validation.allowed) {
      setActionFeedback(validation);
      setWorldState((current) => recordRejectedEvent(current, nextAction, validation.reason ?? '行动未通过世界规则检查。'));
      return;
    }
    const wasStreaming = streamTimerRef.current !== null;
    const preservedText = wasStreaming && narrative
      ? `${narrative}\n\n【你在生成过程中介入，改为：${nextAction}】\n\n`
      : '';
    if (isThinking) {
      stopActiveGeneration();
      setWorldState((current) => recordInterruptedEvent(current, lastAction || '上一个行动'));
    }
    // Ordinary dialogue need not cancel an image request that may already be billed.
    setActionFeedback(null);
    setLastIncident(null);
    setLastAction(nextAction);
    setFreeAction('');
    setIsThinking(true);
    const nextTurn = turn + 1;
    const runtimeWorld = activeWorldDefinition;
    const request: WorldTurnRequest = {
      contractVersion: AI_CONTRACT_VERSION,
      world: runtimeWorld,
      selectedRoleId: selectedRole.id,
      userAction: nextAction,
      state: worldState,
      recentTurns: worldState.eventLedger.filter((event) => event.status === 'committed').slice(-4).map((event) => ({ action: event.action, result: event.result })),
      currentScene: toSceneContext(currentBeat, turn, currentRoles),
      nextScene: nextTurn < currentStory.length ? toSceneContext(currentStory[nextTurn], nextTurn, currentRoles) : undefined,
      interruptedDraft: preservedText || undefined,
    };
    const generationController = new AbortController();
    generationControllerRef.current = generationController;
    responseTimerRef.current = window.setTimeout(() => {
      responseTimerRef.current = null;
      void runAI((adapter) => adapter.advanceWorld(request, generationController.signal), false).then((response) => {
        if (generationController.signal.aborted) return;
        generationControllerRef.current = null;
        if (!response.actionDecision.allowed) {
          const rejected = {
            allowed: false,
            reason: response.actionDecision.reason,
            suggestion: response.actionDecision.suggestedAlternative,
          } satisfies ActionValidation;
          setActionFeedback(rejected);
          setWorldState((current) => recordRejectedEvent(current, nextAction, rejected.reason ?? '行动未通过世界规则检查。'));
          setIsThinking(false);
          return;
        }
        applyImageDirective(response.image, {
          turn: nextTurn,
          sceneTitle: currentStory[nextTurn]?.title ?? '阶段结局',
          narrative: response.narrative,
        });
        const responseClue = response.statePatch.addClues?.[0] ?? '';
        const responseRelation = response.statePatch.relationshipDeltas?.world ?? 0;
        if (response.ending.reached) {
          setTurn(nextTurn);
          setNarrative(response.narrative);
          setRuntimeBeat(responseToStoryBeat(response, currentBeat, currentRoles, selectedRole, runtimeWorld));
          setWorldState((current) => commitTurn(current, {
            action: nextAction,
            result: response.narrative,
            clue: responseClue,
            nextLocation: runtimeWorld.locations.find((location) => location.id === response.statePatch.locationId)?.name || current.location,
            reachedEndingId: response.ending.endingId,
            relationshipDelta: responseRelation,
            clock: response.statePatch.clock,
            addInventory: response.statePatch.addInventory,
            removeInventory: response.statePatch.removeInventory,
            addKnownSecrets: response.statePatch.addKnownSecrets,
            committedFacts: response.statePatch.committedFacts,
            addClues: response.statePatch.addClues,
            completeTaskIds: response.statePatch.completeTaskIds,
            failTaskIds: response.statePatch.failTaskIds,
            taskNotes: response.statePatch.taskNotes,
            characterUpdates: response.statePatch.characterUpdates,
          }));
          setEndingDecision(response.narrative);
          setIsThinking(false);
          navigate('ending');
          return;
        }
        setTurn(nextTurn);
        setLastIncident(response.incident ?? null);
        const fallbackBeat = currentStory[Math.min(nextTurn, currentStory.length - 1)] ?? currentBeat;
        const nextBeat = responseToStoryBeat(response, fallbackBeat, currentRoles, selectedRole, runtimeWorld);
        setRuntimeBeat(nextBeat);
        const fullNarrative = `${preservedText}${response.narrative}`;
        const finishTurn = () => {
          setWorldState((current) => commitTurn(current, {
            action: nextAction,
            result: response.narrative,
            clue: responseClue,
            nextLocation: nextBeat.location,
            relationshipDelta: responseRelation,
            incident: response.incident,
            clock: response.statePatch.clock,
            addInventory: response.statePatch.addInventory,
            removeInventory: response.statePatch.removeInventory,
            addKnownSecrets: response.statePatch.addKnownSecrets,
            committedFacts: response.statePatch.committedFacts,
            addClues: response.statePatch.addClues,
            completeTaskIds: response.statePatch.completeTaskIds,
            failTaskIds: response.statePatch.failTaskIds,
            taskNotes: response.statePatch.taskNotes,
            characterUpdates: response.statePatch.characterUpdates,
          }));
          setIsThinking(false);
        };
        if (!liveMode) {
          setNarrative(fullNarrative);
          finishTurn();
          return;
        }
        setNarrative('');
        let cursor = 0;
        streamTimerRef.current = window.setInterval(() => {
          cursor = Math.min(fullNarrative.length, cursor + 5);
          setNarrative(fullNarrative.slice(0, cursor));
          if (cursor >= fullNarrative.length) {
            if (streamTimerRef.current !== null) window.clearInterval(streamTimerRef.current);
            streamTimerRef.current = null;
            finishTurn();
          }
        }, 34);
      }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        generationControllerRef.current = null;
        setActionFeedback({ allowed: false, reason: '世界暂时没有成功回应这个行动。', suggestion: '请重试，或选择另一种行动。' });
        setIsThinking(false);
      });
    }, liveMode ? 140 : 680);
  }

  function updateDraftRole(index: number, key: keyof DraftRole, value: string) {
    setDraftRoles((current) => current.map((role, roleIndex) => (roleIndex === index ? { ...role, [key]: value } : role)));
    if (key === 'name' || key === 'identity' || key === 'personality' || key === 'appearance') {
      const roleId = `draft-role-${index}`;
      roleImageRequestRef.current[roleId] = (roleImageRequestRef.current[roleId] ?? 0) + 1;
      setRoleImages((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== roleId)));
      setRoleImageStates((current) => ({ ...current, [roleId]: 'idle' }));
    }
  }

  function addDraftRole() {
    setDraftRoles((current) => [...current, { name: '', identity: '', personality: '', relationship: '', appearance: '' }]);
    setGenerated(false);
    setGeneratedWorld(null);
    setGeneratedStoryOutline([]);
  }

  function removeDraftRole(index: number) {
    Object.keys(roleImageRequestRef.current).forEach((id) => { roleImageRequestRef.current[id] += 1; });
    setDraftRoles((current) => current.length <= 2 ? current : current.filter((_, roleIndex) => roleIndex !== index));
    setRoleImages({});
    setRoleImageStates({});
    setGenerated(false);
    setGeneratedWorld(null);
    setGeneratedStoryOutline([]);
  }

  async function generateRoleImage(index: number, regenerate = true) {
    const role = draftRoles[index];
    if (!role) return;
    const roleId = `draft-role-${index}`;
    const requestId = (roleImageRequestRef.current[roleId] ?? 0) + 1;
    roleImageRequestRef.current[roleId] = requestId;
    setRoleImageStates((current) => ({ ...current, [roleId]: 'generating' }));
    const prompt = `单人角色设定立绘，${role.name || `角色${index + 1}`}，身份：${role.identity || '身份待定'}，性格：${role.personality || '性格待定'}，固定外观：${role.appearance || '由身份与性格自然设计外貌和服装'}。全身或四分之三身，正面略侧身，人物完整，电影感写实叙事插画，统一暗色背景，服装和配饰细节清楚，无文字、无水印、无边框、无其他人物。`;
    try {
      const cacheKey = portraitCacheKey(role);
      if (!regenerate) {
        const existing = await getCachedSceneImage(cacheKey).catch(() => null);
        if (roleImageRequestRef.current[roleId] !== requestId) return;
        if (existing) {
          setRoleImages((current) => ({ ...current, [roleId]: existing }));
          setRoleImageStates((current) => ({ ...current, [roleId]: 'ready' }));
          return;
        }
      }
      const result = await generateSceneImage({
        purpose: 'portrait',
        requestId,
        sceneId: `character-${roleId}`,
        prompt,
        seed: regenerate ? Math.floor(Math.random() * 1_000_000_000) : stableVisualSeed(`character:${roleId}:${role.name}:${role.appearance}`),
      }, undefined, accountScope);
      if (roleImageRequestRef.current[roleId] !== requestId) return;
      if (result.persistent) await cacheSceneImage(cacheKey, result.assetUrl).catch(() => false);
      if (roleImageRequestRef.current[roleId] !== requestId) return;
      setRoleImages((current) => ({ ...current, [roleId]: result.assetUrl }));
      setRoleImageStates((current) => ({ ...current, [roleId]: 'ready' }));
    } catch {
      if (roleImageRequestRef.current[roleId] !== requestId) return;
      setRoleImageStates((current) => ({ ...current, [roleId]: 'error' }));
    }
  }

  async function generateAllRoleImages() {
    for (let index = 0; index < draftRoles.length; index += 1) {
      await generateRoleImage(index, false);
    }
  }

  async function submitCreatorMessage(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = creatorMessage.trim();
    if (!value || creatorAgentThinking) return;
    const userEntry: CreatorChatMessage = { role: 'creator', content: value };
    const conversation = [...creatorMessages, userEntry].slice(-10);
    setCreatorMessages(conversation);
    setCreatorMessage('');
    setCreatorAgentThinking(true);
    setCreatorProposal(null);
    try {
      const response = await runAI((adapter) => adapter.coCreateWorld({
        contractVersion: AI_CONTRACT_VERSION,
        userMessage: value,
        conversation,
        characters: draftRoles.filter((role) => role.name.trim() || role.identity.trim() || role.personality.trim()).map((role) => ({
          name: role.name,
          identity: role.identity,
          persona: role.personality,
          relationship: role.relationship,
          appearance: role.appearance,
        })),
        relationshipNotes: draftRoles.map((role) => role.relationship).filter(Boolean),
        currentDraft: {
          title: worldTitle,
          premise: worldSeed,
          surpriseLevel: normalizeSurpriseLevel(surprise),
          brief: normalizeCreatorBrief(creatorBrief),
        },
      }), false);
      setCreatorMessages((current) => [...current, { role: 'agent', content: response.reply } satisfies CreatorChatMessage].slice(-12));
      setCreatorProposal(response.proposal);
      setCreatorQuestions(response.nextQuestions.slice(0, 3));
    } catch {
      setCreatorMessage(value);
      setCreatorMessages((current) => [...current, { role: 'agent', content: '这轮没有成功整理。你的现有设定没有被覆盖，可以重试或先手动编辑右侧框架。' } satisfies CreatorChatMessage].slice(-12));
    } finally {
      setCreatorAgentThinking(false);
    }
  }

  function applyCreatorProposal() {
    if (!creatorProposal) return;
    const brief = normalizeCreatorBrief(creatorProposal.brief);
    setWorldTitle(creatorProposal.title);
    setWorldSeed(creatorProposal.premise);
    setCreatorBrief(brief);
    if (creatorProposal.characters?.length) {
      setDraftRoles(creatorProposal.characters.map((role) => ({ name: role.name, identity: role.identity, personality: role.persona, relationship: role.relationship, appearance: role.appearance })));
      Object.keys(roleImageRequestRef.current).forEach((id) => { roleImageRequestRef.current[id] += 1; });
      setRoleImages({}); setRoleImageStates({});
    }
    setGeneratedStoryOutline(brief.tasks.filter((task) => task.kind === 'main').map((task, index) => ({
      id: `agent-guide-${index + 1}`,
      title: task.title,
      location: generatedStoryOutline[index]?.location || (index === 0 ? '开场场景' : `推进场景 ${index + 1}`),
      objective: task.description,
      turningPoint: task.successCondition,
    })));
    setCreatorProposal(null);
    setGenerated(false);
    setGeneratedWorld(null);
  }

  function updateCreatorBriefField(key: keyof Pick<CreatorBrief, 'coreGoal' | 'successCondition' | 'failureCondition'>, value: string) {
    setCreatorBrief((current) => ({ ...current, [key]: value }));
  }

  function updateCreatorTask(index: number, key: keyof Pick<CreatorTaskDraft, 'title' | 'description' | 'successCondition' | 'difficulty'>, value: string) {
    setCreatorBrief((current) => ({
      ...current,
      tasks: current.tasks.map((task, taskIndex) => taskIndex === index ? { ...task, [key]: value } : task),
    }));
  }

  function addCreatorTask() {
    setCreatorBrief((current) => {
      const index = current.tasks.length;
      const previousMain = [...current.tasks].reverse().find((task) => task.kind === 'main');
      return {
        ...current,
        tasks: [...current.tasks, {
          id: `creator-task-${Date.now()}`,
          title: '新的主线条件',
          description: '玩家需要完成的事情',
          kind: 'main',
          prerequisiteTaskIds: previousMain ? [previousMain.id] : [],
          successCondition: '写下可以明确判定的完成条件',
          difficulty: index === 0 ? '设置一个不能直接跳过的障碍' : '需要完成前一项主线条件',
        }],
      };
    });
  }

  function removeCreatorTask(index: number) {
    setCreatorBrief((current) => {
      const removedId = current.tasks[index]?.id;
      const tasks = current.tasks
        .filter((_, taskIndex) => taskIndex !== index)
        .map((task) => ({ ...task, prerequisiteTaskIds: task.prerequisiteTaskIds.filter((id) => id !== removedId) }));
      return { ...current, tasks };
    });
  }

  async function generateWorld() {
    if (worldGenerating) return;
    setWorldGenerating(true);
    try {
      const fallbackOutline = generatedStoryOutline.length >= 3 ? generatedStoryOutline : makeEditableOutline(worldSeed, draftRoles);
      const effectiveBrief = creatorBrief.tasks.length > 0
        ? normalizeCreatorBrief(creatorBrief)
        : briefFromOutline(fallbackOutline, worldSeed || '完成所选角色的核心目标', normalizeSurpriseLevel(creatorBrief.complexityLevel || 2));
      const response = await runAI((adapter) => adapter.generateWorld({
        contractVersion: AI_CONTRACT_VERSION,
        creatorIntent: worldTitle,
        characters: draftRoles.map((role) => ({
          name: role.name,
          identity: role.identity,
          persona: `${role.personality}${role.appearance ? `；固定外观：${role.appearance}` : ''}`,
        })),
        relationshipNotes: draftRoles.map((role) => role.relationship).filter(Boolean),
        storySeed: worldSeed,
        surpriseLevel: normalizeSurpriseLevel(surprise),
        creatorBrief: effectiveBrief,
      }));
      const normalizedWorld = normalizeGeneratedWorld(response.world, draftRoles);
      const generatedDraftRoles = draftRoles.map((role, index) => ({ ...role, appearance: role.appearance || normalizedWorld.characters[index]?.imagePrompt || '' }));
      setCreatorDetailBaseline({ roles: generatedDraftRoles, outline: response.storyOutline });
      setGeneratedWorld(normalizedWorld);
      setGeneratedStoryOutline(response.storyOutline);
      setCreatorBrief({
        ...effectiveBrief,
        coreGoal: (response.world.goals.find((goal) => goal.scope === 'world') ?? response.world.goals[0])?.title || effectiveBrief.coreGoal,
        successCondition: response.world.endingConditions.find((ending) => (ending.outcome ?? 'success') === 'success')?.description || effectiveBrief.successCondition,
        failureCondition: response.world.endingConditions.find((ending) => ending.outcome === 'failure')?.description || '',
        tasks: response.world.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          kind: task.kind,
          prerequisiteTaskIds: task.prerequisiteTaskIds,
          successCondition: task.successCondition,
          difficulty: task.difficulty,
        })),
        difficulties: response.world.difficultyConstraints.map((constraint) => constraint.description),
        scheduledEvents: response.world.scheduledEvents.map((worldEvent) => ({ title: worldEvent.title, trigger: worldEvent.trigger, effect: worldEvent.effect })),
      });
      setWorldTitle(normalizedWorld.title);
      setWorldSeed(normalizedWorld.premise);
      setDraftRoles((current) => current.map((role, index) => ({ ...role,
        appearance: role.appearance || normalizedWorld.characters[index]?.imagePrompt || '',
      })));
      setGenerated(true);
    } finally {
      setWorldGenerating(false);
    }
  }

  function updateStoryOutline(index: number, key: keyof Pick<StoryOutlineBeat, 'title' | 'location' | 'objective' | 'turningPoint'>, value: string) {
    setGeneratedStoryOutline((current) => current.map((beat, beatIndex) => beatIndex === index || (key === 'location' && beat.location === current[index]?.location) ? { ...beat, [key]: value } : beat));
  }

  function materializeCreatorWorld(outlineInput = generatedStoryOutline) {
    const safeTitle = worldTitle.trim() || `${draftRoles[0]?.name.trim() || '角色'}的小世界`;
    const safeSeed = worldSeed.trim() || `${draftRoles.map((role) => role.name.trim() || '未命名角色').join('、')}正在面对一件会改变彼此关系的事件。`;
    const safeOutline = outlineInput.length >= 3 ? outlineInput : makeEditableOutline(safeSeed, draftRoles);
    const effectiveBrief = creatorBrief.tasks.length > 0
      ? creatorBrief
      : {
        ...creatorBrief,
        coreGoal: creatorBrief.coreGoal.trim() || safeSeed,
        successCondition: creatorBrief.successCondition.trim() || '完成全部主线条件并对核心冲突作出选择',
        tasks: briefFromOutline(safeOutline, safeSeed, normalizeSurpriseLevel(creatorBrief.complexityLevel || 2)).tasks,
      };
    const edited = buildCreatorWorld(safeTitle, safeSeed, draftRoles, safeOutline, surprise, effectiveBrief, generatedWorld);
    const nextBaseline = { roles: draftRoles, outline: safeOutline };
    const world = generatedWorld
      ? preserveCreatorDetails(generatedWorld, preserveCreatorFramework(generatedWorld, edited), creatorDetailBaseline ?? nextBaseline, nextBaseline)
      : edited;
    setCreatorDetailBaseline(nextBaseline);
    setWorldTitle(safeTitle);
    setWorldSeed(safeSeed);
    setGeneratedStoryOutline(safeOutline);
    setGeneratedWorld(world);
    setCreatorBrief(effectiveBrief);
    return world;
  }

  function createWorldFromManualStory() {
    const outline = generatedStoryOutline.length >= 3
      ? generatedStoryOutline
      : makeEditableOutline(worldSeed, draftRoles);
    materializeCreatorWorld(outline);
    setGenerated(false);
    setCreateStep(3);
  }

  function acceptGeneratedPlot() {
    if (generatedStoryOutline.length === 0) return;
    materializeCreatorWorld();
    setCreateStep(3);
  }

  function publishCreatorWorld() {
    const world = materializeCreatorWorld();
    const published = { ...world, id: draftId };
    setGeneratedWorld(published);
    setPublishedWorld(true);
    const entry: StudioWorld = { id: draftId, title: published.title, genre: '我的创作', premise: published.premise, cover: '/assets/storm-manor-cover.png', portraits: {}, world: published,
      portraitCacheKeys: Object.fromEntries(draftRoles.map((role, index) => [published.characters[index]?.id ?? `draft-role-${index}`, portraitCacheKey(role)])) };
    setActiveLibrary(entry); setActiveWorld('draft'); setSelectedRole(entryRoles(entry)[0]); setRuntimeBeat(null); navigate('roles');
  }

  function preparePublicWorld() {
    const world = materializeCreatorWorld();
    const portraits = Object.fromEntries(world.characters.map((role, index) => [role.id, roleImages[`draft-role-${index}`] || '']));
    setPublicationEntry({ id: draftId, title: world.title, genre: '社区创作', premise: world.premise,
      cover: roleImages['draft-role-0'] || '/assets/storm-manor-cover.png', portraits, world });
  }

  function newCreator(seed = '') {
    if (worldGenerating || creatorAgentThinking) { setStorageError('创作 Agent 仍在处理当前作品，请等本次回应结束后再新建。'); return; }
    const data = JSON.parse(creatorDocumentJSON) as CreatorDocument['data'];
    if (data.worldTitle.trim() || data.worldSeed.trim() || data.generatedWorld) setCreatorDocuments((current) => upsertById(current, { id: draftId, savedAt: Date.now(), data }));
    setActiveLibrary(null); setActiveWorld('storm'); setSelectedRole(roles[0]); setRuntimeBeat(null);
    setDraftId(crypto.randomUUID());
    setWorldTitle(''); setWorldSeed(seed); setSurprise(2); setGenerated(false); setGeneratedWorld(null); setPublishedWorld(false);
    setGeneratedStoryOutline([]); setCreatorDetailBaseline(null); setCreatorBrief(emptyCreatorBrief); setCreatorProposal(null);
    setCreatorMessages([{ role: 'agent', content: '先聊聊你想创造什么。不用先填完角色，我可以和你一起想人物、关系、目标和阻力。建议只有在你采纳后才会写入设定。' }]);
    setCreatorMessage(seed);
    setCreatorQuestions(['先帮我想几个互相有纠葛的人物', '一起讨论玩家最终想得到什么', '怎样增加一个有代价的困难？']);
    setDraftRoles([{ name: '', identity: '', personality: '', relationship: '', appearance: '' }, { name: '', identity: '', personality: '', relationship: '', appearance: '' }]);
    setRoleImages({}); setCreateStep(1); navigate('create');
  }

  function editCreator(doc: CreatorDocument) {
    if (worldGenerating || creatorAgentThinking) { setStorageError('请等当前创作回应结束后再切换作品。'); return; }
    setActiveLibrary(null); setActiveWorld('storm'); setSelectedRole(roles[0]); setRuntimeBeat(null);
    const data = doc.data;
    setDraftId(doc.id); setWorldTitle(data.worldTitle); setWorldSeed(data.worldSeed); setSurprise(data.surprise);
    setDraftRoles(data.draftRoles); setGenerated(data.generated); setPublishedWorld(data.publishedWorld);
    setGeneratedWorld(data.generatedWorld ?? null); setCreatorDetailBaseline(data.creatorDetailBaseline ?? null);
    setGeneratedStoryOutline(data.generatedStoryOutline ?? []); setCreatorBrief(data.creatorBrief ?? emptyCreatorBrief);
    setCreatorMessages(data.creatorMessages ?? []); setCreatorProposal(null); setCreateStep(1); navigate('create');
  }

  function saveChat(session: ChatSession) { setChatSessions((current) => upsertById(current, session)); }

  function openRecord(id: string) {
    const doc = creatorDocuments.find((item) => `doc-${item.id}` === id);
    if (doc) { editCreator(doc); return; }
    const run = savedRuns.find((item) => `run-${item.id}` === id);
    if (run) { resumeSavedWorld(run); return; }
    const chat = chatSessions.find((item) => `chat-${item.id}` === id);
    if (chat) { setActiveChat(chat); navigate('chat'); }
  }

  function renderScreen() {
    if (view === 'chat' && activeChat) return <CharacterChat key={`${accountScope}:${activeChat.id}`} accountScope={accountScope} initial={activeChat} onSave={saveChat} onBack={() => navigate('home')} />;
    if (view === 'home' || view === 'library' || view === 'characters') return <StudioHome
      section={view} worlds={[
        ...availableStudioWorlds.map((entry) => ({ ...entry, roleCount: entry.world.characters.length })),
        ...worldCatalog.map((world) => ({ ...world, roleCount: world.id === 'storm-manor' ? roles.length : presetWorlds.find((preset) => preset.id === world.id)?.roles.length ?? 0, cover: world.id === 'storm-manor' ? '/assets/storm-manor-cover.png' : world.id === 'sea-train' ? '/assets/sea-train-cover.jpg' : '/assets/roommate-cover.jpg' }))]}
      characters={[...studioWorlds, ...communityWorlds].flatMap((entry) => entry.world.characters.map((role) => ({ id: role.id, worldId: entry.id, worldTitle: entry.title, name: role.name, identity: role.identity, persona: role.persona, image: entry.portraits[role.id] || entry.cover })))}
      recent={[
        ...creatorDocuments.map((doc) => ({ id: `doc-${doc.id}`, savedAt: doc.savedAt, title: doc.data.worldTitle || '未命名世界', subtitle: '继续编辑角色与故事框架', label: doc.data.publishedWorld ? '可试玩 · 本机作品' : '创作草稿', cover: '/assets/storm-manor-cover.png' })),
        ...savedRuns.map((run) => ({ id: `run-${run.id}`, savedAt: run.savedAt, title: run.worldTitle, subtitle: `${run.worldSnapshot?.world.characters.find((role) => role.id === run.roleId)?.name ?? run.roleId} · ${run.worldState.location}`, label: run.status === 'ending' ? '阶段结局' : '探索记录', cover: run.worldSnapshot?.cover || '/assets/storm-manor-cover.png' })),
        ...chatSessions.map((chat) => ({ id: `chat-${chat.id}`, savedAt: chat.savedAt, title: `与 ${chat.entry.world.characters.find((role) => role.id === chat.targetCharacterId)?.name} 的对话`, subtitle: `你是 ${chat.entry.world.characters.find((role) => role.id === chat.playerRoleId)?.name} · ${chat.entry.title}`, label: '角色对话', cover: chat.entry.portraits[chat.targetCharacterId] || chat.entry.cover })),
      ].sort((a, b) => b.savedAt - a.savedAt)}
      onCreate={newCreator} onOpenWorld={openCatalogWorld} onChat={(worldId, targetId) => { const entry = availableStudioWorlds.find((item) => item.id === worldId); if (entry) setChatEntry({ entry, targetId }); }} onPersonal={() => navigate('personal')} onLibrary={() => navigate('library')} onOpenRecord={openRecord}
    />;
    if (view === 'roles') return <RoleSelection worldTitle={activeWorldTitle} availableRoles={currentRoles} selected={selectedRole} onSelect={setSelectedRole} onBack={() => navigate('home')} onStart={beginWorld} />;
    if (view === 'play') {
      return (
        <PlayWorld
          role={selectedRole}
          worldTitle={activeWorldTitle}
          availableRoles={currentRoles}
          presentRoleIds={currentRoles.filter((role) => {
            const place = worldState.characterStates[role.id]?.locationId;
            return place === worldState.location || activeWorldDefinition.locations.some((location) => location.id === place && location.name === worldState.location);
          }).map((role) => role.id)}
          turn={turn}
          beat={currentBeat}
          narrative={narrative}
          lastAction={lastAction}
          clues={worldState.clues}
          inventory={worldState.inventory}
          goal={selectRoleGoal(activeWorldDefinition, selectedRole.id)}
          tasks={activeWorldDefinition.tasks.filter((task) => task.assignedRoleIds.length === 0 || task.assignedRoleIds.includes(selectedRole.id))}
          completedTaskIds={worldState.completedTaskIds ?? []}
          eventLedger={worldState.eventLedger}
          relation={worldState.relationshipTrust}
          clock={worldState.clock}
          location={worldState.location}
          actionFeedback={actionFeedback}
          surpriseLevel={activeSurprise}
          incident={lastIncident}
          imageTask={imageTask}
          isThinking={isThinking}
          liveMode={liveMode}
          freeAction={freeAction}
          onFreeAction={setFreeAction}
          onLiveMode={setLiveMode}
          onAction={takeAction}
          onBack={() => navigate('roles')}
        />
      );
    }
    if (view === 'create') {
      return (
        <CreateWorld
          step={createStep}
          roles={draftRoles}
          surprise={surprise}
          generated={generated}
          generating={worldGenerating}
          worldTitle={worldTitle}
          worldSeed={worldSeed}
          creatorBrief={creatorBrief}
          creatorMessages={creatorMessages}
          creatorMessage={creatorMessage}
          creatorAgentThinking={creatorAgentThinking}
          creatorProposal={creatorProposal}
          creatorQuestions={creatorQuestions}
          storyOutline={generatedStoryOutline}
          roleImages={roleImages}
          roleImageStates={roleImageStates}
          onStep={setCreateStep}
          onAddRole={addDraftRole}
          onRemoveRole={removeDraftRole}
          onUpdateRole={updateDraftRole}
          onSurprise={setSurprise}
          onWorldTitle={setWorldTitle}
          onWorldSeed={setWorldSeed}
          onCreatorMessage={setCreatorMessage}
          onSubmitCreatorMessage={submitCreatorMessage}
          onApplyCreatorProposal={applyCreatorProposal}
          onDismissCreatorProposal={() => setCreatorProposal(null)}
          onUpdateCreatorBrief={updateCreatorBriefField}
          onComplexity={(value) => setCreatorBrief((current) => ({ ...current, complexityLevel: normalizeSurpriseLevel(value) }))}
          onAddCreatorTask={addCreatorTask}
          onRemoveCreatorTask={removeCreatorTask}
          onUpdateCreatorTask={updateCreatorTask}
          onGenerate={generateWorld}
          onUseManualStory={createWorldFromManualStory}
          onAcceptPlot={acceptGeneratedPlot}
          onUpdateStoryBeat={updateStoryOutline}
          onGenerateRoleImage={(index) => { void generateRoleImage(index); }}
          onGenerateAllRoleImages={() => { void generateAllRoleImages(); }}
          onBack={() => navigate('home')}
          onPublish={publishCreatorWorld}
          onShare={preparePublicWorld}
        />
      );
    }
    if (view === 'ending') return <Ending worldTitle={activeWorldTitle} role={selectedRole} decision={endingDecision} state={worldState} world={activeWorldDefinition} imageUrl={imageTask.assetUrl} onContinue={continueWorld} onReplay={() => navigate('roles')} onHome={() => navigate('home')} />;
    return (
      <PersonalAgent
        worlds={[
          ...availableStudioWorlds.map((entry) => ({ ...entry, roleCount: entry.world.characters.length })),
          ...worldCatalog.map((world) => ({ ...world, roleCount: world.id === 'storm-manor' ? roles.length : presetWorlds.find((preset) => preset.id === world.id)?.roles.length ?? 0, cover: world.id === 'storm-manor' ? '/assets/storm-manor-cover.png' : world.id === 'sea-train' ? '/assets/sea-train-cover.jpg' : '/assets/roommate-cover.jpg' })),
        ]}
        message={message}
        conversation={agentConversation}
        busy={agentThinking}
        error={agentError}
        recommendations={personalRecommendations}
        memories={memories}
        pending={pendingPersonalMemories}
        onMessage={setMessage}
        onSubmit={submitMessage}
        onRemoveMemory={(memory) => setMemories((current) => current.filter((item) => item !== memory))}
        onConfirmMemory={(memory) => {
          if (memories.length >= 24) { setAgentError('记忆已满（24 条），请先删除一条不再需要的内容。'); return; }
          setMemories((current) => [...new Set([...current, memory])]);
          setPendingPersonalMemories((current) => current.filter((item) => item !== memory));
        }}
        onDismissMemory={(memory) => setPendingPersonalMemories((current) => current.filter((item) => item !== memory))}
        onOpenWorld={openPersonalWorld}
        onCreate={newCreator}
      />
    );
  }

  const screen = renderScreen();

  return (
    <main className="studio-frame">
      <StudioNav section={view} onNavigate={navigate} onCreate={newCreator} />
      <AccountBar />
      {storageError && <p className="studio-storage-error" role="alert">{storageError}</p>}
      {screen}
      {publicationNotice && <p className="account-bar" role="status">{publicationNotice}</p>}
      {publicationEntry && <PublishWorldDialog accountScope={accountScope} entry={publicationEntry} onClose={() => setPublicationEntry(null)} onPublished={(entry) => { setCommunityWorlds(current => upsertById(current, entry)); setPublicationEntry(null); setPublicationNotice('世界已公开发布，其他访客现在可以在世界探索中找到它。'); navigate('home'); }} />}
      {chatEntry && <CharacterEntry key={`${chatEntry.entry.id}:${chatEntry.targetId}`} entry={chatEntry.entry} targetId={chatEntry.targetId} onClose={() => setChatEntry(null)} onStart={(session) => { saveChat(session); setActiveChat(session); setChatEntry(null); navigate('chat'); }} />}
    </main>
  );
}


function RolePortrait({ role, className = '' }: { role: Role; className?: string }) {
  return (
    <div className={`role-portrait role-${role.crop} ${className}`}>
      <img className={role.imageUrl ? 'role-generated-image' : undefined} src={role.imageUrl || '/assets/storm-manor-cast.png'} alt={`${role.name}，${role.identity}`} />
    </div>
  );
}

function RoleSelection({ worldTitle, availableRoles, selected, onSelect, onBack, onStart }: { worldTitle: string; availableRoles: Role[]; selected: Role; onSelect: (role: Role) => void; onBack: () => void; onStart: () => void }) {
  return (
    <div className="subpage-shell role-page">
      <button className="back-link" type="button" onClick={onBack}><ArrowLeft />返回推荐</button>
      <div className="role-page-heading title-reveal">
        <div><p className="eyebrow">{worldTitle} · 角色入口</p><h1>你将以谁的身份进入？</h1></div>
        <p>同一个夜晚，每个人知道的真相都不同。选择一个角色，你会继承他的身份、信息和目标。</p>
      </div>
      <div className="role-grid" aria-label="选择角色">
        {availableRoles.map((role) => (
          <button key={role.id} className="character-card reveal-in" data-selected={selected.id === role.id} type="button" onClick={() => onSelect(role)}>
            <RolePortrait role={role} />
            <span className="character-info"><span className="character-check">{selected.id === role.id ? <Check /> : null}</span><small>{role.identity}</small><strong>{role.name}</strong><span>{role.personality}</span></span>
          </button>
        ))}
      </div>
      <section className="selected-role-panel reveal-in" aria-live="polite">
        <div><p className="eyebrow">你的入场信息</p><h2>{selected.name} · {selected.identity}</h2></div>
        <div className="role-facts">
          <p><Eye /> <span><small>只有你知道</small>{selected.secret}</span></p>
          <p><Target /> <span><small>你的目标</small>{selected.goal}</span></p>
        </div>
        <Button className="primary-action" size="lg" onClick={onStart}>以 {selected.name} 的身份进入<ArrowRight /></Button>
      </section>
    </div>
  );
}

function PlayWorld({
  role,
  worldTitle,
  availableRoles,
  presentRoleIds,
  turn,
  beat,
  narrative,
  lastAction,
  clues,
  inventory,
  goal,
  tasks,
  completedTaskIds,
  eventLedger,
  relation,
  clock,
  location,
  actionFeedback,
  surpriseLevel,
  incident,
  imageTask,
  isThinking,
  liveMode,
  freeAction,
  onFreeAction,
  onLiveMode,
  onAction,
  onBack,
}: {
  role: Role;
  worldTitle: string;
  availableRoles: Role[];
  presentRoleIds: string[];
  turn: number;
  beat: StoryBeat;
  narrative: string;
  lastAction: string;
  clues: string[];
  inventory: string[];
  goal: WorldDefinition['goals'][number] | undefined;
  tasks: WorldTask[];
  completedTaskIds: string[];
  eventLedger: EventRecord[];
  relation: number;
  clock: string;
  location: string;
  actionFeedback: ActionValidation | null;
  surpriseLevel: number;
  incident: WorldIncident | null;
  imageTask: ImageTask;
  isThinking: boolean;
  liveMode: boolean;
  freeAction: string;
  onFreeAction: (value: string) => void;
  onLiveMode: (value: boolean) => void;
  onAction: (action: string) => void;
  onBack: () => void;
}) {
  const speakingRole = availableRoles.find((item) => item.name === beat.speaker && presentRoleIds.includes(item.id));
  const mainTasks = tasks.filter((task) => task.kind === 'main');
  const completedMainTasks = mainTasks.filter((task) => completedTaskIds.includes(task.id));
  const progress = mainTasks.length > 0 ? Math.round((completedMainTasks.length / mainTasks.length) * 100) : 0;
  return (
    <div className="play-shell">
      <div className="play-toolbar">
        <button className="back-link" type="button" onClick={onBack}><ArrowLeft />重新选角</button>
        <div className="play-progress"><span style={{ width: `${progress}%` }} /><small>目标进度 {completedMainTasks.length} / {mainTasks.length} · 第 {turn + 1} 轮</small></div>
        <div className="play-modes">
          <span className="surprise-level">意外 · {surpriseLabels[surpriseLevel - 1]}</span>
          <div className="live-toggle"><span><strong>随时行动</strong><small>实验</small></span><Switch aria-label="开启随时行动实验模式" checked={liveMode} onCheckedChange={onLiveMode} /></div>
        </div>
      </div>
      <div className="explore-layout">
        <section className="story-stage" aria-labelledby="scene-title">
          <img className="scene-background" src={imageTask.assetUrl} alt="当前互动世界的场景画面" />
          <div className="scene-scrim" aria-hidden="true" />
          <div className="stage-topline">
            <span><MapPin />{location}</span>
            <span className="scene-image-status" data-status={imageTask.status} aria-live="polite">
              {imageTask.status === 'generating' ? <LoaderCircle className="is-spinning" /> : <ImageIcon />}
              {imageTask.message}
            </span>
            <span>{clock}</span>
          </div>
          <div className="story-content">
            <div className="player-role"><RolePortrait role={role} /><span><small>你是</small><strong>{role.name}</strong></span></div>
            <p className="scene-kicker">{lastAction ? `你的行动：${lastAction}` : `${worldTitle} · 开场`}</p>
            <h1 id="scene-title">{beat.title}</h1>
            <p className="narrative-text">{isThinking && !narrative ? '世界正在回应你的行动……' : narrative}{isThinking && liveMode ? <span className="streaming-cursor" aria-label="正在生成" /> : null}</p>
            {incident ? <div className="incident-banner" data-impact={incident.impact}><Sparkles /><span><small>意外程度 {surpriseLevel} · {incident.impact === 'minor' ? '轻微插曲' : incident.impact === 'moderate' ? '中等影响' : '重大变数'}</small><strong>{incident.title}</strong></span></div> : null}
            {!isThinking && beat.dialogue && <blockquote><strong>{beat.speaker}</strong><span>“{beat.dialogue}”</span></blockquote>}
          </div>
        </section>

        <aside className="story-control-panel">
          <div className="control-heading"><p className="eyebrow">当前目标</p><h2>{goal?.title || role.goal}</h2><small>{goal?.description || '你可以用自己的方式推进这个目标。'}</small></div>
          <div className="story-participants" aria-label="当前在场的其他角色">
            <small>当前在场</small>
            <div>{availableRoles.filter((item) => item.id !== role.id && presentRoleIds.includes(item.id)).map((item) => (
              <span className="participant-chip" data-speaking={item.id === speakingRole?.id} key={item.id}>
                <RolePortrait role={item} />
                <span><strong>{item.name}</strong><small>{item.id === speakingRole?.id ? '正在与你交谈' : item.identity}</small></span>
              </span>
            ))}{!presentRoleIds.some((id) => id !== role.id) && <small>这里暂时没有其他角色</small>}</div>
          </div>
          <div className="free-action-block is-primary-input">
            <label htmlFor="free-action">{isThinking ? (liveMode ? '世界正在展开，你可随时介入' : '等待世界回应') : '你想怎么做？'}</label>
            {actionFeedback ? <output className="action-feedback"><strong>这个行动无法直接发生</strong><span>{actionFeedback.reason}</span>{actionFeedback.suggestion ? <small>{actionFeedback.suggestion}</small> : null}</output> : null}
            <MessageTextarea id="free-action" value={freeAction} onChange={(event) => onFreeAction(event.target.value)} onSend={() => onAction(freeAction)} placeholder="例如：我关掉手电，观察谁最先说话……（Enter 发送，Shift + Enter 换行）" disabled={isThinking && !liveMode} />
            <Button className="primary-action free-action-button" disabled={!freeAction.trim() || (isThinking && !liveMode)} onClick={() => onAction(freeAction)}><Send />{isThinking && liveMode ? '介入当前生成' : '让世界回应'}</Button>
          </div>
          <div className="choice-suggestions-heading"><span>不知道怎么做？</span><small>以下只是行动灵感</small></div>
          <div className="choice-group" aria-live="polite">
            {beat.choices.map((choice, index) => (
              <button className="story-choice" key={`${turn}-${choice.label}`} type="button" disabled={isThinking && !liveMode} onClick={() => onAction(choice.label)}>
                <span>{String(index + 1).padStart(2, '0')}</span><strong>{choice.label}</strong><ArrowRight />
              </button>
            ))}
          </div>
          <div className="world-state-card">
            <div className="task-progress-card">
              <div><Target /><span><small>主线条件</small><strong>{completedMainTasks.length} / {mainTasks.length} 已完成</strong></span></div>
              <ol>{mainTasks.map((task) => <li key={task.id} data-complete={completedTaskIds.includes(task.id)}><span>{completedTaskIds.includes(task.id) ? <Check /> : null}</span><p><strong>{task.title}</strong><small>{task.difficulty}</small></p></li>)}</ol>
            </div>
            <div className="state-title"><span>世界状态</span><small>{clues.length} 条线索</small></div>
            <ul>{clues.slice(-3).map((clue) => <li key={clue}><span />{clue}</li>)}</ul>
            <div className="inventory-row"><strong>持有物</strong><div>{inventory.map((item) => <span key={item}>{item}</span>)}</div></div>
            <div className="relation-meter"><span><UsersRound />他人对你的信任</span><div><i style={{ width: `${relation}%` }} /></div></div>
            <details className="event-ledger"><summary>查看事件账本 · {eventLedger.length}</summary><ol>{eventLedger.slice(-4).map((event) => <li key={event.id} data-status={event.status}><small>{event.location} · {event.status === 'committed' ? '已发生' : event.status === 'interrupted' ? '已中断' : '已拒绝'}</small><strong>{event.action}</strong><span>{event.result}</span></li>)}</ol></details>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CreateWorld({
  step,
  roles: draftRoles,
  surprise,
  generated,
  generating,
  worldTitle,
  worldSeed,
  creatorBrief,
  creatorMessages,
  creatorMessage,
  creatorAgentThinking,
  creatorProposal,
  creatorQuestions,
  storyOutline,
  roleImages,
  roleImageStates,
  onStep,
  onAddRole,
  onRemoveRole,
  onUpdateRole,
  onSurprise,
  onWorldTitle,
  onWorldSeed,
  onCreatorMessage,
  onSubmitCreatorMessage,
  onApplyCreatorProposal,
  onDismissCreatorProposal,
  onUpdateCreatorBrief,
  onComplexity,
  onAddCreatorTask,
  onRemoveCreatorTask,
  onUpdateCreatorTask,
  onGenerate,
  onUseManualStory,
  onAcceptPlot,
  onUpdateStoryBeat,
  onGenerateRoleImage,
  onGenerateAllRoleImages,
  onBack,
  onPublish,
  onShare,
}: {
  step: number;
  roles: DraftRole[];
  surprise: number;
  generated: boolean;
  generating: boolean;
  worldTitle: string;
  worldSeed: string;
  creatorBrief: CreatorBrief;
  creatorMessages: CreatorChatMessage[];
  creatorMessage: string;
  creatorAgentThinking: boolean;
  creatorProposal: CreatorAgentResponse['proposal'] | null;
  creatorQuestions: string[];
  storyOutline: StoryOutlineBeat[];
  roleImages: Record<string, string>;
  roleImageStates: Record<string, 'idle' | 'generating' | 'ready' | 'error'>;
  onStep: (step: number) => void;
  onAddRole: () => void;
  onRemoveRole: (index: number) => void;
  onUpdateRole: (index: number, key: keyof DraftRole, value: string) => void;
  onSurprise: (value: number) => void;
  onWorldTitle: (value: string) => void;
  onWorldSeed: (value: string) => void;
  onCreatorMessage: (value: string) => void;
  onSubmitCreatorMessage: (event: SyntheticEvent<HTMLFormElement>) => void;
  onApplyCreatorProposal: () => void;
  onDismissCreatorProposal: () => void;
  onUpdateCreatorBrief: (key: keyof Pick<CreatorBrief, 'coreGoal' | 'successCondition' | 'failureCondition'>, value: string) => void;
  onComplexity: (value: number) => void;
  onAddCreatorTask: () => void;
  onRemoveCreatorTask: (index: number) => void;
  onUpdateCreatorTask: (index: number, key: keyof Pick<CreatorTaskDraft, 'title' | 'description' | 'successCondition' | 'difficulty'>, value: string) => void;
  onGenerate: () => void;
  onUseManualStory: () => void;
  onAcceptPlot: () => void;
  onUpdateStoryBeat: (index: number, key: keyof Pick<StoryOutlineBeat, 'title' | 'location' | 'objective' | 'turningPoint'>, value: string) => void;
  onGenerateRoleImage: (index: number) => void;
  onGenerateAllRoleImages: () => void;
  onBack: () => void;
  onPublish: () => void;
  onShare: () => void;
}) {
  const discussionPanel = (
            <section className="creator-agent-panel" aria-label="与创作 Agent 讨论">
              <div className="creator-agent-heading"><span><Sparkles /></span><div><small>创作 Agent</small><strong>一起搭世界框架</strong></div><em>{creatorAgentThinking ? '正在整理' : '等待你的想法'}</em></div>
              <div className="creator-conversation" aria-live="polite" aria-busy={creatorAgentThinking}>
                {creatorMessages.slice(-6).map((item, index) => <p key={`${item.role}-${index}`} data-role={item.role}><small>{item.role === 'agent' ? 'Agent' : '你'}</small><span>{item.content}</span></p>)}
                {creatorAgentThinking ? <p data-role="agent"><small>Agent</small><span>正在把你的想法和已有设定放在一起考虑……</span></p> : null}
              </div>
              <div className="creator-question-chips">{creatorQuestions.map((question) => <button type="button" key={question} disabled={creatorAgentThinking} onClick={() => onCreatorMessage(question)}>{question}</button>)}</div>
              <form className="creator-composer" onSubmit={onSubmitCreatorMessage}>
                <label htmlFor="creator-message">和 Agent 讨论你的世界 · Enter 发送，Shift + Enter 换行</label><MessageTextarea id="creator-message" maxLength={3000} value={creatorMessage} onChange={(event) => onCreatorMessage(event.target.value)} placeholder="只有一句话也可以。比如：想做一个被逐出家门后回来争家产的故事，人物还没想好。" disabled={creatorAgentThinking} />
                <Button className="agent-send" type="submit" disabled={!creatorMessage.trim() || creatorAgentThinking}><Send />继续讨论</Button>
              </form>
              {creatorProposal ? <div className="creator-proposal"><span><WandSparkles /></span><div><strong>待你确认的创作建议</strong><small>{creatorProposal.brief.tasks.filter((task) => task.kind === 'main').length} 个主线条件 · {creatorProposal.brief.difficulties.length} 个阻力</small></div><details className="creator-proposal-preview"><summary>查看将写入的角色与设定</summary><h3>{creatorProposal.title}</h3><p>{creatorProposal.premise}</p>{creatorProposal.characters?.map((role, index) => <p key={index}><strong>{role.name} · {role.identity}</strong><br />{role.persona}<br />{role.relationship}<br />{role.appearance}</p>)}<p>目标：{creatorProposal.brief.coreGoal}</p><p>成功：{creatorProposal.brief.successCondition}</p><p>失败：{creatorProposal.brief.failureCondition}</p>{creatorProposal.brief.tasks.map((task) => <p key={task.id}>{task.title}：{task.description}；完成条件：{task.successCondition}</p>)}<p>阻力：{creatorProposal.brief.difficulties.join("；")}</p><p>采纳会替换当前世界框架；提案包含角色时也会替换角色，原形象需重新生成。</p></details><Button disabled={creatorAgentThinking} onClick={onApplyCreatorProposal}>采纳这版设定</Button><button type="button" disabled={creatorAgentThinking} onClick={onDismissCreatorProposal}>暂不采纳</button></div> : null}
            </section>
  );
  return (
    <div className="create-shell">
      <button className="back-link" type="button" onClick={onBack}><X />退出创建</button>
      <div className="create-heading title-reveal">
        <div><p className="eyebrow">创建小世界</p><h1>{step === 1 ? '从一个念头开始' : step === 2 ? '他们将遇见什么？' : step === 3 ? '决定世界的节奏' : '这个世界准备好了'}</h1></div>
        <span>{step} / 4</span>
      </div>
      <div className="create-progress" aria-label={`创建进度，第 ${step} 步，共 4 步`}>{[1, 2, 3, 4].map((item) => <span key={item} data-active={item <= step} />)}</div>

      {step === 1 && <div className="creator-first-discussion">{discussionPanel}</div>}
      {step === 1 && (
        <section className="create-card">
          <div className="create-card-title"><div><h2>添加这个世界中的角色</h2><p>可以先和上方 Agent 一起想角色，也可以直接在这里写。所有设定都能手动修改。</p></div><div className="create-title-actions"><Button variant="outline" onClick={onGenerateAllRoleImages} disabled={Object.values(roleImageStates).includes('generating')}><ImageIcon />生成全部形象</Button><Button variant="outline" onClick={onAddRole}><Plus />添加角色</Button></div></div>
          <div className="draft-role-list">
            {draftRoles.map((role, index) => (
              <article className="draft-role" key={index}>
                <span className="draft-role-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="draft-role-image" data-state={roleImageStates[`draft-role-${index}`] ?? 'idle'}>
                  {roleImages[`draft-role-${index}`]
                    ? <img src={roleImages[`draft-role-${index}`]} alt={`${role.name || `角色 ${index + 1}`}的 AI 生成形象`} />
                    : <span><UserRound /><small>尚未生成形象</small></span>}
                  <button type="button" onClick={() => onGenerateRoleImage(index)} disabled={roleImageStates[`draft-role-${index}`] === 'generating'}>
                    {roleImageStates[`draft-role-${index}`] === 'generating' ? <><LoaderCircle className="is-spinning" />正在生成</> : roleImages[`draft-role-${index}`] ? <><RefreshCw />重新生成</> : <><WandSparkles />生成形象</>}
                  </button>
                  {roleImageStates[`draft-role-${index}`] === 'error' ? <small className="role-image-error">生成失败，请重试</small> : null}
                </div>
                <div className="draft-fields">
                  <div className="draft-field"><label htmlFor={`role-name-${index}`}>角色名称</label><Input id={`role-name-${index}`} value={role.name} onChange={(event) => onUpdateRole(index, 'name', event.target.value)} placeholder="例如：许知遥" /></div>
                  <div className="draft-field"><label htmlFor={`role-identity-${index}`}>身份</label><Input id={`role-identity-${index}`} value={role.identity} onChange={(event) => onUpdateRole(index, 'identity', event.target.value)} placeholder="例如：民俗学研究生" /></div>
                  <div className="draft-field full-field"><label htmlFor={`role-personality-${index}`}>性格与行为倾向</label><Input id={`role-personality-${index}`} value={role.personality} onChange={(event) => onUpdateRole(index, 'personality', event.target.value)} placeholder="例如：理性、好奇，但害怕欠人情" /></div>
                  <div className="draft-field full-field"><label htmlFor={`role-appearance-${index}`}>固定外观（用于保持连续）</label><Input id={`role-appearance-${index}`} value={role.appearance} onChange={(event) => onUpdateRole(index, 'appearance', event.target.value)} placeholder="例如：齐肩黑发、墨绿色防风外套、随身携带旧笔记本" /></div>
                  <div className="draft-field full-field"><label htmlFor={`role-relationship-${index}`}>与其他角色的关系</label><Input id={`role-relationship-${index}`} value={role.relationship} onChange={(event) => onUpdateRole(index, 'relationship', event.target.value)} placeholder="例如：受上一任守塔人委托保护许知遥" /></div>
                </div>
                <button className="remove-role" type="button" disabled={draftRoles.length <= 2} onClick={() => onRemoveRole(index)} aria-label={`删除角色 ${role.name || index + 1}`}><Trash2 /></button>
              </article>
            ))}
          </div>
          <div className="create-actions"><span>建议 2—5 个角色，至少两个角色才能形成关系。</span><Button className="primary-action" onClick={() => onStep(2)}>继续创建故事<ArrowRight /></Button></div>
        </section>
      )}

      {step === 2 && (
        <section className="create-card story-seed-card">
          <div className="create-card-title"><div><h2>和创作 Agent 一起把想法变成可玩世界</h2><p>你定义想表达的东西；Agent 帮你追问目标、条件和代价。不按分钟数定长短。</p></div></div>
          <div className="creator-workbench">
            {discussionPanel}

            <section className="creator-framework-panel" aria-label="可编辑的世界框架">
              <div className="framework-heading"><div><small>随时手动修改</small><strong>世界框架</strong></div><span>{creatorBrief.tasks.filter((task) => task.kind === 'main').length} 个主线条件</span></div>
              <label htmlFor="world-title">世界名称</label><Input id="world-title" value={worldTitle} onChange={(event) => onWorldTitle(event.target.value)} placeholder="可以暂时不填" />
              <label htmlFor="world-seed">世界背景与当下冲突</label><Textarea id="world-seed" value={worldSeed} onChange={(event) => onWorldSeed(event.target.value)} placeholder="写清之前发生了什么，角色们现在面对什么。" />
              <label htmlFor="creator-goal">核心目标</label><Textarea id="creator-goal" value={creatorBrief.coreGoal} onChange={(event) => onUpdateCreatorBrief('coreGoal', event.target.value)} placeholder="体验者最终要做成什么？" />
              <div className="condition-grid"><label htmlFor="success-condition">成功条件<Input id="success-condition" value={creatorBrief.successCondition} onChange={(event) => onUpdateCreatorBrief('successCondition', event.target.value)} placeholder="什么状态才算成功" /></label><label htmlFor="failure-condition">失败条件<Input id="failure-condition" value={creatorBrief.failureCondition} onChange={(event) => onUpdateCreatorBrief('failureCondition', event.target.value)} placeholder="什么时候进入失败结局" /></label></div>
              <div className="complexity-picker"><span><strong>世界复杂度</strong><small>决定任务深度，不是预设分钟数</small></span><div>{['轻量', '标准', '丰富', '多线'].map((label, index) => <button type="button" key={label} data-selected={creatorBrief.complexityLevel === index + 1} onClick={() => onComplexity(index + 1)}>{label}</button>)}</div></div>
              <div className="creator-task-heading"><span><strong>目标下的任务条件</strong><small>前置条件与困难防止玩家一句话直达结局</small></span><Button variant="outline" onClick={onAddCreatorTask}><Plus />添加任务</Button></div>
              <ol className="creator-task-list">{creatorBrief.tasks.map((task, index) => <li key={task.id}><span>{String(index + 1).padStart(2, '0')}</span><div><Input aria-label={`任务 ${index + 1} 名称`} value={task.title} onChange={(event) => onUpdateCreatorTask(index, 'title', event.target.value)} /><Textarea aria-label={`任务 ${index + 1} 内容`} value={task.description} onChange={(event) => onUpdateCreatorTask(index, 'description', event.target.value)} /><div><Input aria-label={`任务 ${index + 1} 完成条件`} value={task.successCondition} onChange={(event) => onUpdateCreatorTask(index, 'successCondition', event.target.value)} placeholder="完成条件" /><Input aria-label={`任务 ${index + 1} 困难`} value={task.difficulty} onChange={(event) => onUpdateCreatorTask(index, 'difficulty', event.target.value)} placeholder="困难或代价" /></div></div><button type="button" onClick={() => onRemoveCreatorTask(index)} aria-label={`删除任务 ${index + 1}`}><Trash2 /></button></li>)}</ol>
              {creatorBrief.tasks.length === 0 ? <div className="empty-task-state"><Target /><span><strong>还没有任务条件</strong><small>先和 Agent 讨论，或手动添加。直接生成时也会自动补齐。</small></span></div> : null}
            </section>
          </div>
          <div className="creation-paths" aria-label="选择世界生成方式">
            <button type="button" onClick={onUseManualStory} disabled={generating || !worldSeed.trim()}><Pencil /><span><strong>直接使用我的设定</strong><small>不让 AI 改写，按当前框架建立世界</small></span><ArrowRight /></button>
            <button type="button" onClick={onGenerate} disabled={generating}><WandSparkles /><span><strong>{generating ? 'AI 正在补全世界' : '让 AI 补全世界'}</strong><small>保留你的设定，补全角色秘密、场景和推进参考</small></span><ArrowRight /></button>
          </div>
          {storyOutline.length > 0 ? <details className="generated-guide"><summary>查看 AI 给出的推进参考（不决定何时结束）</summary><ol>{storyOutline.map((beat, index) => <li key={beat.id}><span>{String(index + 1).padStart(2, '0')}</span><div className="outline-fields"><label htmlFor={`outline-title-${index}`}><small>节点</small><Input id={`outline-title-${index}`} value={beat.title} onChange={(event) => onUpdateStoryBeat(index, 'title', event.target.value)} /></label><label htmlFor={`outline-location-${index}`}><small>地点</small><Input id={`outline-location-${index}`} value={beat.location} onChange={(event) => onUpdateStoryBeat(index, 'location', event.target.value)} /></label><label className="outline-full" htmlFor={`outline-objective-${index}`}><small>可能目标</small><Textarea id={`outline-objective-${index}`} value={beat.objective} onChange={(event) => onUpdateStoryBeat(index, 'objective', event.target.value)} /></label><label className="outline-full" htmlFor={`outline-turning-${index}`}><small>可能转折</small><Textarea id={`outline-turning-${index}`} value={beat.turningPoint} onChange={(event) => onUpdateStoryBeat(index, 'turningPoint', event.target.value)} /></label></div></li>)}</ol></details> : null}
          <div className="create-actions"><Button variant="outline" onClick={() => onStep(1)} disabled={generating}><ArrowLeft />返回角色</Button><div className="plot-actions">{storyOutline.length > 0 ? <Button className="primary-action" onClick={onAcceptPlot}>保存框架并继续<ArrowRight /></Button> : null}</div></div>
        </section>
      )}

      {step === 3 && (
        <section className="create-card settings-card">
          <div className="generated-summary"><span><Check /></span><div><small>{generated ? 'AI 已生成故事框架' : '故事框架已就绪'}</small><h2>{worldTitle}</h2><p>{worldSeed}</p></div><button type="button" onClick={() => onStep(2)}><Pencil />修改</button></div>
          <div className="setting-block">
            <div><span className="setting-label">意外程度</span><strong>{surpriseLabels[surprise - 1]}</strong></div>
            <p>只改变合理突发事件的频率和影响，不破坏世界规律与已经发生的事实。</p>
            <div className="surprise-options" aria-label="选择意外程度">
              {surpriseLabels.map((label, index) => <button key={label} type="button" aria-pressed={surprise === index + 1} data-selected={surprise === index + 1} onClick={() => onSurprise(index + 1)}><span>{index + 1}</span><strong>{label}</strong><small>{index === 0 ? '几乎不出现额外事件' : index === 1 ? '偶尔出现合理插曲' : index === 2 ? '事件会明显改变路线' : '频繁出现重大变数'}</small></button>)}
            </div>
            <Slider min={1} max={4} step={1} value={[surprise]} onValueChange={(value) => onSurprise(typeof value === 'number' ? value : value[0])} aria-label="拖动调整意外程度" />
          </div>
          <div className="setting-row"><span><strong>允许自由输入行动</strong><small>体验者可以跳出预设选项</small></span><Switch defaultChecked /></div>
          <div className="setting-row"><span><strong>结局后允许继续</strong><small>保留状态，探索结局之后</small></span><Switch defaultChecked /></div>
          <div className="create-actions"><Button variant="outline" onClick={() => onStep(2)}><ArrowLeft />返回故事</Button><Button className="primary-action" onClick={() => onStep(4)}>预览世界<ArrowRight /></Button></div>
        </section>
      )}

      {step === 4 && (
        <section className="create-preview">
          <article className="preview-cover">
            <img src={roleImages['draft-role-0'] || '/assets/storm-manor-cover.png'} alt={roleImages['draft-role-0'] ? `${draftRoles[0]?.name || '首个角色'}的生成形象` : '世界预览占位图'} />
            <div /><span>新世界 · {draftRoles.length} 个角色</span><h2>{worldTitle || '未命名世界'}</h2><p>{worldSeed}</p>
          </article>
          <aside className="preview-details">
            <p className="eyebrow">生成前确认</p><h2>世界设定卡</h2>
            <dl><div><dt>角色</dt><dd>{draftRoles.map((role) => role.name || '未命名').join('、')}</dd></div><div><dt>意外程度</dt><dd>{surpriseLabels[surprise - 1]}</dd></div><div><dt>世界复杂度</dt><dd>{['轻量', '标准', '丰富', '多线'][creatorBrief.complexityLevel - 1]} · {creatorBrief.tasks.filter((task) => task.kind === 'main').length || 3} 个主线条件</dd></div><div><dt>结束方式</dt><dd>达成目标条件后结束</dd></div></dl>
            <div className="preview-tip"><Lightbulb /><span>世界只建立角色的过去、当下状态、目标和任务条件。之后如何发展由玩家行动与世界 Agent 共同推演，不依赖固定分幕。</span></div>
            <div className="preview-buttons"><Button variant="outline" onClick={() => onStep(3)}><ArrowLeft />继续修改</Button><Button variant="outline" onClick={onPublish}>保存并试玩<ArrowRight /></Button><Button className="primary-action" onClick={onShare}>公开发布<ArrowRight /></Button></div>
          </aside>
        </section>
      )}
    </div>
  );
}

function Ending({ worldTitle, role, decision, state, world, imageUrl, onContinue, onReplay, onHome }: { worldTitle: string; role: Role; decision: string; state: WorldState; world: WorldDefinition; imageUrl: string; onContinue: () => void; onReplay: () => void; onHome: () => void }) {
  const ending = world.endingConditions.find((condition) => condition.id === state.reachedEndingIds?.at(-1));
  const roleEndings = world.endingConditions.filter((condition) => condition.applicableRoleIds === undefined || condition.applicableRoleIds.includes(role.id));
  const seenEndings = roleEndings.filter((condition) => state.reachedEndingIds?.includes(condition.id)).length;
  const completedTasks = world.tasks.filter((task) => (task.assignedRoleIds.length === 0 || task.assignedRoleIds.includes(role.id)) && state.completedTaskIds.includes(task.id)).length;
  return (
    <div className="ending-shell">
      <div className="ending-image"><img src={imageUrl} alt={`${worldTitle}的当前场景`} /><div /></div>
      <section className="ending-card title-reveal">
        <span className="ending-mark"><Check /></span>
        <p className="eyebrow">{worldTitle} · 一条世界线已经抵达结局</p>
        <h1>{ending?.outcome === 'failure' ? '目标未能达成，故事仍有余波' : '这条世界线，由你的选择抵达此刻'}</h1>
        <p>你以 {role.name} 的身份走到这条世界线的阶段结局。{decision || ending?.description}</p>
        <div className="ending-stats"><span><strong>{state.turn}</strong><small>行动回合</small></span><span><strong>{completedTasks}</strong><small>完成角色任务</small></span><span><strong>{seenEndings} / {roleEndings.length}</strong><small>该角色已见结局</small></span></div>
        <div className="agent-afterword"><Sparkles /><span><small>个人 Agent 记下了</small>你在{worldTitle}选择了{role.name}。你可以回到 Agent，告诉它这次体验中喜欢和不喜欢的部分。</span></div>
        <div className="ending-actions"><Button className="primary-action" onClick={onContinue}>继续这个世界<ArrowRight /></Button><Button variant="outline" onClick={onReplay}><RefreshCw />换一个角色重玩</Button><Button variant="ghost" onClick={onHome}>回到 Agent</Button></div>
      </section>
    </div>
  );
}
