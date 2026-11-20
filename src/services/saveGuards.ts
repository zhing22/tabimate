// Shape checks for data read back from storage, which may be old, corrupt or
// edited by hand. Deeper consistency (does a run fit its puzzle?) is checked
// later by core's canRestore.
import { isLevelId } from '@/config/levels';
import { isDateKey } from '@/core/date';
import type {
  BonusResult,
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
const STATUSES = {
  idle: true,
  playing: true,
  revealing: true,
  bonus: true,
  finished: true,
} satisfies Record<RunStatus, true>;
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
  (value.roundEndsAt === null || isTime(value.roundEndsAt)) &&
  isCount(value.bonusCount) &&
  Array.isArray(value.bonusResults) &&
  value.bonusResults.every(isBonusResult) &&
  (value.bonusEndsAt === null || isTime(value.bonusEndsAt));

function isBonusResult(value: unknown): value is BonusResult {
  return (
    isObject(value) &&
    (value.answer === null || typeof value.answer === 'boolean') &&
    typeof value.correct === 'boolean' &&
    isTime(value.timeMs)
  );
}
