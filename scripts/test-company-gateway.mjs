import test from 'node:test';
import assert from 'node:assert/strict';
import { companyGateway, companyModel, companyAssetUrl, companyFetch } from '../lib/company-gateway.ts';
import { readMediaInput, SPEECH_VOICES, videoPayload, videoResult } from '../lib/media-policy.ts';
test('gateway credentials cannot be redirected or sent to arbitrary configured hosts',()=>{
  assert.equal(companyGateway({YIBU_API_KEY:'synthetic',YIBU_BASE_URL:'https://yibuapi.com/v1/'}).endpoint,'https://yibuapi.com/v1');
  assert.equal(companyGateway({DEEPSEEK_API_KEY:'old',SILICONFLOW_API_KEY:'old'}),null);
  for(const url of ['http://yibuapi.com','https://evil.test','https://user:pass@yibuapi.com','https://yibuapi.com?key=oops','https://yibuapi.com/custom']) assert.throws(()=>companyGateway({YIBU_BASE_URL:url}));
});
test('operator model changes are bounded, no expensive automatic fallback',()=>{
  assert.equal(companyModel('text',{}),'deepseek-v4.1-flash');
  assert.equal(companyModel('image',{}),'doubao-seedream-4-0-250828');
  assert.equal(companyModel('speech',{}),'doubao-tts');
  assert.throws(()=>companyModel('video',{YIBU_VIDEO_MODEL:'premium-unapproved'}));
});
test('output CDN allowlist rejects private hosts, spoofed domains and credentials',()=>{
  assert.equal(companyAssetUrl('https://a.tos-cn-beijing.volces.com/a.jpg'),'https://a.tos-cn-beijing.volces.com/a.jpg');
  for(const url of ['http://yibuapi.com/a','https://127.0.0.1/a','https://volces.com.evil.test/a','https://user:pass@yibuapi.com/a','https://yibuapi.com:444/a']) assert.throws(()=>companyAssetUrl(url));
});
test('media requires explicit consent, bounded input and supported voice',()=>{
  const input={kind:'speech',text:'你好',voice:SPEECH_VOICES[0].id,confirmed:true};
  assert.ok(readMediaInput(input));
  for(const change of [{confirmed:false},{text:'x'.repeat(1201)},{voice:'clone-real-person'},{kind:'arbitrary'}]) assert.equal(readMediaInput({...input,...change}),null);
  assert.ok(readMediaInput({kind:'video',text:'一只猫在窗边',confirmed:true}));
});
test('short video uses fixed duration and resolution, without user cost overrides',()=>{
  const p=videoPayload('kling-video-o1','一只猫');assert.equal(p.seconds,'5');assert.equal(p.size,'1920x1080');
  assert.equal(p.image_list,undefined);
});
test('video status supports documented variants and never invents a completed result',()=>{
  assert.equal(videoResult({status:'running'}).status,'queued');
  assert.equal(videoResult({status:'failed'}).status,'failed');
  assert.equal(videoResult({status:'completed',metadata:{url:'https://yibuapi.com/v.mp4'}}).status,'ready');
  assert.equal(videoResult({status:'succeeded',content:{video_url:'https://yibuapi.com/v.mp4'}}).status,'ready');
  assert.throws(()=>videoResult({status:'completed'}));assert.throws(()=>videoResult({status:'unknown'}));
});
test('gateway fetch refuses redirects and only accepts reviewed endpoints',async()=>{
  const original=globalThis.fetch, key=process.env.YIBU_API_KEY;process.env.YIBU_API_KEY='synthetic';let called=0;
  globalThis.fetch=async(url,init)=>{called++;assert.equal(url,'https://yibuapi.com/v1/audio/speech');assert.equal(init.redirect,'error');assert.equal(init.headers.Authorization,'Bearer synthetic');return new Response('ok');};
  try { await companyFetch('/audio/speech',{});await assert.rejects(()=>companyFetch('/videos/../../keys'));assert.equal(called,1); }
  finally { globalThis.fetch=original;if(key===undefined)delete process.env.YIBU_API_KEY;else process.env.YIBU_API_KEY=key; }
});
