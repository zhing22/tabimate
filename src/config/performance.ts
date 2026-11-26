// Performance budgets (v3 decisions in CLAUDE.md), checked by npm run build
// and npm run check (scripts/check-bundle.ts), in gzipped KB.

export const BUNDLE_BUDGET = {
  /** The entry chunk: the JavaScript index.html runs first. */
  entryKb: 60,
  /**
   * All JavaScript a first visit runs before the start screen: the entry,
   * what it imports, and the chunks it imports at once (eagerChunks).
   */
  initialKb: 140,
  /**
   * Loaded with import() but at once, as the loading screen shows (the live
   * scene: main.ts preloadScene; the still): they count as initial.
   */
  eagerChunks: ['src/wiring/sceneParts.ts', 'src/wiring/stillParts.ts'],
  /** The loading kit's PNG (config/loadingKit.ts), inlined into index.html: not gzipped, KB. */
  loadingKitKb: 4,
} as const;
