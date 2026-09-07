import test from 'node:test';
import assert from 'node:assert/strict';
import { localPortrait, checkPortraitFile, readPersonaUpload } from '../lib/persona-upload.ts';
import { restorePlayerPersona } from '../lib/player-persona.ts';
import { readPersonaDraft } from '../lib/persona-design.ts';
const data='data:image/jpeg;base64,/9j/AAAA';
test('uploaded portraits are bounded raster data, not URLs or SVG',()=>{
  assert.ok(localPortrait(data));
  for(const v of ['https://tracker.test/a.jpg','data:image/svg+xml;base64,PHN2Zz4=',data+'A'.repeat(240000),'data:image/jpeg;base64,script'])assert.ok(!localPortrait(v));
  assert.throws(()=>checkPortraitFile({type:'image/svg+xml',size:20}));
  assert.throws(()=>checkPortraitFile({type:'image/jpeg',size:9*1024*1024}));
});
test('local image remains in same-account persona and cannot be restored as another owner',()=>{
  const p={version:1,ownerId:'a',name:'测试',identity:'',personality:'',appearance:'',abilities:'',updatedAt:1,portraitUrl:data};
  assert.equal(restorePlayerPersona(p,'a').portraitUrl,data);
  assert.equal(restorePlayerPersona(p,'b'),null);
  assert.ok(!JSON.stringify(readPersonaDraft(p)).includes(data));
});
test('image conversion resizes, strips file metadata and releases bitmap without network',async()=>{
  const oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
  let closed=false,drawn=false;
  const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){drawn=true;}}),toDataURL:()=>data};
  globalThis.createImageBitmap=async()=>({width:1600,height:2400,close(){closed=true;}});
  globalThis.document={createElement:()=>canvas};
  try{assert.equal(await readPersonaUpload({type:'image/png',size:1000}),data);assert.equal(canvas.height,768);assert.equal(canvas.width,512);assert.ok(closed&&drawn);}
  finally{globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
});
