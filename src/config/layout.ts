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
 * The phone keyboard (portrait): after an answer is scored the input is blurred
 * so the keyboard closes; the next prompt waits for a tap, and its timer starts
 * on that first focus or after ROUND_START_GRACE_MS (config/game.ts).
 */
export const KEYBOARD = {
  /** The stage slides away and back over this long (none with reduced motion). */
  stageSlideMs: 240,
} as const;
