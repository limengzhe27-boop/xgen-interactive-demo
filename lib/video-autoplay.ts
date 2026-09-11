// Browser autoplay permission is not ours to override. Prefer sound, then start
// muted with an explicit sound control rather than a misleading buffering screen.
export async function startVideo(video:Pick<HTMLVideoElement,'play'|'muted'>,wanted:()=>boolean){
  if(!wanted())return 'cancelled';
  try{await video.play();return wanted()?(video.muted?'muted':'playing'):'cancelled';}
  catch(e){
    if(!wanted())return 'cancelled';
    if(!(e instanceof Error)||e.name!=='NotAllowedError')throw e;
    video.muted=true;
    await video.play();
    return wanted()?'muted':'cancelled';
  }
}
