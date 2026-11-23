// Every primate look, a registry by archetype: a look's stance, size, tail
// and the marks that make the species special. Species sharing a look differ
// by palette (palettes.json).
import { APE_LOOKS } from './apeLooks.ts';
import { MONKEY_LOOKS } from './monkeyLooks.ts';

export type { PrimateLook } from './primateMarks.ts';

export const PRIMATE_LOOKS = { ...APE_LOOKS, ...MONKEY_LOOKS };
