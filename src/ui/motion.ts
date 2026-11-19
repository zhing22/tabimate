// Reduced motion for script-driven animation (CSS uses its own media query).
// jsdom and very old browsers have no matchMedia: treat them as full motion.
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
