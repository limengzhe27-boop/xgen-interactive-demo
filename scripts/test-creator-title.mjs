import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCreatorProposal } from '../lib/creator-normalization.ts';

test('generated work titles omit trailing provisional labels', () => {
  for (const title of ['机器猫大战奥特曼（暂定）', '机器猫大战奥特曼 (暂定)', '机器猫大战奥特曼（ 暂定 ） ']) {
    const input = { title };
    assert.equal(normalizeCreatorProposal(input).proposal.title, '机器猫大战奥特曼');
    assert.equal(input.title, title);
  }
});
test('meaningful parentheses and omitted titles remain unchanged', () => {
  for (const title of ['读书会（周末篇）', '暂定人生', '（暂定）之后的故事']) {
    assert.equal(normalizeCreatorProposal({ title }).proposal.title, title);
  }
  assert.equal('title' in normalizeCreatorProposal({}).proposal, false);
});
