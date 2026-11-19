// Weekday themes. A theme follows the puzzle key's date, not the clock (the
// 00:00-11:59 SGT half of Saturday still plays Friday's puzzle, so still Fishy
// Friday). Weekdays without an entry are plain: default rules, no title.
// Add a theme by adding an entry.

/** 0 = Sunday ... 6 = Saturday, as Date.getUTCDay() counts them. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ThemeDef {
  readonly id: string;
  /** Shown on the start and loading screens and in the share text. */
  readonly name: string;
  /** One line under the name on the start screen. */
  readonly tagline: string;
  readonly weekday: Weekday;
  /** How many CR answers a prompt may have (at least one is always needed). */
  readonly maxCR: number;
  /** The day ends with a bonus quiz whose multiplier applies to the day total (planned). */
  readonly bonusQuiz: boolean;
}

export const THEMES: readonly ThemeDef[] = [
  {
    id: 'myth-busting',
    name: 'Myth-busting Monday',
    tagline: 'Not what you think: prompts that turn animal myths around.',
    weekday: 1,
    maxCR: 1,
    bonusQuiz: false,
  },
  {
    id: 'fishy-friday',
    name: 'Fishy Friday',
    tagline: 'Something smells fishy: a day for water animals.',
    weekday: 5,
    maxCR: 1,
    bonusQuiz: false,
  },
  {
    id: 'deep-dive',
    name: 'Sunday Deep Dive',
    tagline: 'Harder prompts, and up to three rarest answers on each.',
    weekday: 0,
    maxCR: 3,
    bonusQuiz: true,
  },
];

/** Default CR answers per prompt when a day has no theme or the theme doesn't say. */
export const DEFAULT_MAX_CR = 1;

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** The weekday of a puzzle key (YYYY-MM-DD), independent of the viewer's time zone. */
export const weekdayOf = (key: string): Weekday =>
  new Date(`${key}T00:00:00Z`).getUTCDay() as Weekday;

/** The theme for a puzzle key's weekday, if there is one. */
export const themeFor = (key: string, themes: readonly ThemeDef[] = THEMES): ThemeDef | null =>
  themes.find((t) => t.weekday === weekdayOf(key)) ?? null;

/** CR answers a prompt on this day may have. */
export const maxCRFor = (key: string, themes: readonly ThemeDef[] = THEMES): number =>
  themeFor(key, themes)?.maxCR ?? DEFAULT_MAX_CR;
