'use client';
import { useState } from 'react';
import { WorldProloguePlayer } from '@/components/world-prologue';
import { ascensionPrologue, yogaPrologue, yogaComparisonPrologue, yogaAudioPrologue } from '@/lib/world-prologue';
import './samples.css';

const samples = [
  { id: 'yoga-v4', label: '瑜伽馆 · 正式有声版', title: '瑜伽馆里弄丢底线的全职太太 · 有声版', prologue: yogaAudioPrologue, world: 'yoga-lotus-boundary', identity: undefined, note: '当前正式序章，30秒有声：婚姻冷落 → 私教关心 → 越界拥吻 → 丈夫催接孩子。沿用已生成画面，新增女声旁白、丈夫男声和提示音；不是模型原生同期声。' },
  { id: 'pov', label: '第一人称 · 飞升', title: '飞升门开了，门外却有人喊我的工号', prologue: ascensionPrologue, world: 'ascension-work-number', identity: '沈砚', note: '固定沈砚视角。看完即可进入互动，不需要选角。' },
  { id: 'yoga-v2', label: '瑜伽馆 · 原版', title: '瑜伽馆里弄丢底线的全职太太 · 原版', prologue: yogaPrologue, world: 'yoga-lotus-boundary', identity: undefined, note: '保留的原版，未覆盖。切换新版，比较动作与故事是否更容易看懂。' },
  { id: 'yoga-v3', label: '瑜伽馆 · 14秒旧样片', title: '瑜伽馆里弄丢底线的全职太太 · 旧样片', prologue: yogaComparisonPrologue, world: 'yoga-lotus-boundary', identity: undefined, note: '保留的14秒无声样片：训练 → 拥吻 → 丈夫催接孩子。停在教室看到消息的时刻，仅供对比；正式世界现使用30秒有声版。' },
];

export default function PrologueComparison() {
  const [selected, setSelected] = useState('yoga-v4');
  const sample = samples.find(item => item.id === selected)!;
  return <main className="sample-comparison">
    <nav className="sample-tabs" aria-label="选择要观看的样片">
      <a href="/">小世界</a>
      <div>{samples.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.label}</button>)}</div>
    </nav>
    <WorldProloguePlayer key={sample.id} title={sample.title} prologue={sample.prologue} fixedIdentity={sample.identity}
      continueLabel={sample.identity ? '以沈砚的视角继续' : '进入瑜伽馆世界'}
      onBack={() => { window.location.href = '/'; }} onContinue={() => { window.location.href = '/?world=' + sample.world + (sample.identity ? '&intro=seen' : ''); }} />
    <p className="sample-note">{sample.note} 切换与重播直接读取已保存的视频，不会重新生成或消耗模型额度。</p>
  </main>;
}
