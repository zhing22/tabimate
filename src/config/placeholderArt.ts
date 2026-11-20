// The code-drawn placeholder sprites (npm run art:placeholders,
// scripts/drawPlaceholderSheets.ts): frame size and timing, and how palettes
// are made from an animal's tint until real ones are designed.

export const PLACEHOLDER_ART = {
  /** Frames are square, this many px across (the big-cat sample's size). */
  size: 24,
  /** Frames per tag (walk, flap, swim). */
  framesPerTag: 4,
  frameMs: 120,
  /** The row feet stand on; the row below is left for the outline. */
  groundY: 22,
  /** Written as the sheet's meta.app: only sheets with this app are redrawn. */
  app: 'scripts/drawPlaceholderSheets.ts',
} as const;

/**
 * A palette drawn from a tint: base is the tint snapped to the master palette,
 * shadow and highlight come from deriveShades, the accent (markings) is a
 * shade darker than the shadow. The eye is dark unless that would vanish on
 * the base (contrast below eyeContrast), then light.
 */
export const DERIVED_PALETTE = {
  outline: '#181425',
  darkEye: '#181425',
  lightEye: '#ffffff',
  eyeContrast: 3,
} as const;
