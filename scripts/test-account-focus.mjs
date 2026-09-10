import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('side-panel focus keeps content; real account changes and failures stay protected', async () => {
  const old = { window:globalThis.window, document:globalThis.document, fetch:globalThis.fetch };
  const events = new Map(), states = [], effects = [];
  const surface = { addEventListener:(key,fn)=>events.set(key,fn), removeEventListener:key=>events.delete(key) };
  globalThis.window = { ...surface, location:{search:''} };
  globalThis.document = { ...surface, hidden:false, documentElement:{dataset:{}} };
  const pending=[];
  globalThis.fetch=()=>new Promise(resolve=>pending.push(resolve));
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  let cleanup;
  try {
    const exports={};
    const source=ts.transpileModule(readFileSync(new URL('../components/account-boundary.tsx',import.meta.url),'utf8'),{
      compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},
    }).outputText;
    const require=name=>name==='react'?{
      useState:initial=>{const i=states.length;states.push(initial);return[initial,value=>states[i]=value];},
      useEffect:fn=>effects.push(fn),
    }:name==='react/jsx-runtime'?{jsx:()=>null,jsxs:()=>null}: {Button:()=>null};
    new Function('require','exports',source)(require,exports);
    exports.AccountBoundary({children:()=>null});cleanup=effects[0]();
    pending.shift()({ok:true,json:async()=>({user:null})});await flush();
    assert.equal(states[2],false);
    assert.equal(events.has('blur'),false,'visible browser chrome must not hide the app');
    events.get('focus')();assert.equal(states[2],false);
    pending.shift()({ok:true,json:async()=>({user:null})});await flush();
    assert.equal(states[0],'guest');assert.equal(states[2],false);
    events.get('storage')({key:'xgen-account-change'});assert.equal(states[2],true);
    const id='12345678-1234-1234-1234-123456789abc';
    pending.shift()({ok:true,json:async()=>({user:{id}})});await flush();
    assert.equal(states[0],id);assert.equal(states[2],false);
    document.hidden=true;events.get('visibilitychange')();assert.equal(states[2],true);
    document.hidden=false;events.get('visibilitychange')();
    pending.shift()({ok:false});await flush();
    assert.equal(states[2],true);assert.equal(states[1],true);
    assert.equal(document.documentElement.dataset.accountLocked,'true');
  } finally { cleanup?.();Object.assign(globalThis,old); }
});
