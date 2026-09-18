// Pure rendering contracts; no live-model or paid-media requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
registerHooks({ load(url, context, next) {
  if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: 'export default {};' };
  if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText };
  return next(url, context);
} });
const { CreatorWorkspace, creatorWorkspaceModules } = await import('../components/creator-workspace.tsx');
for (const { id } of creatorWorkspaceModules) test(`workspace ${id}: four mounted panels, exactly one visible, no navigation side effects`, () => {
  let calls = 0;
  const panels = Object.fromEntries(creatorWorkspaceModules.map(({ id }) => [id, React.createElement('input', { defaultValue: id })]));
  const html = renderToStaticMarkup(React.createElement(CreatorWorkspace, { title: '验收作品', active: id, panels, onSelect: () => calls++ }));
  assert.equal((html.match(/<section /g) || []).length, 4);
  assert.equal((html.match(/hidden=""/g) || []).length, 3);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.equal((html.match(/<input /g) || []).length, 4);
  assert.match(html, new RegExp(`id="workspace-${id}"[^>]*>`));
  assert.equal(calls, 0);
});
test('shell contains no generation, publication, local draft copy or reply-driven navigation', () => {
  const source = readFileSync(new URL('../components/creator-workspace.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\(|useEffect\(|useState\(|localStorage/);
  assert.match(source, /hidden=\{active !== id\}/);
});
