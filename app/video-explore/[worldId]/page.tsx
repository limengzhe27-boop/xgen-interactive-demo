import { notFound, redirect } from 'next/navigation';
import { rolePrologue } from '@/lib/world-prologue';
import { playableCharacters } from '@/lib/character-entry';
import { studioWorlds } from '@/lib/studio-worlds';
import { VideoExplorer } from '@/components/video-explorer';
import '../video-explore.css';
export default async function VideoExplorePage({params}:{params:Promise<{worldId:string}>}){
  const {worldId}=await params;const entry=studioWorlds.find(w=>w.id===worldId);if(!entry)notFound();
  if(!playableCharacters(entry.world,entry.fixedRoleId).some(role=>rolePrologue(entry.id,role.id,entry.premise,entry.cover).video))redirect(`/?world=${encodeURIComponent(entry.id)}`);
  return <VideoExplorer entry={entry}/>;
}
