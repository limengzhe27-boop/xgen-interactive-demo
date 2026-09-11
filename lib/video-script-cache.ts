// Page-local exact-request reuse, never shared across accounts or browser tabs.
export class VideoScriptCache<T>{
  private entries=new Map<string,{promise:Promise<T>;abort:AbortController;expires:number}>();
  run(key:string,work:(signal:AbortSignal)=>Promise<T>):Promise<T>{
    const old=this.entries.get(key);if(old&&old.expires>Date.now())return old.promise;
    if(old){old.abort.abort();this.entries.delete(key);}
    for(const [k,item] of this.entries)if(item.expires<=Date.now()){item.abort.abort();this.entries.delete(k);}
    // Bound memory; evicted ongoing calls are cancelled, not left orphaned.
    while(this.entries.size>=6){const [k,item]=this.entries.entries().next().value!;item.abort.abort();this.entries.delete(k);}
    const abort=new AbortController();
    const item:{abort:AbortController;expires:number;promise:Promise<T>}={abort,expires:Date.now()+60_000,promise:Promise.resolve(null as T)};
    this.entries.set(key,item);
    item.promise=Promise.resolve().then(()=>{if(abort.signal.aborted)throw new DOMException('Aborted','AbortError');return work(abort.signal);}).then(result=>{
      if(abort.signal.aborted)throw new DOMException('Aborted','AbortError');
      return result;
    }).catch(e=>{if(this.entries.get(key)===item)this.entries.delete(key);throw e;});
    return item.promise;
  }
  clear(){for(const item of this.entries.values())item.abort.abort();this.entries.clear();}
}
