// Tuning for the level effects (scene/effects/). One entry per effect id in
// config/tiers.ts. Distances are native pixels, speeds px/s, times seconds.
import type { HexColour } from './colour';
import type { EffectId } from './tiers';

/** A range to pick from at random: [min, max]. */
export type Range = readonly [min: number, max: number];

/** The halo the renderer draws behind a follower whose effect asks for one. */
export const GLOW = {
  colour: '#fbf236' as HexColour,
  /** Radius as a share of the sprite's height. */
  radius: 0.65,
  /** Opacity at full glow (an effect's glow of 1). */
  opacity: 0.35,
} as const;

export const EFFECT_SETTINGS = {
  none: {},
  glint: {
    /** The star that flashes as the animal joins: how long, and its arms' length. */
    flashS: 0.45,
    flashArm: 3,
    /** A smaller twinkle every so often afterwards. */
    twinkleS: 0.35,
    idleEveryS: [3, 6] as Range,
  },
  sparkle: {
    colours: ['#ffffff', '#b55088', '#f6757a'] as readonly HexColour[],
    pool: 24,
    burst: 14,
    gravity: 70,
    burstSpeed: [25, 55] as Range,
    burstLifeS: [0.6, 1] as Range,
    /** Afterwards, one spark drifting up every so often. */
    idleEveryS: [1.5, 3] as Range,
    driftSpeed: 12,
    driftLifeS: 1,
    twinkleS: 0.5,
    /** Reduced motion: the burst becomes a glow that fades at this rate per second. */
    glowFadePerS: 1.5,
  },
  shiny: {
    // The first colour is the glow's, so sparks and halo match.
    colours: [GLOW.colour, '#ffffff', '#feae34'] as readonly HexColour[],
    pool: 48,
    burst: 28,
    gravity: 55,
    burstSpeed: [30, 75] as Range,
    /** Extra upward push on the burst, so it fountains rather than falls. */
    burstLift: 20,
    burstLifeS: [0.7, 1.3] as Range,
    shakePx: 2,
    shakeMs: 260,
    /** The halo's resting strength, how far it pulses, and how fast. */
    glow: 0.5,
    glowPulse: 0.15,
    glowPulsePerS: 3,
    /** The extra entrance glow fades at this rate per second. */
    entranceFadePerS: 0.8,
    idleEveryS: [0.8, 1.6] as Range,
    driftSpeed: 14,
    driftLifeS: 0.9,
    twinkleS: 0.5,
  },
} as const satisfies Record<EffectId, object>;
