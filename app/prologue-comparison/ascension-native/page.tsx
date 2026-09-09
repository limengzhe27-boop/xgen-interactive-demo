import Link from 'next/link';

export default function NativeAscensionPreview() {
  return <main style={{maxWidth:1200, margin:'0 auto',padding:'24px 20px 48px'}}>
    <nav><Link href="/prologue-comparison">← 返回旧版对比</Link></nav>
    <h1 style={{fontSize:'clamp(22px,3vw,36px)',margin:'24px 0 12px'}}>飞升门开了 · 原生有声试拍</h1>
    <p>Seedance · 15 秒 · 模型返回原片，无后期配音</p>
    {/* Raw review sample: do not invent a subtitle transcript before listening verification. */}
    {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
    <video controls playsInline preload="metadata" poster="/assets/prologues/ascension-native-v3/poster.webp"
      src="/assets/prologues/ascension-native-v3/preview.mp4"
      aria-label="修仙序章原生有声待评样片"
      style={{display:'block',width:'100%',maxHeight:'72dvh',background:'#101a16',borderRadius:16,margin:'16px 0'}} />
    <p>点击播放即可听原片声音。此页仅供评看，未替换世界中的正式序章。</p>
    <details><summary>本次检查与已知问题</summary>
      <p>已确认原始文件包含 AAC 音轨，未混入 TTS 或后期配音。画面出现逃跑、被拖回与缠腕；约第 2—3 秒存在第一人称视角漂移。对白清晰度和整体观感待实际听看确认，本版未通过正式发布验收。</p>
      <p>新增逃跑者是这次序章改编提案，尚未写入正式互动世界；没有自动替你选择后续行动。</p>
    </details>
  </main>;
}
