// One stable billing key per session, scene and action; never an array index.
export async function videoBranchTurnKey(sessionId:string, sceneKey:string, action:string) {
  const bytes=new TextEncoder().encode(JSON.stringify(['video-branch-v1',sessionId,sceneKey,action]));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return `branch:${Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')}`;
}

// Decode the ending in a separate player: do not seek or interrupt the visible video.
export function videoEndingFrame(src:string):Promise<string> {
  return new Promise((resolve,reject)=>{
    const video=document.createElement('video');
    video.muted=true;video.preload='auto';video.playsInline=true;
    const finish=(error?:Error,frame?:string)=>{
      clearTimeout(timer);video.onloadedmetadata=null;video.onseeked=null;video.onerror=null;
      video.removeAttribute('src');video.load();
      if(error)reject(error);else resolve(frame!);
    };
    const timer=setTimeout(()=>finish(Error('末帧读取超时；尚未预生成视频')),20000);
    video.onerror=()=>finish(Error('末帧暂时无法读取；尚未预生成视频'));
    video.onloadedmetadata=()=>{
      if(!Number.isFinite(video.duration)||video.duration<=0)return finish(Error('视频时长无效'));
      video.currentTime=Math.max(0,video.duration-0.05);
    };
    video.onseeked=()=>{
      try{
        if(!video.videoWidth||!video.videoHeight)throw Error('末帧尚未解码');
        const canvas=document.createElement('canvas');canvas.width=Math.min(960,video.videoWidth);
        canvas.height=Math.round(canvas.width*video.videoHeight/video.videoWidth);
        canvas.getContext('2d')!.drawImage(video,0,0,canvas.width,canvas.height);
        finish(undefined,canvas.toDataURL('image/jpeg',0.82));
      }catch(e){finish(e instanceof Error?e:Error('末帧读取失败'));}
    };
    video.src=src;
  });
}
