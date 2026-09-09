'use client';
/* oxlint-disable next/no-img-element -- existing original artwork; no generation on browse */
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUp, BookOpen, Compass, House, MessageCircleMore, Plus, Search, Sparkles, UserRound, UsersRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageTextarea } from '@/components/message-textarea';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GalleryAtmosphere, GalleryMasonry, GalleryReveal } from '@/components/gallery-motion';
import { mixGallery } from '@/lib/gallery-order';
import { editorialCopy, featureHomeItems } from '@/lib/home-editorial';
import { advanceComposerScroll } from '@/lib/composer-scroll';
import { restoreGalleryPosition, type GalleryBrowseState, type GalleryPosition } from '@/lib/gallery-memory';

export type StudioSection = 'home' | 'library' | 'characters' | 'personal' | 'profile';
export type WorldCard = { id: string; title: string; genre: string; premise: string; cover: string; roleCount: number; artNote?: string; featured?: boolean; fixedRoleId?: string };
export type CharacterCard = { id: string; worldId: string; worldTitle: string; name: string; identity: string; persona: string; image: string };
export type RecentCard = { id: string; title: string; subtitle: string; label: string; cover: string };
type GalleryItem = { kind: 'world'; value: WorldCard } | { kind: 'character'; value: CharacterCard };

export function StudioNav({ section, onNavigate, onCreate }: { section: string; onNavigate: (section: StudioSection) => void; onCreate: () => void }) {
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; if (nav.current) nav.current.dataset.scrolled = String(scrollY > 24); };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    addEventListener('scroll', scroll, { passive: true }); update();
    return () => { removeEventListener('scroll', scroll); cancelAnimationFrame(frame); };
  }, []);
  return <nav ref={nav} className="studio-nav" aria-label="主导航">
    <span className="studio-nav-brand" aria-hidden="true"><Sparkles /></span>
    <button className="studio-nav-button studio-new" onClick={() => onCreate()} type="button"><Plus /><span>新建</span></button>
    {([{ id: 'home', label: '首页', icon: House }, { id: 'library', label: '我的世界', icon: Compass }, { id: 'characters', label: '角色库', icon: UsersRound }, { id: 'personal', label: '个人 Agent', icon: MessageCircleMore }, { id: 'profile', label: '我的', icon: UserRound }] as const).map(({ id, label, icon: Icon }) =>
      <button key={id} className="studio-nav-button" aria-current={section === id ? 'page' : undefined} onClick={() => onNavigate(id)} type="button"><Icon /><span>{label}</span></button>)}
    <span className="studio-nav-foot" aria-hidden="true">XGEN</span>
  </nav>;
}

function Artwork({ src, alt }: { src: string; alt: string }) {
  const [failedSrc, setFailedSrc] = useState('');
  return src && failedSrc !== src ? <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} /> : <div className="gallery-art-unavailable"><BookOpen /><span>封面暂不可用<br />故事仍可进入</span></div>;
}

export function StudioHome({ section, worlds, characters, recent, onCreate, onOpenWorld, onChat, onPersonal, onLibrary, onOpenRecord, initialBrowse, returnPosition, onBrowseChange }: {
  initialBrowse?: GalleryBrowseState; returnPosition?: GalleryPosition; onBrowseChange?: (state: GalleryBrowseState) => void;
  section: StudioSection; worlds: WorldCard[]; characters: CharacterCard[]; recent: RecentCard[];
  onCreate: (seed?: string) => void; onOpenWorld: (id: string) => void;
  onChat: (worldId: string, characterId: string) => void; onPersonal: () => void; onLibrary: () => void;
  onOpenRecord: (id: string) => void;
}) {
  const [seed, setSeed] = useState(initialBrowse?.seed ?? '');
  const [genre, setGenre] = useState(initialBrowse?.genre ?? '全部');
  const [query, setQuery] = useState(initialBrowse?.query ?? '');
  const [kind, setKind] = useState<'all' | 'world' | 'character'>(initialBrowse?.kind ?? (section === 'characters' ? 'character' : 'all'));
  useEffect(() => { onBrowseChange?.({ seed, genre, query, kind }); }, [seed, genre, query, kind, onBrowseChange]);
  // Restore after the masonry has measured its rows, not while the old page is
  // still mounted. Cancel on user input so restoration never fights scrolling.
  useEffect(() => {
    let frame = 0;
    const restore = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => restoreGalleryPosition(returnPosition ?? { y: 0 })); };
    const stop = () => { cancelAnimationFrame(frame); document.removeEventListener('gallery:layout', restore); };
    document.addEventListener('gallery:layout', restore);
    window.addEventListener('wheel', stop, { passive: true, once: true });
    window.addEventListener('touchstart', stop, { passive: true, once: true });
    window.addEventListener('keydown', stop, { once: true });
    restore();
    const timer = window.setTimeout(stop, 600);
    return () => { stop(); clearTimeout(timer); window.removeEventListener('wheel', stop); window.removeEventListener('touchstart', stop); window.removeEventListener('keydown', stop); };
  }, [returnPosition]);
  const [detail, setDetail] = useState<WorldCard | null>(null);
  const [offscreen, setOffscreen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinnedWhileFocused, setPinnedWhileFocused] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const isHome = section === 'home';
  const docked = isHome && (focused ? pinnedWhileFocused : offscreen);
  const [scrollHidden, setScrollHidden] = useState(false);
  const composerHidden = docked && scrollHidden && !focused;
  useEffect(() => {
    const input = anchor.current?.querySelector('textarea');
    if (!input || !docked) return;
    input.style.height = '44px';
    if (focused) input.style.height = Math.min(120, Math.max(44, input.scrollHeight)) + 'px';
    return () => { input.style.height = ''; };
  }, [seed, focused, docked]);
  useEffect(() => {
    if (!focused) return;
    // Scrolling the page ends editing; scrolling inside a long draft does not.
    const resumeBrowsing = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement && anchor.current?.contains(target) && target.scrollHeight > target.clientHeight + 1) {
        if (!(event instanceof WheelEvent) || (event.deltaY < 0 && target.scrollTop > 0) || (event.deltaY > 0 && target.scrollTop + target.clientHeight < target.scrollHeight - 1)) return;
      }
      const active = document.activeElement;
      if (active instanceof HTMLElement && anchor.current?.contains(active)) active.blur();
      setFocused(false);
    };
    window.addEventListener('wheel', resumeBrowsing, { passive: true });
    window.addEventListener('touchmove', resumeBrowsing, { passive: true });
    return () => { window.removeEventListener('wheel', resumeBrowsing); window.removeEventListener('touchmove', resumeBrowsing); };
  }, [focused]);
  useEffect(() => {
    if (!isHome) return;
    let state = { y: Math.max(0, window.scrollY), travel: 0, hidden: false };
    let frame = 0;
    const update = () => {
      frame = 0;
      state = advanceComposerScroll(state, window.scrollY, focused);
      setScrollHidden(state.hidden);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', scroll, { passive: true });
    return () => { window.removeEventListener('scroll', scroll); cancelAnimationFrame(frame); };
  }, [isHome, focused]);
  useEffect(() => {
    if (!isHome || !anchor.current) return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(entry.boundingClientRect.bottom < 0));
    observer.observe(anchor.current);
    return () => observer.disconnect();
  }, [isHome]);
  const orderedWorlds = [...worlds].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  const genres = ['全部', ...new Set(orderedWorlds.map(world => world.genre))];
  const matches = (text: string) => text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const grouped: GalleryItem[] = [];
  orderedWorlds.filter(world => genre === '全部' || world.genre === genre).forEach(world => {
    if (kind !== 'character' && matches(world.title + ' ' + (editorialCopy('world:' + world.id)?.title ?? '') + ' ' + world.genre + ' ' + world.premise)) grouped.push({ kind: 'world', value: world });
    if (kind !== 'world') characters.filter(character => character.worldId === world.id && matches(character.name + ' ' + character.identity + ' ' + character.worldTitle + ' ' + character.persona + ' ' + (editorialCopy('character:' + character.worldId + ':' + character.id)?.tagline ?? ''))).forEach(character => grouped.push({ kind: 'character', value: character }));
  });
  const itemKey = (item: GalleryItem) => item.kind + ':' + (item.kind === 'world' ? item.value.id : item.value.worldId + ':' + item.value.id);
  const mixed = mixGallery(grouped, itemKey, item => item.kind === 'world' ? item.value.id : item.value.worldId);
  const items = isHome && genre === '全部' && kind === 'all' && !query.trim() ? featureHomeItems(mixed, itemKey) : mixed;
  const start = () => onCreate(seed);

  return <div className="studio-home">
    {isHome && <section className="gallery-hero" aria-labelledby="studio-title">
      <GalleryAtmosphere />
      <div className="gallery-hero-heading"><span className="studio-wordmark gallery-eyebrow">WORLDSTUDIO · 小世界</span><h1 id="studio-title"><span>下一段故事，</span><span>你来入戏。</span></h1><p className="gallery-eyebrow">成为故事里的人，也成为故事的作者。</p></div>
      <div className="gallery-composer-anchor" ref={anchor}>
        <form className="gallery-composer" data-floating={docked} data-editing={focused} data-scroll-hidden={composerHidden} inert={composerHidden} aria-hidden={composerHidden || undefined} onSubmit={event => { event.preventDefault(); start(); }} onFocusCapture={() => { if (!focused) { setScrollHidden(false); setPinnedWhileFocused(docked); setFocused(true); } }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
          <MessageTextarea aria-label="你想创造怎样的世界" aria-describedby="gallery-composer-hint" placeholder="一个念头，就能开启一个世界。想让谁，遇见什么？" value={seed} maxLength={2000} onChange={event => setSeed(event.target.value)} onSend={start} />
          <div className="gallery-composer-tools"><div className="gallery-composer-hint" id="gallery-composer-hint"><span>和 Agent 一起构思</span><small>Enter 发送 · Shift + Enter 换行</small></div><Button className="gallery-send" type="submit" aria-label="与 Agent 一起创作"><ArrowUp /></Button></div>
        </form>
      </div>
      <div className="gallery-prompts" aria-label="创作灵感">{['豪门情感', '职场逆袭', '家族争产', '都市关系'].map(idea => <button key={idea} type="button" onClick={() => setSeed('我想创造一个' + idea + '的小世界，帮我讨论角色、关系和目标。')}>{idea}<ArrowRight /></button>)}<a href="/prologue-comparison">新序章 · 样片对比 ↗</a></div>
    </section>}

    {section !== 'characters' && (recent.length > 0 || section === 'library') && <GalleryReveal className="gallery-recent">
      <div className="studio-heading"><h2>{section === 'library' ? '我的世界与互动' : '接着上次的故事'}</h2><button className="studio-text-button" type="button" onClick={section === 'library' ? () => onCreate() : onLibrary}>{section === 'library' ? '新建世界' : '查看全部'}<ArrowRight /></button></div>
      <div className="gallery-recents">{(section === 'library' ? recent : recent.slice(0, 3)).map(item => <button className="gallery-recent-item" type="button" key={item.id} onClick={() => onOpenRecord(item.id)}><Artwork src={item.cover} alt="" /><span><small>{item.label}</small><strong>{item.title}</strong><span>{item.subtitle}</span></span><ArrowRight /></button>)}</div>
      {!recent.length && <div className="gallery-library-empty"><Compass /><h3>属于你的故事，从这里留下。</h3><p>创作草稿、世界探索和角色对话会分别保存在这里。</p><Button className="studio-button studio-solid" onClick={() => onCreate()}>创建第一个世界<Plus /></Button></div>}
    </GalleryReveal>}

    {section !== 'library' && <section className="gallery-discover" aria-labelledby="discover-title">
      <GalleryReveal className="gallery-discover-heading"><div><h2 id="discover-title">{section === 'characters' ? '遇见世界里的人' : '发现，让你入戏的世界'}</h2><span>{section === 'characters' ? '从一句话，走近 TA 的故事。' : '一段关系，一场反转，一种未曾经历的人生。'}</span></div><button className="studio-agent-entry" onClick={onPersonal} type="button"><Sparkles />让 Agent 帮我挑<ArrowRight /></button></GalleryReveal>
      <div className="gallery-toolbar"><div className="gallery-kind" aria-label="内容类型">{([{ id: 'all', label: '全部灵感' }, { id: 'world', label: '世界' }, { id: 'character', label: '角色' }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={kind === tab.id} onClick={() => setKind(tab.id)}>{tab.label}</button>)}</div><div className="gallery-search"><Search /><input aria-label="搜索世界或角色" placeholder="搜索世界、角色或心情" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" onClick={() => setQuery('')} aria-label="清除搜索"><X /></button>}</div></div>
      <div className="gallery-filters" aria-label="筛选题材">{genres.map(item => <button key={item} type="button" aria-pressed={genre === item} onClick={() => setGenre(item)}>{item}</button>)}</div>
      <GalleryMasonry layoutKey={kind + ':' + genre + ':' + query + ':' + items.length}>{items.map((item, index) => {
        const world = item.kind === 'world' ? item.value : undefined;
        const character = item.kind === 'character' ? item.value : undefined;
        const id = world?.id || character!.worldId + ':' + character!.id;
        const copy = editorialCopy(itemKey(item));
        const title = world ? (copy?.title || world.title) : character!.name;
        const open = () => world ? onOpenWorld(world.id) : onChat(character!.worldId, character!.id);
        return <div className="gallery-cell" key={item.kind + ':' + id} data-gallery-id={item.kind + ':' + id}><GalleryReveal delay={(index % 4) * 60}><article className="gallery-card" data-kind={item.kind} aria-label={title}>
          <button className="gallery-art" onClick={open} type="button" aria-label={world ? '进入世界：' + title : '和' + title + '聊聊'}><Artwork src={world?.cover || character!.image} alt={world ? title + '的世界封面' : title + '的角色形象'} /></button>
          <span className="gallery-type">{world ? <Compass /> : <MessageCircleMore />}{world ? world.genre : '角色'}</span>
          <div className="gallery-card-copy"><small>{world ? (world.fixedRoleId ? '第一人称 · 固定身份体验' : world.roleCount + ' 个可选身份') : character!.worldTitle}</small><h3>{title}</h3>{character && <p>{copy?.tagline || character.identity}</p>}<div className="gallery-card-actions">{world && <button type="button" className="gallery-detail-button" onClick={() => setDetail(world)} aria-label={'剧情简介：' + title}><BookOpen /></button>}<button type="button" className="gallery-enter" onClick={open}>{world ? '进入世界' : '和 TA 聊聊'}<ArrowRight /></button></div></div>
        </article></GalleryReveal></div>;
      })}</GalleryMasonry>
      {!items.length && <div className="gallery-no-results" aria-live="polite"><Search /><h3>暂时没有找到</h3><p>换一个词，或者和 Agent 一起创造它。</p><button className="studio-button" type="button" onClick={() => { setQuery(''); setGenre('全部'); setKind('all'); }}>清除筛选</button></div>}
    </section>}
    <p className="studio-local-note">设定来自创作者，后续故事由 AI 实时演绎。草稿与互动记录保存在当前浏览器。</p>
    {detail && <Dialog open onOpenChange={open => { if (!open) setDetail(null); }}><DialogContent className="studio-world-detail"><DialogTitle>{detail.title}</DialogTitle><DialogDescription>{detail.genre} · {detail.fixedRoleId ? '固定身份体验' : detail.roleCount + ' 个可选身份'}</DialogDescription><Artwork src={detail.cover} alt="" /><p>{detail.premise}</p>{detail.artNote && <small>{detail.artNote}</small>}<Button className="studio-button studio-solid" onClick={() => { onOpenWorld(detail.id); setDetail(null); }}>{detail.fixedRoleId ? '以第一人称进入' : '选择身份进入'}<ArrowRight /></Button></DialogContent></Dialog>}
  </div>;
}
