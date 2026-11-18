// Pure steps of the v2 data migration (scripts/migrate-puzzles-v2.ts), kept
// apart from the file handling so they can be tested.

import { TOP_LEVEL as TOP } from '../../src/config/tiers.ts';

type Json = Record<string, unknown>;

export interface Answer {
  animalId: string;
  level: number;
}
export interface PromptJson {
  id: string;
  text: string;
  answers: Answer[];
}
export interface PuzzleJson {
  date: string;
  prompts: PromptJson[];
  [key: string]: unknown;
}

/** v1 answers had `tier`; v2 calls it `level`. Already-migrated answers pass through. */
export function puzzleToV2(puzzle: Json): PuzzleJson {
  const prompts = (puzzle.prompts as Json[]).map((prompt) => ({
    ...prompt,
    answers: (prompt.answers as Json[]).map(({ tier, level, ...rest }) => ({
      ...rest,
      level: level ?? tier,
    })),
  }));
  return { ...puzzle, prompts } as PuzzleJson;
}

/** Every animal so far is a species; groups are added by hand afterwards. */
export const animalsToV2 = (animals: readonly Json[]): Json[] =>
  animals.map((a) => (a.kind === undefined ? { ...a, kind: 'species' } : a));

export interface CrProblem {
  readonly date: string;
  readonly promptId: string;
  readonly text: string;
  /** Animals at the top level on this prompt (0, or more than one). */
  readonly top: readonly string[];
}

/** Prompts that break "exactly one CR answer": none, or more than one. */
export function crProblems(puzzles: readonly PuzzleJson[]): CrProblem[] {
  return puzzles.flatMap((puzzle) =>
    puzzle.prompts
      .map((p) => ({
        date: puzzle.date,
        promptId: p.id,
        text: p.text,
        top: p.answers.filter((a) => a.level === TOP).map((a) => a.animalId),
      }))
      .filter((p) => p.top.length !== 1),
  );
}

/** How many prompts each animal answers, across all puzzles. */
export function appearances(puzzles: readonly PuzzleJson[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const answer of puzzles.flatMap((p) => p.prompts.flatMap((q) => q.answers))) {
    counts.set(answer.animalId, (counts.get(answer.animalId) ?? 0) + 1);
  }
  return counts;
}

export interface CrFix {
  readonly date: string;
  readonly promptId: string;
  readonly kept: string;
  /** Moved from 5 down to 4, or (when the prompt had none) the one moved up to 5. */
  readonly demoted: readonly string[];
  readonly promoted: string | null;
}

/**
 * A placeholder pick for review, not a judgement: keeps as CR the candidate
 * that answers the fewest prompts overall (the least obvious name), ties by
 * id. Others at 5 drop to 4; a prompt with no 5 promotes its best answer.
 */
export function fixCr(puzzle: PuzzleJson, counts: ReadonlyMap<string, number>): CrFix[] {
  const fixes: CrFix[] = [];
  const pick = (ids: string[]) =>
    [...ids].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0) || a.localeCompare(b))[0]!;
  for (const prompt of puzzle.prompts) {
    const top = prompt.answers.filter((a) => a.level === TOP);
    if (top.length === 1 || prompt.answers.length === 0) continue;
    if (top.length > 1) {
      const kept = pick(top.map((a) => a.animalId));
      for (const a of top) if (a.animalId !== kept) a.level = TOP - 1;
      const demoted = top.map((a) => a.animalId).filter((id) => id !== kept);
      fixes.push({ date: puzzle.date, promptId: prompt.id, kept, demoted, promoted: null });
    } else {
      const best = Math.max(...prompt.answers.map((a) => a.level));
      const kept = pick(prompt.answers.filter((a) => a.level === best).map((a) => a.animalId));
      prompt.answers.find((a) => a.animalId === kept)!.level = TOP;
      fixes.push({ date: puzzle.date, promptId: prompt.id, kept, demoted: [], promoted: kept });
    }
  }
  return fixes;
}
