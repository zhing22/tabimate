// What the history screen shows, from local stats only: a month of days, each
// played one with its score band, and a finished day's team when tapped.
import type { LevelId } from '@/config/levels';
import { compareMonths, monthOf, monthWeeks, scoreBand, type Month } from '@/core/calendar';
import { biomeFor } from '@/core/journey';
import type { HistoryEntry, Stats } from '@/core/streak';
import type { Animal, AnimalLookup, DateKey } from '@/core/types';

export interface HistoryDay {
  readonly key: DateKey;
  readonly day: number;
  /** The finished run's record, or null for a day not played. */
  readonly entry: HistoryEntry | null;
  /** A missed day a streak freeze covered. */
  readonly frozen: boolean;
  readonly today: boolean;
}

export interface DayDetail {
  readonly key: DateKey;
  readonly score: number;
  readonly bandLabel: string;
  readonly biomeName: string;
  /** One per prompt; animal null for a miss, or for a day whose animals weren't kept. */
  readonly team: readonly { readonly level: LevelId; readonly animal: Animal | null }[];
  /** False for old days saved before history named the animals: levels only. */
  readonly hasAnimals: boolean;
}

/** The months the calendar can show: the first day played (or today) to today. */
export function monthRange(stats: Stats, todayKey: DateKey): { first: Month; last: Month } {
  const last = monthOf(todayKey);
  const firstKey = stats.history[0]?.key;
  const first = firstKey ? monthOf(firstKey) : last;
  return { first: compareMonths(first, last) <= 0 ? first : last, last };
}

/** A month's weeks of days (null for padding), with each day's record. */
export function historyWeeks(
  month: Month,
  stats: Stats,
  todayKey: DateKey,
): (HistoryDay | null)[][] {
  const byKey = new Map(stats.history.map((entry) => [entry.key, entry]));
  const frozen = new Set(stats.frozenKeys);
  return monthWeeks(month).map((week) =>
    week.map((key) =>
      key === null
        ? null
        : {
            key,
            day: Number(key.slice(8)),
            entry: byKey.get(key) ?? null,
            frozen: frozen.has(key),
            today: key === todayKey,
          },
    ),
  );
}

export function dayDetail(entry: HistoryEntry, animals: AnimalLookup): DayDetail {
  const ids = entry.animalIds;
  return {
    key: entry.key,
    score: entry.score,
    bandLabel: scoreBand(entry.score).label,
    biomeName: biomeFor(entry.score).name,
    team: entry.levels.map((level, i) => {
      const id = ids?.[i];
      return { level, animal: id ? (animals.get(id) ?? null) : null };
    }),
    hasAnimals: ids !== undefined,
  };
}
