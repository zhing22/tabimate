// The screen layout (v3 Step 2): portrait puts the scene on a stage above a
// sheet; landscape puts it left of one fixed-width panel. core/layout.ts
// turns these into sizes; ui/layout/ hands them to the style sheets.

/** A window at least this wide for its height (width / height) is landscape. */
export const LANDSCAPE_FROM_ASPECT = 1;

/**
 * Landscape: the right-hand panel every screen shows in, clamp(minPx, vw, maxPx).
 * It depends only on the window, so the scene never re-scales between screens.
 */
export const PANEL = { minPx: 400, vw: 38, maxPx: 600 } as const;

/** The same width as a CSS value. */
export const PANEL_WIDTH_CSS = `clamp(${PANEL.minPx}px, ${PANEL.vw}vw, ${PANEL.maxPx}px)`;

/** Portrait: the scene stage's share of the window height, and the sheet's widest. */
export const PORTRAIT = { stageShare: 0.34, sheetMaxPx: 640 } as const;

/**
 * The phone keyboard (portrait): the prompt card is translated up by the
 * keyboard's height (ui/viewport.ts --kb-inset), never re-laid out. A scored
 * answer or time-up blurs the box so the keyboard closes; the next prompt waits
 * for a tap, and its timer starts on that first focus or after
 * ROUND_START_GRACE_MS (config/game.ts).
 */
export const KEYBOARD = {
  /**
   * The share of a portrait window an on-screen keyboard takes, at most, on the
   * phones we size for (iOS 844 px: 336; Android 640 px: 260). The prompt card
   * is never taller than what that leaves, so the keyboard only moves it.
   */
  expectedShare: 0.41,
  /** The card follows the keyboard over this long (none with reduced motion). */
  cardRiseMs: 200,
} as const;
