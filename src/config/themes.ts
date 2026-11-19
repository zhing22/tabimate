// Weekday themes (v2 Step 5 fills this registry). A theme follows the puzzle
// key's date, not the clock. Until a weekday has a theme, its puzzles use the
// default rules: exactly one CR answer per prompt.

/** 0 = Sunday ... 6 = Saturday, as Date.getUTCDay() counts them. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ThemeDef {
  readonly id: string;
  readonly name: string;
  readonly weekday: Weekday;
  /** How many CR answers a prompt may have; unset means exactly one. */
  readonly maxCR?: number;
}

export const THEMES: readonly ThemeDef[] = [];

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
