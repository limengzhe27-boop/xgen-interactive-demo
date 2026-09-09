import { notFound } from 'next/navigation';
import { studioWorlds } from '@/lib/studio-worlds';
import { VideoExplorer } from '@/components/video-explorer';
import '../video-explore.css';
export default async function VideoExplorePage({params}:{params:Promise<{worldId:string}>}){
  const {worldId}=await params;const entry=studioWorlds.find(w=>w.id===worldId);if(!entry)notFound();
  return <VideoExplorer entry={entry}/>;
}
