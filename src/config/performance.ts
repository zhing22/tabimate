// Performance budgets (v3 decisions in CLAUDE.md), checked by npm run build
// (scripts/check-bundle.ts).

/**
 * The first JavaScript a visitor downloads: the entry script and everything
 * it preloads, gzipped, in KB. The build fails above ceilingKb (a ratchet:
 * lower it as the bundle shrinks, never raise it to let one grow) and warns
 * above targetKb, the v3 goal. The scene engine (Kaplay) alone is about
 * 69 KB, so meeting the target needs the scene loaded lazily.
 */
export const BUNDLE_BUDGET = {
  targetKb: 60,
  ceilingKb: 116,
} as const;
