export type ComposerScroll = { y: number; travel: number; hidden: boolean };

// Accumulate deliberate movement, ignoring tiny direction changes and overscroll.
export function advanceComposerScroll(state: ComposerScroll, position: number, focused = false): ComposerScroll {
  const y = Math.max(0, position);
  const delta = y - state.y;
  if (focused || y <= 24) return { y, travel: 0, hidden: false };
  if (Math.abs(delta) < 2) return { ...state, y };
  const travel = Math.sign(delta) === Math.sign(state.travel) ? state.travel + delta : delta;
  if (Math.abs(travel) >= 16) return { y, travel: 0, hidden: travel > 0 };
  return { ...state, y, travel };
}
