import { studioWorlds } from '@/lib/studio-worlds';
import { VideoExplorer } from '@/components/video-explorer';
import '../../video-explore/video-explore.css';

export default function NativeAscensionPreview() {
  const entry = studioWorlds.find(world => world.id === 'ascension-work-number')!;
  return <VideoExplorer entry={entry}/>;
}
