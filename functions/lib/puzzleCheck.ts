// Re-checking a run against the day's static puzzle file: every prompt must
// be on the puzzle and every answer on its prompt, and the level stored is the
// file's hand-set one (never the client's). Pure; tested.
import type { RunSubmission } from '../../src/core/stats.ts';
import type { Checked } from './runBody.ts';

/** The parts of a puzzle file the check reads. */
export interface PuzzleAnswers {
  readonly prompts: readonly {
    readonly id: string;
    readonly answers: readonly { readonly animalId: string; readonly level: number }[];
  }[];
}

/** A row to store: one prompt's answer, with its level (0 for a miss). */
export interface RunRow {
  readonly promptId: string;
  readonly answerId: string | null;
  readonly level: number;
}

/** The puzzle file's prompts and answers, or null if it isn't that shape. */
export function readPuzzleAnswers(json: unknown): PuzzleAnswers | null {
  if (typeof json !== 'object' || json === null) return null;
  const prompts = (json as { prompts?: unknown }).prompts;
  if (!Array.isArray(prompts)) return null;
  const ok = prompts.every(
    (p: unknown) =>
      typeof p === 'object' &&
      p !== null &&
      typeof (p as { id?: unknown }).id === 'string' &&
      Array.isArray((p as { answers?: unknown }).answers),
  );
  return ok ? (json as PuzzleAnswers) : null;
}

export function checkAgainstPuzzle(run: RunSubmission, puzzle: PuzzleAnswers): Checked<RunRow[]> {
  const prompts = new Map(puzzle.prompts.map((p) => [p.id, p]));
  const rows: RunRow[] = [];
  for (const { promptId, answerId } of run.answers) {
    const prompt = prompts.get(promptId);
    if (!prompt) return { ok: false, error: `prompt ${promptId} is not on ${run.dateKey}` };
    if (answerId === null) {
      rows.push({ promptId, answerId, level: 0 });
      continue;
    }
    const answer = prompt.answers.find((a) => a.animalId === answerId);
    if (!answer) return { ok: false, error: `${answerId} is not an answer to ${promptId}` };
    rows.push({ promptId, answerId, level: answer.level });
  }
  return { ok: true, value: rows };
}
