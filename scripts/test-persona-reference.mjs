import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { referenceQuery, publicReferenceUrl, groundedReferenceProposal, mergeReference, readPersonaReference, readReferenceSuggestion } from '../lib/persona-reference.ts';
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
test('live-reference service uses only fixed hosts, skips empty docs, and sends no profile to the company model', async () => {
  const originalFetch = globalThis.fetch, oldKey = process.env.YIBU_API_KEY; process.env.YIBU_API_KEY = 'test-placeholder';
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('list=search')) return Response.json({ query: { search: [{ pageid: 999123, title: '测试人物', snippet: '<b>公开角色</b>' }] } });
    if (String(url).includes('pageids=')) return Response.json({ query: { pages: [{ pageid: 999123, title: '测试人物', extract: '公开资料：测试人物是九蛇船长。'.repeat(20) }] } });
    if (String(url).includes('/chat/completions')) return Response.json({ choices: [{ message: { content: JSON.stringify({ proposal, evidence: { identity: '九蛇船长' } }) } }] });
    throw Error('unexpected_url');
  };
  try {
    const found = await searchCharacterReferences('测试人物'); assert.equal(found[0].id, 'wiki:999123');
    const completed = await completeCharacterReference(found[0].id, true);
    assert.equal(completed.proposal.identity, '九蛇船长'); assert.equal(completed.proposal.abilities, '');
    assert.equal(completed.reference.url, found[0].url);
    await fetchCharacterReference(found[0].id); assert.equal(calls.filter(c => c.url.includes('pageids=')).length, 1);
    assert.equal(calls[0].init.headers.Authorization, undefined);
    const input = JSON.parse(calls.find(c => c.url.includes('/chat/completions')).init.body);
    assert.equal(input.stream, false); assert.ok(!JSON.stringify(input).includes(draft.identity));
    assert.ok(!JSON.stringify(input).includes('portraitUrl'));
    await assert.rejects(fetchCharacterReference('https://internal.test'), /invalid_reference/);
  } finally { globalThis.fetch = originalFetch; if (oldKey === undefined) delete process.env.YIBU_API_KEY; else process.env.YIBU_API_KEY = oldKey; }
});
test('HTML reference strips executable and navigation material instead of rendering HTML', () => {
  assert.equal(plainReferenceText('<script>steal()</script><nav>menu</nav><p>名字 &amp; 性格</p>'), '名字 & 性格');
});
test('endpoint requires same-origin, verified account, bounded body and rate limiting; UI keeps save explicit', () => {
  const route = readFileSync(new URL('../app/api/persona-reference/route.ts', import.meta.url), 'utf8');
  assert.ok(route.includes('sameOrigin(request)')); assert.ok(route.includes('if (!account.id)')); assert.ok(route.includes('reference_rate_limited'));
  assert.ok(!route.includes('body.draft')); assert.ok(!route.includes('body.url'));
  const ui = readFileSync(new URL('../components/persona-reference.tsx', import.meta.url), 'utf8');
  assert.ok(ui.includes('补入空白字段')); assert.ok(ui.includes('采用以上设定')); assert.ok(ui.includes('controller.current?.abort()'));
  assert.ok(!ui.includes('/api/media')); assert.ok(!ui.includes('/api/image')); assert.ok(!ui.includes('localStorage'));
});
