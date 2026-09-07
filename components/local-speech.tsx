'use client';
import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { localChineseVoices, speechChunks, voiceIndex } from '@/lib/local-speech';

export function LocalSpeech({ text, speaker = 'narrator' }: { text: string; speaker?: string }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState('');
  const [rate, setRate] = useState(1);
  const active = useRef(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const load = () => setVoices(localChineseVoices(synth.getVoices()));
    load(); synth.addEventListener('voiceschanged', load);
    const stop = () => { if (active.current) synth.cancel(); active.current = false; setPlaying(false); };
    const visibility = () => { if (document.hidden) stop(); };
    window.addEventListener('xgen-speech-stop', stop);
    document.addEventListener('visibilitychange', visibility);
    return () => { synth.removeEventListener('voiceschanged', load); window.removeEventListener('xgen-speech-stop', stop); document.removeEventListener('visibilitychange', visibility); if (active.current) synth.cancel(); active.current = false; };
  }, []);
  function play() {
    if (playing) { window.dispatchEvent(new Event('xgen-speech-stop')); return; }
    const voice = voices.find(v => v.voiceURI === selected) ?? voices[voiceIndex(speaker, voices.length)];
    if (!voice) { setNotice('未检测到本地中文声音。请在系统设置中安装中文朗读声音，或使用系统的朗读功能。不会自动改用云端服务。'); return; }
    window.dispatchEvent(new Event('xgen-speech-stop'));
    const chunks = speechChunks(text); if (!chunks.length) return;
    active.current = true; setPlaying(true); setNotice('');
    const next = (index: number) => {
      if (!active.current) return;
      if (index >= chunks.length) { active.current = false; setPlaying(false); return; }
      const part = new SpeechSynthesisUtterance(chunks[index]); utterance.current = part;
      part.voice = voice; part.lang = voice.lang; part.rate = rate;
      part.onend = () => next(index + 1);
      part.onerror = () => { if (active.current) { active.current = false; setPlaying(false); setNotice('朗读已中断，可以重试。'); } };
      window.speechSynthesis.speak(part);
    };
    next(0);
  }
  return <div className="local-speech"><button type="button" className="flow-control" onClick={play} aria-label={playing ? '停止朗读' : '朗读这段内容'}>{playing ? <Square /> : <Volume2 />}{playing ? '停止' : '朗读'}</button><details><summary>声音</summary><p>只用设备本地声音，不调用付费 TTS。{voices.length < 2 ? '本地中文音色不足，暂不能区分多个人物声音。' : '角色自动分配音色，可在这里调整。'}语速不是情绪表演。</p><label>音色<select value={selected} onChange={e => setSelected(e.target.value)} disabled={playing}><option value="">自动分配</option>{voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}</select></label><label>语速<select value={rate} onChange={e => setRate(Number(e.target.value))} disabled={playing}><option value={0.85}>舒缓</option><option value={1}>自然</option><option value={1.15}>轻快</option></select></label></details>{notice && <output>{notice}</output>}</div>;
}
