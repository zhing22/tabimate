// What npm run audit:screens captures: the window sizes, the states, and the
// date it plays (a fixed day, so every run shows the same puzzle).

export interface AuditSize {
  readonly width: number;
  readonly height: number;
  /** Device pixels per CSS pixel: the scene snaps its scale to these. */
  readonly dpr: number;
  /** A phone or tablet: touch, and an on-screen keyboard. */
  readonly touch: boolean;
  /** CSS px the on-screen keyboard takes from the bottom (touch sizes only). */
  readonly keyboardPx?: number;
}

export const AUDIT_SIZES: readonly AuditSize[] = [
  { width: 360, height: 640, dpr: 2, touch: true, keyboardPx: 260 },
  { width: 390, height: 844, dpr: 3, touch: true, keyboardPx: 336 },
  { width: 412, height: 915, dpr: 2.625, touch: true, keyboardPx: 330 },
  { width: 844, height: 390, dpr: 3, touch: true, keyboardPx: 200 },
  { width: 768, height: 1024, dpr: 2, touch: true, keyboardPx: 320 },
  { width: 1366, height: 768, dpr: 1, touch: false },
  { width: 1920, height: 1080, dpr: 1, touch: false },
  { width: 2560, height: 1080, dpr: 1, touch: false },
];

export const sizeName = (s: AuditSize) => `${s.width}x${s.height}`;

/**
 * Every state, in the order one run reaches them. prompt-keyboard is the
 * box focused with the keyboard's height taken from the window (portrait:
 * the stage collapsed).
 */
export const AUDIT_STATES = [
  'loading',
  'start',
  'prompt',
  'prompt-keyboard',
  'reveal-1',
  'reveal-2',
  'reveal-3',
  'reveal-4',
  'reveal-5',
  'results',
  'results-list',
  'journal',
  'achievements',
  'history',
  // Portrait only: the results pop-up closed, the summary under the scene.
  'results-summary',
] as const;
export type AuditState = (typeof AUDIT_STATES)[number];

export const AUDIT = {
  /** A plain weekday (no bonus quiz) with 7 prompts and every level among its answers. */
  date: '2026-11-26',
  outDir: 'art/audit',
  /** Sizes captured at once, each in its own browser context. */
  parallel: 2,
  /** After a state appears: animations land and the canvas re-lays out (RESIZE_DEBOUNCE_MS). */
  settleMs: 700,
  /** The longest any one step may take before the audit gives up on that size. */
  stepTimeoutMs: 45_000,
  /** The first load compiles the app in the dev server: slower. */
  warmUpTimeoutMs: 120_000,
  /** Flagged in report.json: body text under textPx, controls under targetPx either way (CSS px). */
  limits: { textPx: 16, targetPx: 44 },
  /** Contact sheets: each row's tiles scaled to this height, with gaps and a label strip. */
  sheet: { rowHeight: 560, gap: 24, labelHeight: 36, labelPx: 22, background: '#20242c' },
} as const;
