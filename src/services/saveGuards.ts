// Shape checks for data read back from storage, which may be old, corrupt or
// edited by hand. Deeper consistency (does a run fit its puzzle?) is checked
// later by core's canRestore.
import { STREAK_FREEZE } from '@/config/collection';
import { isLevelId } from '@/config/levels';
import { isDateKey } from '@/core/date';
import { emptyStats, type HistoryEntry, type Stats } from '@/core/streak';
import type {
  GameMode,
  MatchResult,
  RoundResult,
  RunState,
  RunStatus,
  StrategyId,
} from '@/core/types';

type Json = Record<string, unknown>;

export const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0;
const isTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isKey = (value: unknown): value is string => typeof value === 'string' && isDateKey(value);

// `satisfies Record<Union, true>` makes the compiler fail here if a union grows.
const MODES = { daily: true } satisfies Record<GameMode, true>;
const STATUSES = { idle: true, playing: true, revealing: true, finished: true } satisfies Record<
  RunStatus,
  true
>;
const STRATEGIES = {
  exact: true,
  alias: true,
  typo: true,
  partial: true,
  loose: true,
} satisfies Record<StrategyId, true>;

const oneOf = <T extends string>(table: Record<T, true>, value: unknown): value is T =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(table, value);

function isMatch(value: unknown): value is MatchResult {
  if (!isObject(value) || typeof value.input !== 'string') return false;
  if (value.level === 0) return value.animalId === null && value.strategy === null;
  return (
    isLevelId(value.level) &&
    typeof value.animalId === 'string' &&
    oneOf(STRATEGIES, value.strategy)
  );
}

const isRoundResult = (value: unknown): value is RoundResult =>
  isObject(value) &&
  typeof value.promptId === 'string' &&
  isTime(value.timeMs) &&
  isMatch(value.match);

export const isRunState = (value: unknown): value is RunState =>
  isObject(value) &&
  oneOf(MODES, value.mode) &&
  isKey(value.puzzleDate) &&
  isCount(value.promptCount) &&
  Number(value.promptCount) >= 1 &&
  Array.isArray(value.results) &&
  value.results.every(isRoundResult) &&
  oneOf(STATUSES, value.status) &&
  (value.roundEndsAt === null || isTime(value.roundEndsAt));

const isHistoryEntry = (value: unknown): value is HistoryEntry =>
  isObject(value) &&
  isKey(value.key) &&
  isTime(value.score) &&
  Array.isArray(value.levels) &&
  value.levels.every(isLevelId) &&
  (value.animalIds === undefined || isAnimalList(value.animalIds, value.levels.length));

/** One animal id or null per prompt, as many as the day's levels. */
const isAnimalList = (value: unknown, length: number): boolean =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((id) => id === null || typeof id === 'string');

/**
 * Salvages what it can from stored stats. Each history entry stands alone
 * (a bad one is dropped, the rest kept, one entry per day). streak and
 * lastPlayedKey only mean something together, so they are kept or reset as a
 * pair; bestStreak, freezes and frozenKeys each stand alone. `lossy` says
 * whether anything was dropped.
 */
export function readStats(value: unknown): { stats: Stats; lossy: boolean } {
  if (value === undefined) return { stats: emptyStats(), lossy: false };
  if (!isObject(value)) return { stats: emptyStats(), lossy: true };
  let lossy = false;

  const rawHistory = Array.isArray(value.history) ? value.history : [];
  if (!Array.isArray(value.history)) lossy = true;
  const byKey = new Map<string, HistoryEntry>();
  for (const entry of rawHistory) {
    if (isHistoryEntry(entry) && !byKey.has(entry.key)) byKey.set(entry.key, entry);
    else lossy = true;
  }
  const history = [...byKey.values()].sort((a, b) => (a.key < b.key ? -1 : 1));

  const lastPlayedKey = value.lastPlayedKey;
  const streakOk = isCount(value.streak) && (lastPlayedKey === null || isKey(lastPlayedKey));
  if (!streakOk) lossy = true;
  const streak = streakOk ? Number(value.streak) : 0;
  if (!isCount(value.bestStreak)) lossy = true;
  const bestStreak = Math.max(isCount(value.bestStreak) ? value.bestStreak : 0, streak);

  const freezes = readFreezes(value);
  return {
    stats: {
      streak,
      bestStreak,
      lastPlayedKey: streakOk ? lastPlayedKey : null,
      history,
      ...freezes.value,
    },
    lossy: lossy || freezes.lossy,
  };
}

/** Freezes held (capped) and the days they covered; absent (pre-v4) means none. */
function readFreezes(value: Record<string, unknown>) {
  const held = value.freezes === undefined ? 0 : value.freezes;
  const keys = value.frozenKeys === undefined ? [] : value.frozenKeys;
  const heldOk = isCount(held);
  const keysOk = Array.isArray(keys) && keys.every(isKey);
  return {
    value: {
      freezes: heldOk ? Math.min(Number(held), STREAK_FREEZE.maxHeld) : 0,
      frozenKeys: keysOk ? [...new Set(keys)].sort() : [],
    },
    lossy: !heldOk || !keysOk,
  };
}
