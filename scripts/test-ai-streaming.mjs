import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      for (const suffix of ['.tsx', '.ts']) {
        const url = new URL(specifier + suffix, context.parentURL);
        if (existsSync(url)) return next(url.href, context);
      }
    }
    if (specifier.startsWith('@/')) {
      const path = root + specifier.slice(2);
      for (const suffix of ['.tsx', '.ts']) {
        if (existsSync(path + suffix)) return next(pathToFileURL(path + suffix).href, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('file:') && /\.tsx?$/.test(url)) {
      return {
        format: 'module',
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      };
    }
    return next(url, context);
  },
});

const { POST } = await import('../app/api/ai/route.ts');
const { AI_CONTRACT_VERSION } = await import('../lib/ai-contracts.ts');
const { createRemoteAIAdapter } = await import('../lib/remote-ai-adapter.ts');
const { makeEndingFixture } = await import('./ending-fixture.mjs');

test('route returns text/event-stream with chunks and final event when Accept: text/event-stream is sent', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.YIBU_API_KEY;
  process.env.YIBU_API_KEY = 'test-streaming-key';

  const mockChunks = [
    JSON.stringify({ choices: [{ delta: { content: '{"reply":"你好，' } }] }),
    JSON.stringify({ choices: [{ delta: { content: '我是你的个人助理。","memoryCandidates":[],"recommendations":[]}' } }] }),
  ];

  globalThis.fetch = async (url) => {
    assert.match(String(url), /chat\/completions/);
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of mockChunks) {
          controller.enqueue(new TextEncoder().encode(`data: ${chunk}\n\n`));
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  };

  try {
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json',
      },
      body: JSON.stringify({
        operation: 'personal-agent',
        input: {
          contractVersion: AI_CONTRACT_VERSION,
          userMessage: '你好',
          conversation: [],
          currentMemories: [],
          availableWorldIds: [],
        },
      }),
    });

    const response = await POST(request);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type')?.includes('text/event-stream'));

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }

    assert.ok(text.includes('event: chunk'));
    assert.ok(text.includes('event: final'));
    assert.ok(text.includes('我是你的个人助理'));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.YIBU_API_KEY;
    else process.env.YIBU_API_KEY = originalKey;
  }
});

test('remoteAIAdapter reads SSE stream, emits chunks and returns final validated result', async () => {
  const originalFetch = globalThis.fetch;

  const sseBody = [
    'event: chunk\ndata: {"delta":"你好","text":"你好"}\n\n',
    'event: chunk\ndata: {"delta":"，我是","text":"你好，我是"}\n\n',
    'event: final\ndata: {"reply":"你好，我是","memoryCandidates":[],"recommendations":[]}\n\n',
  ].join('');

  const receivedChunks = [];

  globalThis.fetch = async () => {
    return new Response(sseBody, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  };

  try {
    const adapter = createRemoteAIAdapter('test-scope');
    const result = await adapter.talkToPersonalAgent(
      {
        contractVersion: AI_CONTRACT_VERSION,
        userMessage: '你好',
        conversation: [],
        currentMemories: [],
        availableWorldIds: [],
      },
      undefined,
      (chunk) => {
        receivedChunks.push(chunk);
      }
    );

    assert.equal(receivedChunks.length, 2);
    assert.equal(receivedChunks[0].text, '你好');
    assert.equal(receivedChunks[1].text, '你好，我是');
    assert.equal(result.reply, '你好，我是');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('remoteAIAdapter handles upstream streaming errors safely with user-facing message', async () => {
  const originalFetch = globalThis.fetch;

  const sseBody = 'event: error\ndata: {"error":"model_timeout"}\n\n';

  globalThis.fetch = async () => {
    return new Response(sseBody, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  };

  try {
    const adapter = createRemoteAIAdapter('test-scope');
    await assert.rejects(
      () => adapter.talkToPersonalAgent({
        contractVersion: AI_CONTRACT_VERSION,
        userMessage: '测试超时',
        conversation: [],
        currentMemories: [],
        availableWorldIds: [],
      }),
      /模型响应超时/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('remoteAIAdapter falls back smoothly to standard JSON when server does not stream', async () => {
  const originalFetch = globalThis.fetch;

  const jsonResult = {
    reply: '标准非流式响应',
    memoryCandidates: [],
    recommendations: [],
  };

  globalThis.fetch = async () => {
    return new Response(JSON.stringify(jsonResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const adapter = createRemoteAIAdapter('test-scope');
    const result = await adapter.talkToPersonalAgent({
      contractVersion: AI_CONTRACT_VERSION,
      userMessage: '非流式测试',
      conversation: [],
      currentMemories: [],
      availableWorldIds: [],
    });

    assert.equal(result.reply, '标准非流式响应');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('route streams advance-world narrative chunks and returns guarded final response', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.YIBU_API_KEY;
  process.env.YIBU_API_KEY = 'test-streaming-key';

  const fixture = makeEndingFixture();
  const input = {
    ...fixture,
    contractVersion: AI_CONTRACT_VERSION,
    userAction: '许宁弯腰查看角落里的防水箱',
  };

  const turnResponse = {
    actionDecision: { allowed: true },
    narrative: '许宁快步走到角落，防水箱完好无损，搭扣应声而开。',
    dialogue: [],
    statePatch: {
      locationId: 'archive',
      committedFacts: [],
      addInventory: ['防水箱'],
      removeInventory: [],
      addClues: [],
      addKnownSecrets: [],
      completeTaskIds: ['box'],
      failTaskIds: [],
    },
    nextChoices: [
      { id: 'c1', label: '许宁把桌上的三本台账装入防水箱', intent: '装箱' },
      { id: 'c2', label: '许宁向陈舟打手势示意准备搬运', intent: '协作' },
    ],
    image: { required: false, reason: 'reuse', sceneId: 'archive' },
    goalProgress: { activeTaskIds: ['pack'], completedTaskIds: ['box'], summary: '已拿到防水箱' },
    ending: { reached: false, canContinue: true },
  };

  const mockChunks = [
    JSON.stringify({ choices: [{ delta: { content: '{"actionDecision":{"allowed":true},"narrative":"许宁快步走到角落，' } }] }),
    JSON.stringify({ choices: [{ delta: { content: `防水箱完好无损，搭扣应声而开。","dialogue":[],"statePatch":${JSON.stringify(turnResponse.statePatch)},"nextChoices":${JSON.stringify(turnResponse.nextChoices)},"image":${JSON.stringify(turnResponse.image)},"goalProgress":${JSON.stringify(turnResponse.goalProgress)},"ending":${JSON.stringify(turnResponse.ending)}}` } }] }),
  ];

  globalThis.fetch = async () => {
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of mockChunks) {
          controller.enqueue(new TextEncoder().encode(`data: ${chunk}\n\n`));
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  };

  try {
    const request = new Request('http://localhost/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json',
      },
      body: JSON.stringify({ operation: 'advance-world', input }),
    });

    const response = await POST(request);
    assert.equal(response.status, 200);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseText += decoder.decode(value);
    }

    assert.ok(sseText.includes('event: chunk'));
    assert.ok(sseText.includes('许宁快步走到角落，'));
    assert.ok(sseText.includes('event: final'));
    assert.ok(sseText.includes('搭扣应声而开。'));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.YIBU_API_KEY;
    else process.env.YIBU_API_KEY = originalKey;
  }
});
