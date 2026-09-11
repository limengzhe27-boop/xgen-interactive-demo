// Retry read-only queries only. Never replay a billable POST here.
export async function queryVideo(url:string,scope:string,signal:AbortSignal,onRetry:()=>void=()=>{}){
  for(let attempt=0;;attempt++){
    signal.throwIfAborted();
    try{
      const response=await fetch(url,{headers:{'x-xgen-account':scope},cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(30000)])});
      if(![408,429,500,502,503,504].includes(response.status)||attempt>=2)return response;
      await response.body?.cancel();
    }catch(error){if(signal.aborted||attempt>=2)throw error;}
    onRetry();
    await new Promise<void>((resolve,reject)=>{
      const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};
      const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},1000*(attempt+1));
      signal.addEventListener('abort',abort,{once:true});
      if(signal.aborted)abort();
    });
  }
}
