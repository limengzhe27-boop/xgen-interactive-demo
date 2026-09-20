import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { playableCharacters } from '../lib/character-entry.ts';
import { publicationWorld } from '../lib/publication.ts';
import { studioWorlds } from '../lib/studio-worlds.ts';
import { preserveCreatorDetails } from '../lib/creator-framework.ts';

import { fileURLToPath } from 'node:url';

test('world intro page data strips creation parameters and separates playable vs NPC roles', () => {
  const introSource = readFileSync(new URL('../components/world-intro-page.tsx', import.meta.url), 'utf8');
  // No surpriseLevel or complexityLabel in WorldIntroData or display
  assert.ok(!introSource.includes('surpriseLevel'));
  assert.ok(!introSource.includes('complexityLabel'));
  assert.ok(!introSource.includes('意外度'));
  assert.ok(!introSource.includes('架构复杂度'));
  assert.ok(!introSource.includes('推荐首选'));

  // Separate playable and npc roles
  assert.ok(introSource.includes('role.playable !== false && (!data.fixedRoleId || role.id === data.fixedRoleId)'));
  assert.ok(introSource.includes('!playableRoles.some(playable => playable.id === role.id)'));
  assert.ok(introSource.includes('你会遇见的人物'));
  // NPC role is not a play button
  assert.ok(!introSource.includes('世界出场人物 · NPC'));
  assert.ok(introSource.includes('playable && <button'));

  // Clean light/emerald styling
  const css = readFileSync(new URL('../components/world-intro-page.module.css', import.meta.url), 'utf8');
  assert.ok(css.includes('var(--color-primary)'));
  assert.match(css, /\.cover\s*\{[^}]*height: auto;[^}]*object-fit: contain;/);
  assert.ok(!introSource.includes('showcase-hero-overlay'));
  assert.ok(!introSource.includes('coverDialog'));
  assert.ok(!introSource.includes('查看大图'));
  assert.ok(introSource.includes('<div className={styles.coverFrame}>'));
  assert.ok(introSource.includes('src={single.image}'));
  assert.ok(introSource.includes('single.identity && <p>{single.identity}</p>'));
  assert.ok(introSource.includes('保存于'));
  assert.ok(introSource.includes('选择角色'));
  assert.ok(css.includes('@media (max-width: 760px)'));
});

test('creator showcase preview modal aligns with public presentation standards', () => {
  const dialogSource = readFileSync(new URL('../components/creator-dialogs.tsx', import.meta.url), 'utf8');
  // Removed surpriseLevel and complexity badges
  assert.ok(!dialogSource.includes('意外度'));
  assert.ok(!dialogSource.includes('架构复杂度'));
  // Separates playable and NPC roles
  assert.ok(dialogSource.includes('role.playable !== false'));
  assert.ok(dialogSource.includes('role.playable === false'));
  assert.ok(dialogSource.includes('你会遇见的人物'));
});

test('creator framework preserves character playable flag across edits', () => {
  const baseWorld = publicationWorld(studioWorlds[0].world);
  baseWorld.characters[0].playable = true;
  baseWorld.characters[1].playable = false;

  const edited = {
    ...baseWorld,
    characters: baseWorld.characters.map((c) => ({ ...c })),
  };

  const before = {
    roles: [
      { name: baseWorld.characters[0].name, identity: baseWorld.characters[0].identity, personality: 'A', appearance: 'A', relationship: 'A', playable: true },
      { name: baseWorld.characters[1].name, identity: baseWorld.characters[1].identity, personality: 'B', appearance: 'B', relationship: 'B', playable: false },
    ],
    outline: [],
  };

  const after = {
    roles: [
      { name: baseWorld.characters[0].name, identity: baseWorld.characters[0].identity, personality: 'A', appearance: 'A', relationship: 'A', playable: false },
      { name: baseWorld.characters[1].name, identity: baseWorld.characters[1].identity, personality: 'B', appearance: 'B', relationship: 'B', playable: true },
    ],
    outline: [],
  };

  const preserved = preserveCreatorDetails(baseWorld, edited, before, after);
  assert.equal(preserved.characters[0].playable, false);
  assert.equal(preserved.characters[1].playable, true);
});

test('video explorer respects initialRoleId and isolates fresh run from existing session', () => {
  const videoSource = readFileSync(new URL('../components/video-explorer.tsx', import.meta.url), 'utf8');

  // Unified initial role handling
  assert.ok(videoSource.includes('const targetRole=initialRoleId?roles.find(r=>r.id===initialRoleId):undefined;'));
  assert.ok(videoSource.includes('const targetRole = initialRoleId ? roles.find(r => r.id === initialRoleId) : undefined;'));

  // Fresh run archives candidate session instead of blindly overwriting
  assert.ok(videoSource.includes('sessionStorage.setItem(`${currentKey}:archive:${candidate.id}`'));

  // Role mismatch does not override requested initialRoleId
  assert.ok(videoSource.includes('initialRoleId && candidate && candidate.roleId !== initialRoleId'));

  // Dependencies include initialRoleId
  assert.ok(videoSource.includes('latestEntry.id,latestEntry.world.characters,startFresh,resumeSessionId,initialRoleId'));
});

test('page.tsx provides clear perspective permission in creator people panel and defaults to true', () => {
  const pageSource = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

  // DraftRole and Role include playable?: boolean
  assert.ok(pageSource.includes('playable?: boolean;'));

  // addDraftRole defaults to playable: true
  assert.ok(pageSource.includes("playable: true"));

  // Radio selector for perspective in peoplePanel
  assert.ok(pageSource.includes('开放玩家体验视角（默认）'));
  assert.ok(pageSource.includes('仅作为世界出场人物（NPC）'));

  // Role chip indicates NPC
  assert.ok(pageSource.includes('role-chip-npc-badge'));
  assert.ok(pageSource.includes('NPC'));

  // buildWorldIntro passes through playable flag
  assert.ok(pageSource.includes('playable: isPlayable && char.playable !== false,'));
  assert.ok(pageSource.includes('playable: draftRoles[idx]?.playable !== false,'));
});
