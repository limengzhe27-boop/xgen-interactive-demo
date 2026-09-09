'use client';
import { useState } from 'react';
import Link from 'next/link';
import { WorldProloguePlayer } from '@/components/world-prologue';
import { ascensionPrologue, yogaPrologue, yogaComparisonPrologue, yogaAudioPrologue } from '@/lib/world-prologue';
import './samples.css';

const samples = [
  { id: 'pov-native', label: '修仙③ · 原生有声15秒', title: '飞升门开了 · Seedance 原生有声试拍', prologue: { video:'/assets/prologues/ascension-native-v3/preview.mp4',hasAudio:true,audioOrigin:'native' as const,shots:[{poster:'/assets/prologues/ascension-native-v3/poster.webp',seconds:15,caption:'逃跑者被拖回，执籍官封住退路。此版仅供比较，未替换正式开场。'}],handoff:'对比试片：包含新逃跑者，约2—3秒存在视角漂移。' }, world:'ascension-work-number',identity:'沈砚',note:'第三版：Seedance 2.0 Fast，15秒模型原生音画，无后期配音。含逃跑、拖回、束腕；第一人称存在短暂漂移，未通过正式世界替换验收。' },
  { id: 'pov-post', label: '修仙② · 后配音10秒',title:'飞升门开了 · 中间版检查片',prologue:{video:'/assets/prologues/ascension-v2-review/preview.mp4',hasAudio:true,shots:[{poster:'/assets/ascension-v1/cover.webp',seconds:10,caption:'历史中间版，只有10秒检查片，不是完整序章。'}],handoff:'历史后配音样片，保留用于比较，不代表当前生成方式。'},world:'ascension-work-number',identity:'沈砚',note:'第二版：本地保留的10秒中间检查片，使用后期配音，不是原生声音；不补拍、不延长来冒充完整作品。'},
  { id: 'yoga-v4', label: '瑜伽馆 · 正式有声版', title: '瑜伽馆里弄丢底线的全职太太 · 有声版', prologue: yogaAudioPrologue, world: 'yoga-lotus-boundary', identity: undefined, note: '当前正式序章，30秒有声：婚姻冷落 → 私教关心 → 越界拥吻 → 丈夫催接孩子。沿用已生成画面，新增女声旁白、丈夫男声和提示音；不是模型原生同期声。' },
  { id: 'pov', label: '修仙① · 原版无声20秒', title: '飞升门开了，门外却有人喊我的工号', prologue: ascensionPrologue, world: 'ascension-work-number', identity: '沈砚', note: '第一版：20秒无声字幕版，当前正式世界仍用此序章。固定沈砚视角，不需要选角。' },
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
      continueLabel={sample.identity ? '以沈砚的视角继续' : '进入瑜伽馆世界'}
      onBack={() => { window.location.href = '/'; }} onContinue={() => { window.location.href = '/?world=' + sample.world; }} />
    <p className="sample-note">{sample.note} 切换与重播直接读取已保存的视频，不会重新生成或消耗模型额度。</p>
  </main>;
}
