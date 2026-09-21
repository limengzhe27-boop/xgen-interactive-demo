import test from 'node:test';
import assert from 'node:assert/strict';
import {remoteAIAdapter} from '../lib/remote-ai-adapter.ts';
import {creatorResponseForTransport} from '../lib/creator-directions.ts';
import {readFileSync} from 'node:fs';
const result={reply:'可以先检查入口',discussionOnly:true,proposal:{title:'测试',premise:'测试',brief:{coreGoal:'',preferredDirection:'',alternativeDirection:'',complexityLevel:2,tasks:[],difficulties:[],scheduledEvents:[]}},nextQuestions:[],readiness:'needs_detail'};

test('transport serves old tabs while new clients retain only canonical fields', async()=>{
  const wire=creatorResponseForTransport(result);
  assert.equal(wire.proposal.brief.successCondition,'');
  assert.equal(wire.proposal.brief.failureCondition,'');
  assert.ok(!('successCondition' in result.proposal.brief));
  const oldFetch=globalThis.fetch;
  try {
    for(const ending of ['\n\n','','\r\n\r\n']) {
      const source=`event: chunk\ndata: ${JSON.stringify({text:'可以先检查入口'})}\n\nevent: final\ndata: ${JSON.stringify(wire)}${ending}`;
      // Split on arbitrary bytes, including multibyte Chinese characters.
      const bytes=new TextEncoder().encode(source);
      globalThis.fetch=async()=>new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close();}}),{headers:{'content-type':'text/event-stream'}});
      const chunks=[];
      const response=await remoteAIAdapter.coCreateWorld({},undefined,c=>chunks.push(c.text));
      assert.equal(chunks[0],result.reply);
      assert.deepEqual(response,result);
    }
  } finally {globalThis.fetch=oldFetch;}
});
test('visible chunks never become an accepted proposal on missing or invalid final',async()=>{
  const oldFetch=globalThis.fetch;
  try {
    for(const tail of ['', 'event: final\ndata: {bad}\n\n','event: error\ndata: {"error":"model_timeout"}\n\n']) {
      globalThis.fetch=async()=>new Response('event: chunk\ndata: {"text":"已收到的片段"}\n\n'+tail,{headers:{'content-type':'text/event-stream'}});
      const chunks=[];
      await assert.rejects(remoteAIAdapter.coCreateWorld({},undefined,c=>chunks.push(c.text)));
      assert.deepEqual(chunks,['已收到的片段']);
    }
  } finally {globalThis.fetch=oldFetch;}
});
test('creator UI retains failure fragments but excludes them from model history',()=>{
  const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  assert.ok(source.includes('let streamedReply'));
  assert.ok(source.includes('本轮未完成，以下为已收到的回复片段'));
  assert.ok(source.includes('creatorMessages.filter(message => !message.incomplete)'));
});
