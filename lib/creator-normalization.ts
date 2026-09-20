import { validDiscoveryGenre, discoveryCategory } from './discovery-category.ts';

// Representation fixes only. Do not infer plot facts, task intent or role identity.
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const asciiId = (v: string) => /^[a-zA-Z0-9_-]+$/.test(v);

export function normalizeCreatorGraphIds(value: unknown, reservedIds: string[] = []): unknown {
  if (!record(value) || !Array.isArray(value.nodes) || value.nodes.length > 16) return value;
  const nodes = value.nodes;
  const ids = nodes.map(n => record(n) ? n.id : undefined);
  // Duplicate identifiers and missing identifiers are ambiguous, not formatting mistakes.
  if (!ids.every((x): x is string => typeof x === 'string' && !!x.trim() && x.length <= 100)
    || new Set(ids).size !== ids.length) return value;
  // Reserve dangling references too: renaming must not accidentally make a bad edge valid.
  const references: unknown[] = [value.startNodeId];
  for (const n of nodes) if (record(n) && Array.isArray(n.nextNodeIds)) references.push(...n.nextNodeIds);
  if (Array.isArray(value.entries)) for (const e of value.entries) if (record(e)) {
    references.push(e.nodeId);
    if (Array.isArray(e.defaultPath)) references.push(...e.defaultPath);
  }
  const used = new Set([...reservedIds, ...ids.filter(asciiId), ...references.filter((x): x is string => typeof x === 'string' && asciiId(x))]);
  const mapping = new Map<string, string>();
  let serial = 1;
  for (const old of ids) {
    if (asciiId(old)) continue;
    while (used.has(`node-${serial}`)) serial++;
    const next = `node-${serial++}`;
    used.add(next); mapping.set(old, next);
  }
  const ref = (v: unknown) => typeof v === 'string' ? mapping.get(v) ?? v : v;
  const refs = (v: unknown) => Array.isArray(v) ? v.map(ref) : v;
  return { ...value, startNodeId: ref(value.startNodeId),
    nodes: nodes.map(n => record(n) ? { ...n, id: ref(n.id), nextNodeIds: refs(n.nextNodeIds) } : n),
    entries: Array.isArray(value.entries) ? value.entries.map(e => record(e)
      ? { ...e, nodeId: ref(e.nodeId), defaultPath: refs(e.defaultPath) } : e) : value.entries };
}


export function normalizeCreatorProposal(value: Record<string, unknown>, reservedIds: string[] = []) {
  const p = { ...value };
  const notices: string[] = [];
  const level = (v: unknown) => typeof v === 'string' && /^[1-4]$/.test(v.trim()) ? Number(v.trim()) : v;
  if (p.surpriseLevel !== undefined) p.surpriseLevel = level(p.surpriseLevel);
  if (Array.isArray(p.characters)) p.characters = p.characters.map(role => {
    if (!record(role)) return role;
    const r = { ...role };
    if (r.persona === undefined && typeof r.personality === 'string') r.persona = r.personality;
    delete r.personality;
    if (r.identity === undefined && typeof r.role === 'string') r.identity = r.role;
    delete r.role;
    if (typeof r.name === 'string') {
      if (r.identity === undefined) r.identity = '';
      if (r.persona === undefined) r.persona = '';
      if (r.relationship === undefined) r.relationship = '';
      if (r.appearance === undefined && typeof r.look === 'string') r.appearance = r.look;
      if (r.appearance === undefined && typeof r.visual === 'string') r.appearance = r.visual;
      delete r.look;
      delete r.visual;
      if (r.appearance === undefined) r.appearance = '';
    }
    if (r.goal !== undefined && typeof r.goal !== 'string') r.goal = String(r.goal);
    if (typeof r.cardHook === 'string') {
      const clean = r.cardHook.replace(/[\r\n]+/g, ' ').trim();
      if (clean.length > 60) notices.push('卡片短句已整理到展示长度，请采纳前确认。');
      r.cardHook = clean.slice(0, 60);
    } else if (r.cardHook !== undefined) {
      delete r.cardHook;
    }
    return r;
  });
  if (record(p.brief)) {
    const b = { ...p.brief };
    if (b.complexityLevel !== undefined) b.complexityLevel = level(b.complexityLevel);
    if (b.discoveryGenre !== undefined && typeof b.discoveryGenre === 'string') {
      if (!validDiscoveryGenre(b.discoveryGenre)) {
        const mapped = discoveryCategory({ genre: b.discoveryGenre });
        if (validDiscoveryGenre(mapped)) {
          b.discoveryGenre = mapped;
        } else {
          b.discoveryGenre = '';
        }
      }
    }
    if (Array.isArray(b.tasks)) b.tasks = b.tasks.map(task => {
      if (!record(task)) return task;
      const t = { ...task };
      if (t.kind === '主线') t.kind = 'main';
      else if (t.kind === '支线') t.kind = 'side';
      if (!Array.isArray(t.prerequisiteTaskIds)) t.prerequisiteTaskIds = [];
      if (t.description === undefined) t.description = '';
      if (t.difficulty === undefined) t.difficulty = '';
      if (t.successCondition === undefined) t.successCondition = '';
      return t;
    });
    if (b.storyGraph !== undefined) b.storyGraph = normalizeCreatorGraphIds(b.storyGraph, reservedIds);
    p.brief = b;
  }
  return { proposal: p, notices: [...new Set(notices)] };
}
