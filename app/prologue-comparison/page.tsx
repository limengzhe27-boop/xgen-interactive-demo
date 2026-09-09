'use client';
import { useState } from 'react';
import Link from 'next/link';
import { WorldProloguePlayer } from '@/components/world-prologue';
import { ascensionPrologue, yogaPrologue, yogaComparisonPrologue, yogaAudioPrologue } from '@/lib/world-prologue';
import './samples.css';

const samples = [
  { id:'emperor-native', label:'皇帝逼宫 · 新模型原生有声', title:'刚穿成皇帝，满朝文武就请我自尽 · 已启用序章', prologue:{video:'/assets/prologues/emperor-native-v1/preview.mp4',hasAudio:true,audioOrigin:'native' as const,shots:[{poster:'/assets/prologues/emperor-native-v1/poster.webp',seconds:15,caption:'丞相推来诏书与笔；门外传来求见声。你尚未签字。此为剧情说明，不是对白字幕。'}],handoff:'已启用序章：已按用户确认设为此世界正式开场。'},world:'emperor-last-decree',identity:undefined,note:'公司网关标注 Seedance 2.5，15秒原片，含原生AAC音轨，未做后配音。已抽帧检查推诏、递笔、转身、放笔；阻挡救援表现偏弱，对白清晰度待听看确认，已按用户确认启用，保留上述质量说明。'},
  { id: 'pov-native', label: '修仙③ · 原生有声15秒', title: '飞升门开了 · Seedance 原生有声试拍', prologue: { video:'/assets/prologues/ascension-native-v3/preview.mp4',hasAudio:true,audioOrigin:'native' as const,shots:[{poster:'/assets/prologues/ascension-native-v3/poster.webp',seconds:15,caption:'逃跑者被拖回，执籍官封住退路。已按用户选择设为正式开场。'}],handoff:'对比试片：包含新逃跑者，约2—3秒存在视角漂移。' }, world:'ascension-work-number',identity:'沈砚',note:'第三版：Seedance 2.0 Fast，15秒模型原生音画，无后期配音。含逃跑、拖回、束腕；第一人称存在短暂漂移，已按用户选择启用；仍保留该画面瑕疵说明。' },
  { id: 'pov-post', label: '修仙② · 后配音10秒',title:'飞升门开了 · 中间版检查片',prologue:{video:'/assets/prologues/ascension-v2-review/preview.mp4',hasAudio:true,shots:[{poster:'/assets/ascension-v1/cover.webp',seconds:10,caption:'历史中间版，只有10秒检查片，不是完整序章。'}],handoff:'历史后配音样片，保留用于比较，不代表当前生成方式。'},world:'ascension-work-number',identity:'沈砚',note:'第二版：本地保留的10秒中间检查片，使用后期配音，不是原生声音；不补拍、不延长来冒充完整作品。'},
  { id: 'yoga-v4', label: '瑜伽馆 · 正式有声版', title: '瑜伽馆里弄丢底线的全职太太 · 有声版', prologue: yogaAudioPrologue, world: 'yoga-lotus-boundary', identity: undefined, note: '当前正式序章，30秒有声：婚姻冷落 → 私教关心 → 越界拥吻 → 丈夫催接孩子。沿用已生成画面，新增女声旁白、丈夫男声和提示音；不是模型原生同期声。' },
  { id: 'pov', label: '修仙① · 原版无声20秒', title: '飞升门开了，门外却有人喊我的工号', prologue: ascensionPrologue, world: 'ascension-work-number', identity: '沈砚', note: '第一版：20秒无声字幕版，历史保留；正式世界现用第三版原生有声序章。固定沈砚视角，不需要选角。' },
  { id: 'yoga-v2', label: '瑜伽馆 · 原版', title: '瑜伽馆里弄丢底线的全职太太 · 原版', prologue: yogaPrologue, world: 'yoga-lotus-boundary', identity: undefined, note: '保留的原版，未覆盖。切换新版，比较动作与故事是否更容易看懂。' },
  { id: 'yoga-v3', label: '瑜伽馆 · 14秒旧样片', title: '瑜伽馆里弄丢底线的全职太太 · 旧样片', prologue: yogaComparisonPrologue, world: 'yoga-lotus-boundary', identity: undefined, note: '保留的14秒无声样片：训练 → 拥吻 → 丈夫催接孩子。停在教室看到消息的时刻，仅供对比；正式世界现使用30秒有声版。' },
];

export default function PrologueComparison() {
  const [selected, setSelected] = useState('yoga-v4');
  const sample = samples.find(item => item.id === selected)!;
  return <main className="sample-comparison">
    <nav className="sample-tabs" aria-label="选择要观看的样片">
      <Link href="/">小世界</Link>
      <Link href={'/video-explore/'+sample.world}>试用视频探索 →</Link>
      <div>{samples.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.label}</button>)}</div>
    </nav>
    <WorldProloguePlayer key={sample.id} title={sample.title} prologue={sample.prologue} fixedIdentity={sample.identity}
      continueLabel={sample.identity ? '以沈砚的视角继续' : '进入对应世界'}
      onBack={() => { window.location.href = '/'; }} onContinue={() => { window.location.href = '/?world=' + sample.world; }} />
    <p className="sample-note">{sample.note} 切换与重播直接读取已保存的视频，不会重新生成或消耗模型额度。</p>
  </main>;
}
