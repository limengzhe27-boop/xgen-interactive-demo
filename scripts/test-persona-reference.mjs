import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appendReferenceNotes, groundedReferenceNotes, readReferenceReview, referenceDraft, referenceQuery, publicReferenceUrl, groundedReferenceProposal, mergeReference, readPersonaReference, readReferenceSuggestion } from '../lib/persona-reference.ts';
import { restorePlayerPersona } from '../lib/player-persona.ts';
import { readPersonaDesignInput } from '../lib/persona-design.ts';
import { searchCharacterReferences, fetchCharacterReference, completeCharacterReference, plainReferenceText } from '../lib/persona-reference-server.ts';

const draft = { name: '我的女帝', identity: '我自己设定的背景', personality: '', appearance: '保留我的蓝色短发', abilities: '' };
const proposal = { name: '波雅·汉库克', identity: '九蛇船长', personality: '骄傲', appearance: '黑色长发', abilities: '石化能力；不是无限生效' };
const reference = { title: '参考资料', url: 'https://one-piece.com/news/o20200902_11463/index.html', retrievedAt: 1788920000000, fields: ['abilities'] };
test('public queries reject private-contact formats and provenance URLs are strictly bounded', () => {
  assert.equal(referenceQuery(' 海贼女帝 '), '海贼女帝');
  for (const q of ['', 'a'.repeat(81), 'a@b.com', 'https://private.test', '13812345678', '名字\n聊天内容', {}]) assert.equal(referenceQuery(q), null);
  for (const url of ['http://zh.wikipedia.org/w/index.php?curid=1', 'https://zh.wikipedia.org.evil.test/w/index.php?curid=1', 'https://user:pass@zh.wikipedia.org/w/index.php?curid=1', 'https://one-piece.com/redirect?to=evil', 'javascript:alert(1)']) assert.equal(publicReferenceUrl(url), false);
  assert.equal(publicReferenceUrl('https://zh.wikipedia.org/w/index.php?curid=11200'), true);
  assert.equal(readPersonaReference({ ...reference, fields: ['permissions'] }), undefined);
});
test('default merge only fills chosen blanks and explicit overwrite does not add permissions or images', () => {
  const blanks = Object.keys(draft).filter(k => !draft[k]);
  assert.deepEqual(mergeReference(draft, { ...proposal, grantedAbilities: ['unlimited'], portraitUrl: 'bad' }, blanks), { ...draft, personality: proposal.personality, abilities: proposal.abilities });
  assert.deepEqual(mergeReference(draft, proposal, Object.keys(draft)), proposal);
  assert.equal(mergeReference(draft, { ...proposal, identity: '' }, ['identity']).identity, draft.identity);
});
test('evidence must occur in fetched text; ungrounded abilities stay blank', () => {
  const result = groundedReferenceProposal({ proposal, evidence: { name: '汉库克', identity: '九蛇船长', personality: '不存在', appearance: '', abilities: '伪造证据' } }, '汉库克是九蛇船长。');
  assert.equal(result.identity, '九蛇船长'); assert.equal(result.abilities, ''); assert.equal(result.personality, '');
  assert.equal(groundedReferenceProposal({ proposal, evidence: { name: '汉库克' } }, '汉库克'), null);
  assert.equal(readReferenceSuggestion({ proposal, reference, warning: '核对后保存' }).reference.url, reference.url);
});
test('source metadata survives own-account restore but is excluded from design model input', () => {
  const persona = { ...draft, version: 1, ownerId: 'test', updatedAt: 1, reference: { ...reference, secret: 'never' } };
  assert.deepEqual(restorePlayerPersona(persona, 'test').reference, reference);
  assert.equal(restorePlayerPersona(persona, 'other'), null);
  const input = readPersonaDesignInput({ contractVersion: 'test', message: '聊聊', draft: persona, conversation: [] });
  assert.equal(input.draft.reference, undefined);
  assert.equal(restorePlayerPersona({ ...persona, reference: { ...reference, url: 'https://tracking.test' } }, 'test').reference, undefined);
});
test('reference service sends only fictional fields to the company model; public search gets only the name', async () => {
  const originalFetch = globalThis.fetch, oldKey = process.env.YIBU_API_KEY; process.env.YIBU_API_KEY = 'test-placeholder';
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('list=search')) return Response.json({ query: { search: [{ pageid: 999123, title: '测试人物', snippet: '<b>公开角色</b>' }] } });
    if (String(url).includes('pageids=')) return Response.json({ query: { pages: [{ pageid: 999123, title: '测试人物', extract: '公开资料：测试人物是九蛇船长。'.repeat(20) }] } });
    if (String(url).includes('/chat/completions')) return Response.json({ choices: [{ message: { content: JSON.stringify({ notes: [{ field: 'identity', kind: 'addition', text: '九蛇船长', reason: '补充职业', evidence: '九蛇船长' }, { field: 'abilities', kind: 'addition', text: '无限力量', reason: '假依据', evidence: '并不存在' }] }) } }] });
    throw Error('unexpected_url');
  };
  try {
    const found = await searchCharacterReferences('测试人物'); assert.equal(found[0].id, 'wiki:999123');
    const completed = await completeCharacterReference(found[0].id, true, { ...draft, portraitUrl: 'private-image-marker', realProfile: 'private-real-marker', conversation: ['private-chat-marker'] });
    assert.equal(completed.notes[0].text, '九蛇船长'); assert.equal(completed.notes.length, 1); assert.equal(completed.rejectedCount, 1);
    assert.equal(completed.reference.url, found[0].url);
    await fetchCharacterReference(found[0].id); assert.equal(calls.filter(c => c.url.includes('pageids=')).length, 1);
    assert.equal(calls[0].init.headers.Authorization, undefined);
    const input = JSON.parse(calls.find(c => c.url.includes('/chat/completions')).init.body);
    assert.equal(input.stream, false); assert.deepEqual(JSON.parse(input.messages.at(-1).content).fictionalDraft, draft);
    assert.deepEqual(JSON.parse(input.messages.at(-1).content).emptyFields, ['personality', 'abilities']);
    for (const marker of ['private-image-marker', 'private-real-marker', 'private-chat-marker']) assert.ok(!JSON.stringify(input).includes(marker));
    assert.ok(!calls[0].url.includes(draft.identity));
    await assert.rejects(fetchCharacterReference('https://internal.test'), /invalid_reference/);
  } finally { globalThis.fetch = originalFetch; if (oldKey === undefined) delete process.env.YIBU_API_KEY; else process.env.YIBU_API_KEY = oldKey; }
});
test('HTML reference strips executable and navigation material instead of rendering HTML', () => {
  assert.equal(plainReferenceText('<script>steal()</script><nav>menu</nav><p>名字 &amp; 性格</p>'), '名字 & 性格');
});
test('endpoint requires same-origin, verified account, bounded body and rate limiting; UI keeps save explicit', () => {
  const route = readFileSync(new URL('../app/api/persona-reference/route.ts', import.meta.url), 'utf8');
  assert.ok(route.includes('sameOrigin(request)')); assert.ok(route.includes('if (!account.id)')); assert.ok(route.includes('reference_rate_limited'));
  assert.ok(route.includes('referenceDraft(body.draft)')); assert.ok(!route.includes('body.url'));
  const ui = readFileSync(new URL('../components/persona-reference.tsx', import.meta.url), 'utf8');
  assert.ok(ui.includes('将选中补充加入设定')); assert.ok(!ui.includes('同时替换')); assert.ok(ui.includes('controller.current?.abort()'));
  assert.ok(ui.includes('referenceDraft(draft)')); assert.ok(ui.includes('stale || !merged')); assert.ok(ui.includes('当前五项虚构文字设定'));
  assert.ok(!ui.includes('referenceFields.map'));
  assert.ok(!ui.includes('/api/media')); assert.ok(!ui.includes('/api/image')); assert.ok(!ui.includes('localStorage'));
});

const addition = { field: 'abilities', kind: 'addition', text: '拥有三种霸气', reason: '补充能力种类', evidence: '三种霸气' };
test('append preserves exact existing text; conflicts and custom names never overwrite; repeat apply is idempotent', () => {
  const original = { ...draft, abilities: '  我的能力限制，原文保留。\n另一行。' };
  const notes = [addition, { ...addition, field: 'appearance', kind: 'conflict', text: '黑色长发' }, { ...addition, field: 'name', text: '波雅·汉库克' }];
  const result = appendReferenceNotes(original, notes);
  assert.equal(result.abilities, original.abilities + '\n拥有三种霸气'); assert.equal(result.appearance, draft.appearance); assert.equal(result.name, draft.name);
  assert.deepEqual(appendReferenceNotes(result, notes), result); assert.equal(original.abilities, '  我的能力限制，原文保留。\n另一行。');
});
test('append capacity is atomic and never truncates original or an earlier field', () => {
  assert.equal(appendReferenceNotes({ ...draft, abilities: 'a'.repeat(997) }, [{ ...addition, field: 'personality' }, addition]), null);
  assert.equal(appendReferenceNotes({ ...draft, name: '' }, [{ ...addition, field: 'name', text: 'a'.repeat(41) }]), null);
  assert.deepEqual(appendReferenceNotes(draft, [{ ...addition, text: ' ' }]), draft);
});
test('review requires per-item grounding and permits honest empty results, not made-up completeness', () => {
  assert.deepEqual(groundedReferenceNotes({ notes: [] }, '公开资料', draft), { notes: [], rejectedCount: 0 });
  assert.equal(groundedReferenceNotes({ notes: [addition] }, '只有身份', draft).rejectedCount, 1);
  assert.equal(groundedReferenceNotes({ notes: [addition, addition] }, '三种霸气', draft).notes.length, 1);
  assert.equal(groundedReferenceNotes({ notes: [addition] }, '三种霸气', { ...draft, abilities: '拥有三种霸气' }).notes.length, 0);
  assert.equal(readReferenceReview({ notes: [{ ...addition, kind: 'replace' }], reference, rejectedCount: 0 }), null);
  assert.equal(readReferenceReview({ notes: [{ ...addition, field: 'permissions' }], reference, rejectedCount: 0 }), null);
  assert.equal(readReferenceReview({ notes: Array(7).fill(addition), reference, rejectedCount: 0 }), null);
  assert.equal(groundedReferenceNotes({ error: 'reference_insufficient' }, '资料', draft), null);
});
test('draft validation limits and strips private fields before review', () => {
  assert.deepEqual(referenceDraft({ ...draft, ownerId: 'secret', portraitUrl: 'private', userProfile: {} }), draft);
  assert.equal(referenceDraft({ ...draft, abilities: 'a'.repeat(1001) }), null);
  assert.equal(referenceDraft({ ...draft, identity: 1 }), null);
});
