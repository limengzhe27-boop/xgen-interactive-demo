'use client';
/* oxlint-disable next/no-img-element -- existing original artwork; no generation on browse */
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUp, BookOpen, Compass, House, MessageCircleMore, Plus, Search, Sparkles, UserRound, UsersRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageTextarea } from '@/components/message-textarea';
import { GalleryAtmosphere, GalleryMasonry, GalleryReveal } from '@/components/gallery-motion';
import { mixGallery } from '@/lib/gallery-order';
import { editorialCopy, featureHomeItems, HOME_ARTWORK } from '@/lib/home-editorial';
import { catalogueIdentity } from '@/lib/catalog-art';
import { characterHook, characterSearchText } from '@/lib/character-card';
import { usePlayCounts } from '@/components/play-counts';
import { advanceComposerScroll } from '@/lib/composer-scroll';
import { DISCOVERY_CHANNELS, matchesDiscovery } from '@/lib/discovery-category';
import { restoreGalleryPosition, type GalleryBrowseState, type GalleryPosition } from '@/lib/gallery-memory';

export type StudioSection = 'home' | 'library' | 'characters' | 'personal' | 'profile';
export type WorldCard = { id: string; title: string; originalTitle?: string; genre: string; premise: string; cover: string; roleCount: number; artNote?: string; featured?: boolean; fixedRoleId?: string; characterOnly?: boolean };
export type CharacterCard = { id: string; worldId: string; worldTitle: string; name: string; identity: string; persona: string; image: string; cardHook?: string };
export type RecentCard = { id: string; title: string; subtitle: string; label: string; cover: string };
type GalleryItem = { kind: 'world'; value: WorldCard } | { kind: 'character'; value: CharacterCard };

export function StudioNav({ section, onNavigate, onCreate, onCreateCharacter }: { section: string; onNavigate: (section: StudioSection) => void; onCreate: () => void; onCreateCharacter: () => void }) {
  const nav = useRef<HTMLElement>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!createMenuOpen) return;
    const closeOnPointer = (event: PointerEvent) => { if (!createMenuRef.current?.contains(event.target as Node)) setCreateMenuOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setCreateMenuOpen(false); };
    document.addEventListener('pointerdown', closeOnPointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOnPointer); document.removeEventListener('keydown', closeOnEscape); };
  }, [createMenuOpen]);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; if (nav.current) nav.current.dataset.scrolled = String(scrollY > 24); };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    addEventListener('scroll', scroll, { passive: true }); update();
    return () => { removeEventListener('scroll', scroll); cancelAnimationFrame(frame); };
  }, []);
  return <nav ref={nav} className="studio-nav" aria-label="主导航">
    <span className="studio-nav-brand" aria-hidden="true"><Sparkles /></span>
    <div className="studio-new-wrap" ref={createMenuRef}>
      <button className="studio-nav-button studio-new" aria-haspopup="menu" aria-expanded={createMenuOpen} onClick={() => setCreateMenuOpen(open => !open)} type="button"><Plus /><span>新建</span></button>
      {createMenuOpen && <div className="studio-new-menu" role="menu" aria-label="新建">
        <button type="button" role="menuitem" onClick={() => { setCreateMenuOpen(false); onCreate(); }}><BookOpen /><span><strong>新建世界</strong><small>从一个故事想法开始创作</small></span></button>
        <button type="button" role="menuitem" onClick={() => { setCreateMenuOpen(false); onCreateCharacter(); }}><UserRound /><span><strong>新建角色</strong><small>创建一个可独立对话的角色</small></span></button>
      </div>}
    </div>
    {([{ id: 'home', label: '首页', icon: House }, { id: 'library', label: '我的世界', icon: Compass }, { id: 'characters', label: '角色库', icon: UsersRound }, { id: 'personal', label: '个人 Agent', icon: MessageCircleMore }, { id: 'profile', label: '我的', icon: UserRound }] as const).map(({ id, label, icon: Icon }) =>
      <button key={id} className="studio-nav-button" aria-current={section === id ? 'page' : undefined} onClick={() => onNavigate(id)} type="button"><Icon /><span>{label}</span></button>)}
    <span className="studio-nav-foot" aria-hidden="true">XGEN</span>
  </nav>;
}

function Artwork({ src, alt, recent = false }: { src: string; alt: string; recent?: boolean }) {
  const [failedSrc, setFailedSrc] = useState('');
  return src && failedSrc !== src ? <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} /> : <div className="gallery-art-unavailable"><BookOpen /><span>{recent ? '暂无封面' : '封面暂不可用'}</span></div>;
}

export function StudioHome({ section, worlds, characters, recent, onCreate, onOpenWorld, onChat, onPersonal, onLibrary, onOpenRecord, initialBrowse, returnPosition, onBrowseChange }: {
  initialBrowse?: GalleryBrowseState; returnPosition?: GalleryPosition; onBrowseChange?: (state: GalleryBrowseState) => void;
  section: StudioSection; worlds: WorldCard[]; characters: CharacterCard[]; recent: RecentCard[];
  onCreate: (seed?: string) => void; onOpenWorld: (id: string) => void;
  onChat: (worldId: string, characterId: string) => void; onPersonal: () => void; onLibrary: () => void;
  onOpenRecord: (id: string) => void;
}) {
  const counts = usePlayCounts();
  const [seed, setSeed] = useState(initialBrowse?.seed ?? '');
  const [genre, setGenre] = useState<string>(DISCOVERY_CHANNELS.some(channel => channel === initialBrowse?.genre) ? initialBrowse!.genre : '全部');
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
  const publicIdentities=new Set(worlds.filter(w=>w.id.startsWith('community-')).map(catalogueIdentity));
  const orderedWorlds = worlds.filter(w=>w.id.startsWith('community-')||!publicIdentities.has(catalogueIdentity(w))).sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  const genres = DISCOVERY_CHANNELS;
  const matches = (text: string) => text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const grouped: GalleryItem[] = [];
  orderedWorlds.filter(world => (world.characterOnly && section === 'characters') || matchesDiscovery(world, genre)).forEach(world => {
    if (!world.characterOnly && kind !== 'character' && matches(world.title + ' ' + (world.originalTitle ?? '') + ' ' + (editorialCopy('world:' + world.id)?.title ?? '') + ' ' + world.genre + ' ' + world.premise)) grouped.push({ kind: 'world', value: world });
    if (kind !== 'world') characters.filter(character => character.worldId === world.id && matches(characterSearchText(character, editorialCopy('character:' + character.worldId + ':' + character.id)?.tagline, editorialCopy('world:' + character.worldId)?.title))).forEach(character => grouped.push({ kind: 'character', value: character }));
  });
  const itemKey = (item: GalleryItem) => item.kind + ':' + (item.kind === 'world' ? item.value.id : item.value.worldId + ':' + item.value.id);
  const mixed = mixGallery(grouped, itemKey, item => item.kind === 'world' ? item.value.id : item.value.worldId);
  const featured = featureHomeItems(mixed, itemKey);
  const freshKeys=new Set(featured.filter(item=>(item.kind==='world'?item.value.id:item.value.worldId).startsWith('community-')).map(itemKey));
  const notFresh=featured.filter(item=>!freshKeys.has(itemKey(item)));
  const lead=notFresh.slice(0,24),rest=notFresh.slice(24);
  const items = isHome && genre === '全部' && kind === 'all' && !query.trim() ? [...lead,...featured.filter(item=>freshKeys.has(itemKey(item))),...rest] : mixed;
  // Newly created standalone characters are the reader's own work; surface them
  // first in 角色库 instead of leaving them to the deterministic gallery mix.
  const standaloneCharacterItem = (item: GalleryItem) => item.kind === 'character' && item.value.worldId.startsWith('character-');
  const displayed = section === 'characters'
    ? [...items.filter(standaloneCharacterItem).reverse(), ...items.filter(item => !standaloneCharacterItem(item))]
    : items;
  const start = () => onCreate(seed);

  return <div className="studio-home">
    {isHome && <section className="gallery-hero" aria-labelledby="studio-title">
      <GalleryAtmosphere />
      <div className="gallery-hero-heading"><span className="studio-wordmark gallery-eyebrow">XGEN · 小世界</span><h1 id="studio-title">你想创作什么故事？</h1><p className="gallery-eyebrow">从一个想法开始，逐步确定人物、背景和开场。</p></div>
      <div className="gallery-composer-anchor" ref={anchor}>
        <form className="gallery-composer" data-floating={docked} data-editing={focused} data-scroll-hidden={composerHidden} inert={composerHidden} aria-hidden={composerHidden || undefined} onSubmit={event => { event.preventDefault(); start(); }} onFocusCapture={() => { if (!focused) { setScrollHidden(false); setPinnedWhileFocused(docked); setFocused(true); } }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
          <MessageTextarea aria-label="故事想法" aria-describedby="gallery-composer-hint" placeholder="写下你的故事想法，也可以先写一个人物或场景。" value={seed} maxLength={2000} onChange={event => setSeed(event.target.value)} onSend={start} />
          <div className="gallery-composer-tools"><div className="gallery-composer-hint" id="gallery-composer-hint"><span>开始创作</span><small>Enter 发送 · Shift + Enter 换行</small></div><Button className="gallery-send" type="submit" aria-label="开始创作"><ArrowUp /></Button></div>
        </form>
      </div>
      <div className="gallery-prompts" aria-label="创作示例">{['家族争产', '职场逆袭', '悬疑调查', '轻松日常'].map(idea => <button key={idea} type="button" onClick={() => setSeed('我想写一个' + idea + '的故事。')}>{idea}<ArrowRight /></button>)}</div>
    </section>}

    {section !== 'characters' && (recent.length > 0 || section === 'library') && <GalleryReveal className="gallery-recent">
      <div className="studio-heading"><h2>{section === 'library' ? '我的作品与记录' : '最近使用'}</h2><button className="studio-text-button" type="button" onClick={section === 'library' ? () => onCreate() : onLibrary}>{section === 'library' ? '新建世界' : '查看全部'}<ArrowRight /></button></div>
      <div className="gallery-recents">{(section === 'library' ? recent : recent.slice(0, 3)).map(item => <button className="gallery-recent-item" type="button" key={item.id} onClick={() => onOpenRecord(item.id)}><Artwork src={item.cover} alt="" recent /><span><small>{item.label}</small><strong>{item.title}</strong><span>{item.subtitle}</span></span><ArrowRight /></button>)}</div>
      {!recent.length && <div className="gallery-library-empty"><Compass /><h3>暂无作品或记录</h3><p>创作草稿、世界探索和角色对话会显示在这里。</p><Button className="studio-button studio-solid" onClick={() => onCreate()}>创建故事<Plus /></Button></div>}
    </GalleryReveal>}

    {section !== 'library' && <section className="gallery-discover" aria-labelledby="discover-title">
      <GalleryReveal className="gallery-discover-heading"><div><h2 id="discover-title">{section === 'characters' ? '角色' : '发现故事'}</h2><span>{section === 'characters' ? '选择角色开始聊天。' : '选择世界进入故事，或选择角色开始聊天。'}</span></div><button className="studio-agent-entry" onClick={onPersonal} type="button"><Sparkles />帮我推荐<ArrowRight /></button></GalleryReveal>
      <div className="gallery-toolbar"><div className="gallery-kind" aria-label="内容类型">{([{ id: 'all', label: '全部' }, { id: 'world', label: '世界' }, { id: 'character', label: '角色' }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={kind === tab.id} onClick={() => setKind(tab.id)}>{tab.label}</button>)}</div><div className="gallery-search"><Search /><input aria-label="搜索世界或角色" placeholder="搜索世界或角色" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" onClick={() => setQuery('')} aria-label="清除搜索"><X /></button>}</div></div>
      <div className="gallery-filters" aria-label="筛选题材">{genres.map(item => <button key={item} type="button" aria-pressed={genre === item} onClick={() => setGenre(item)}>{item}</button>)}</div>
      <GalleryMasonry layoutKey={kind + ':' + genre + ':' + query + ':' + displayed.length}>{displayed.map((item, index) => {
        const world = item.kind === 'world' ? item.value : undefined;
        const character = item.kind === 'character' ? item.value : undefined;
        const id = world?.id || character!.worldId + ':' + character!.id;
        const copy = editorialCopy(itemKey(item));
        const title = world ? (copy?.title || world.title) : characterHook(character!.cardHook, copy?.tagline);
        const open = () => world ? onOpenWorld(world.id) : onChat(character!.worldId, character!.id);
        return <div className="gallery-cell" key={item.kind + ':' + id} data-gallery-id={item.kind + ':' + id}><GalleryReveal delay={(index % 4) * 60}><article className="gallery-card" data-kind={item.kind} aria-label={title}>
          <button className="gallery-art" onClick={open} type="button" aria-label={world ? '进入：' + title : '与' + character!.name + '对话：' + title}><Artwork src={HOME_ARTWORK[itemKey(item)] || world?.cover || character!.image} alt="" /></button>
          <div className="gallery-card-copy">{title && <h3>{title}</h3>}{counts[itemKey(item)] !== undefined && <span className="gallery-play-count" title="启用统计后实际开始体验的登录账号数，同一账号不重复计数">{counts[itemKey(item)].toLocaleString('zh-CN')} 人玩过</span>}</div>
        </article></GalleryReveal></div>;
      })}</GalleryMasonry>
      {!displayed.length && <div className="gallery-no-results" aria-live="polite"><Search /><h3>暂时没有找到</h3><p>换一个词，或者和 Agent 一起创造它。</p><button className="studio-button" type="button" onClick={() => { setQuery(''); setGenre('全部'); setKind('all'); }}>清除筛选</button></div>}
    </section>}
    <p className="studio-local-note">设定来自创作者，后续故事由 AI 实时演绎。草稿与互动记录保存在当前浏览器。</p>
  </div>;
}
