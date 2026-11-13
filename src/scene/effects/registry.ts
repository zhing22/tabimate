import type { EffectId } from '@/config/tiers';
import { glint } from './glint';
import { shiny } from './shiny';
import { sparkle } from './sparkle';
import type { Effect } from './types';

/** Tiers 0-1: nothing to see, by design. */
const none: Effect = () => () => {};

/**
 * Keyed by TIERS[].effectId (config/tiers.ts), so which tier gets which effect
 * is decided there. The type makes a missing effect a compile error.
 */
export const EFFECTS: Readonly<Record<EffectId, Effect>> = { none, glint, sparkle, shiny };
