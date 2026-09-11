type Buffered={promise:Promise<string>;url?:string;abort:AbortController};
// Private, page-local only. No service worker or shared HTTP cache of private video.
export class VideoBuffer {
  constructor(private measure?:(src:string)=>(status?:string)=>void){}
  private entries=new Map<string,Buffered>();
  peek(src:string){return this.entries.get(src)?.url;}
  pauseDownloads(){for(const [src,item] of this.entries)if(!item.url){item.abort.abort();this.entries.delete(src);}}
  playbackSource(src:string){
    const item=this.entries.get(src);
    if(item?.url)return item.url;
    // Do not block playback on a complete Blob. Release the competing download
    // and let the same authenticated endpoint serve browser Range requests.
    if(item){item.abort.abort();this.entries.delete(src);}
    return src;
  }
  retain(sources:string[]){
    const keep=new Set(sources);
    for(const [src,item] of this.entries)if(!keep.has(src)){
      item.abort.abort();if(item.url)URL.revokeObjectURL(item.url);this.entries.delete(src);
    }
  }
  dispose(){this.retain([]);}
  load(src:string):Promise<string>{
    const existing=this.entries.get(src);if(existing)return existing.promise;
    if(!/^\/api\/media\/asset\/[a-f0-9]{64}$/.test(src))return Promise.reject(Error('invalid_video_asset'));
    if(this.entries.size>=4)return Promise.reject(Error('video_buffer_full'));
    const abort=new AbortController();
    const finish=this.measure?.(src);
    const item:Buffered={abort,promise:Promise.resolve('')};
    this.entries.set(src,item);
    item.promise=(async()=>{
      const timer=setTimeout(()=>abort.abort(),45000);
      try{
        const r=await fetch(src,{credentials:'same-origin',cache:'no-store',signal:abort.signal});
        if(!r.ok||!r.headers.get('content-type')?.includes('video/mp4')||!r.body)throw Error('video_buffer_unavailable');
        const limit=24*1024*1024;
        if(Number(r.headers.get('content-length'))>limit)throw Error('video_buffer_too_large');
        const reader=r.body.getReader(),chunks:Uint8Array<ArrayBuffer>[]=[];let bytes=0;
        while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;
          if(bytes>limit){await reader.cancel();throw Error('video_buffer_too_large');}
          chunks.push(new Uint8Array(part.value));
        }
        if(abort.signal.aborted||!bytes)throw Error('video_buffer_cancelled');
        item.url=URL.createObjectURL(new Blob(chunks,{type:'video/mp4'}));finish?.('完成');return item.url;
      }catch(e){finish?.(abort.signal.aborted?'中止／超时':'失败');abort.abort();if(this.entries.get(src)===item)this.entries.delete(src);throw e;}
      finally{clearTimeout(timer);}
    })();return item.promise;
  }
}
