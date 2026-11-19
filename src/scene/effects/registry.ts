import type { EffectId } from '@/config/levels';
import { glint } from './glint';
import { shiny } from './shiny';
import { sparkle } from './sparkle';
import type { Effect } from './types';

/** Levels 0-1: nothing to see, by design. */
const none: Effect = () => () => {};

/**
 * Keyed by LEVELS[].effectId (config/levels.ts), so which level gets which effect
 * is decided there. The type makes a missing effect a compile error.
 */
export const EFFECTS: Readonly<Record<EffectId, Effect>> = { none, glint, sparkle, shiny };
