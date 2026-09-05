'use client';
/* oxlint-disable next/no-img-element -- local generated catalogue assets */
import { useState } from 'react';
import { ArrowRight, BookOpen, Compass, House, MessageCircleMore, Plus, Send, Sparkles, UserRound, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export type StudioSection = 'home' | 'library' | 'characters' | 'personal';
export type WorldCard = { id: string; title: string; genre: string; premise: string; cover: string; roleCount: number };
export type CharacterCard = { id: string; worldId: string; worldTitle: string; name: string; identity: string; persona: string; image: string };
export type RecentCard = { id: string; title: string; subtitle: string; label: string; cover: string };

export function StudioNav({ section, onNavigate, onCreate }: { section: string; onNavigate: (section: StudioSection) => void; onCreate: () => void }) {
  return <nav className="studio-nav" aria-label="主导航">
    <button className="studio-nav-button studio-new" onClick={() => onCreate()} type="button"><Plus /><span>新建</span></button>
    {([{ id: 'home', label: '首页', icon: House }, { id: 'library', label: '我的世界', icon: Compass }, { id: 'characters', label: '角色库', icon: UsersRound }, { id: 'personal', label: '个人 Agent', icon: UserRound }] as const).map(({ id, label, icon: Icon }) =>
      <button key={id} className="studio-nav-button" aria-current={section === id ? 'page' : undefined} onClick={() => onNavigate(id)} type="button"><Icon /><span>{label}</span></button>)}
    <span className="studio-nav-foot" aria-hidden="true">XGEN</span>
  </nav>;
}

export function StudioHome({ section, worlds, characters, recent, onCreate, onOpenWorld, onChat, onPersonal, onLibrary, onOpenRecord }: {
  section: StudioSection; worlds: WorldCard[]; characters: CharacterCard[]; recent: RecentCard[];
  onCreate: (seed?: string) => void; onOpenWorld: (id: string) => void;
  onChat: (worldId: string, characterId: string) => void; onPersonal: () => void; onLibrary: () => void;
  onOpenRecord: (id: string) => void;
}) {
  const [seed, setSeed] = useState('');
  const [genre, setGenre] = useState('全部');
  const [detail, setDetail] = useState<WorldCard | null>(null);
  const genres = ['全部', ...new Set(worlds.map((world) => world.genre))];
  const shownWorlds = worlds.filter((world) => genre === '全部' || world.genre === genre);
  const shownCharacters = characters.filter((character) => shownWorlds.some((world) => world.id === character.worldId));
  const featured = section === 'home' ? shownWorlds[0] : undefined;
  const gridWorlds = featured ? shownWorlds.slice(1) : shownWorlds;
  return <div className="studio-home">
    {section === 'home' && <section className="studio-create" aria-labelledby="studio-title">
      <div className="studio-create-heading"><div><span className="studio-wordmark">WORLDSTUDIO / 小世界</span><h1 id="studio-title">今天，换你做主角。</h1></div><button className="studio-agent-entry" onClick={onPersonal} type="button"><Sparkles />让 Agent 帮我挑</button></div>
      <form className="studio-composer" onSubmit={(event) => { event.preventDefault(); onCreate(seed); }}>
        <Sparkles aria-hidden="true" />
        <Input aria-label="你想创造怎样的世界" placeholder="写一个念头，把它变成你的世界…" value={seed} onChange={(event) => setSeed(event.target.value)} maxLength={2000} />
        <Button type="submit" className="studio-send" aria-label="与 Agent 一起创作"><Send /></Button>
      </form>
      <div className="studio-prompts">{['豪门情感', '职场逆袭', '家族争产', '都市关系', '海上冒险'].map((idea) => <button key={idea} type="button" onClick={() => setSeed(`我想创造一个${idea}的小世界，帮我讨论角色、关系和目标。`)}>{idea}</button>)}</div>
    </section>}

    {section !== 'characters' && <section className="studio-recent" aria-labelledby="recent-title">
      <div className="studio-heading"><h2 id="recent-title">{section === 'library' ? '我的世界与互动' : '我的世界'}</h2><button className="studio-text-button" type="button" onClick={onLibrary}>{section === 'library' ? '仅保存在此浏览器' : '查看全部'}<ArrowRight /></button></div>
      <div className="studio-recent-grid">
        <button className="studio-create-card" type="button" onClick={() => onCreate()}><Plus /><strong>新建世界</strong><span>从一个念头开始</span></button>
        {(section === 'library' ? recent : recent.slice(0, 2)).map((item) => <article className="studio-recent-card" key={item.id}>
          <img src={item.cover} alt="" /><div className="studio-scrim" />
          <span className="studio-badge">{item.label}</span>
          <div className="studio-recent-copy"><div><h3>{item.title}</h3><p>{item.subtitle}</p></div><button className="studio-button" onClick={() => onOpenRecord(item.id)} type="button">继续<ArrowRight /></button></div>
        </article>)}
        {recent.length === 0 && <div className="studio-empty-recent"><BookOpen /><h3>你的故事，还没开始</h3><p>从下方选一个世界，或先认识其中的人。探索和对话会分别记录在这里。</p></div>}
      </div>
    </section>}

    {section !== 'library' && <section aria-labelledby="discover-title" className="studio-discover">
      <Tabs defaultValue={section === 'characters' ? 'characters' : 'worlds'} key={section}>
        <div className="studio-heading studio-discover-heading"><h2 id="discover-title">{section === 'characters' ? '遇见世界里的人' : '世界探索'}</h2>
          <TabsList variant="line" className="studio-tabs"><TabsTrigger value="worlds">世界</TabsTrigger><TabsTrigger value="characters">角色</TabsTrigger></TabsList>
          <button className="studio-agent-entry" onClick={onPersonal} type="button"><Sparkles />帮我找个本</button>
        </div>
        <div className="studio-filters" aria-label="筛选题材">{genres.map((item) => <button className="studio-filter" key={item} type="button" aria-pressed={genre === item} onClick={() => setGenre(item)}>{item}</button>)}</div>
        <TabsContent value="worlds">
          {featured && <article className="studio-featured">
            <img src={featured.cover} alt="" /><div className="studio-featured-shade" />
            <div className="studio-featured-copy"><span className="studio-featured-label">本期主推 · {featured.genre}</span><h2>{featured.title}</h2><p>{featured.premise}</p>
              <div className="studio-featured-actions"><Button className="studio-button studio-solid" onClick={() => onOpenWorld(featured.id)}>选择身份，进入故事<ArrowRight /></Button><button type="button" className="studio-text-button" onClick={() => setDetail(featured)}>剧情简介<BookOpen /></button></div>
              <div className="studio-featured-cast">{characters.filter((role) => role.worldId === featured.id).slice(0, 3).map((role) => <button type="button" key={role.id} onClick={() => onChat(featured.id, role.id)} aria-label={`和${role.name}聊聊`}><img src={role.image} alt="" /><span>{role.name}</span><MessageCircleMore /></button>)}</div>
            </div>
          </article>}
          <div className="studio-world-grid">{gridWorlds.map((world) => <article className="studio-card" key={world.id}>
          <button className="studio-cover" type="button" onClick={() => onOpenWorld(world.id)} aria-label={`进入世界：${world.title}`}><img src={world.cover} alt="" /><span className="studio-badge">{world.genre}</span></button>
          <div className="studio-card-copy"><h3 title={world.title}>{world.title}</h3><p>{world.premise}</p><small>{world.roleCount} 个身份，换个视角重写结局</small></div>
          <div className="studio-card-footer"><button className="studio-text-button" type="button" onClick={() => setDetail(world)}>剧情简介</button><button className="studio-button" type="button" onClick={() => onOpenWorld(world.id)}>进入世界<ArrowRight /></button></div>
        </article>)}</div></TabsContent>
        <TabsContent value="characters"><div className="studio-world-grid">{shownCharacters.map((character) => <article className="studio-card" key={`${character.worldId}:${character.id}`}>
          <button className="studio-cover studio-character-cover" type="button" onClick={() => onChat(character.worldId, character.id)} aria-label={`和${character.name}聊聊`}><img src={character.image} alt={`${character.name}的角色形象`} /><span className="studio-badge">{character.worldTitle}</span></button>
          <div className="studio-card-copy"><h3>{character.name}</h3><small>{character.identity}</small><p>{character.persona}</p></div>
          <button className="studio-button studio-card-action" type="button" onClick={() => onChat(character.worldId, character.id)}><MessageCircleMore />和 TA 聊聊<ArrowRight /></button>
        </article>)}</div>{shownCharacters.length === 0 && <p className="studio-empty">这个题材暂未开放独立角色对话，可以先从世界入口探索。</p>}</TabsContent>
      </Tabs>
    </section>}
    <p className="studio-local-note">世界设定与开场由创作者编写，后续剧情实时生成。你的草稿和互动记录保存在当前浏览器。</p>
    {detail && <Dialog open onOpenChange={(open) => { if (!open) setDetail(null); }}><DialogContent className="studio-world-detail"><DialogTitle>{detail.title}</DialogTitle><DialogDescription>{detail.genre} · {detail.roleCount} 个可选身份</DialogDescription><img src={detail.cover} alt="" /><p>{detail.premise}</p><Button className="studio-button studio-solid" onClick={() => { onOpenWorld(detail.id); setDetail(null); }}>选择身份进入<ArrowRight /></Button></DialogContent></Dialog>}
  </div>;
}
