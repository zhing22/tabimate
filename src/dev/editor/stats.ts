// Numbers the editor shows beside a draft: how common an animal is, how many
// answers sit at each level, and whether a prompt was used recently.
import { ANSWER_LEVELS, type AnswerLevel } from '@/config/levels';
import type { AnimalId, DateKey, Puzzle } from '@/core/types';

/** How many prompts each animal already answers: the "is it common?" signal. */
export function answerUsage(puzzles: readonly Puzzle[]): Map<AnimalId, number> {
  const usage = new Map<AnimalId, number>();
  for (const answer of puzzles.flatMap((p) => p.prompts.flatMap((q) => q.answers))) {
    usage.set(answer.animalId, (usage.get(answer.animalId) ?? 0) + 1);
  }
  return usage;
}

/** How many answers sit at each answer level (every level present, zero if none). */
export function levelCounts(
  answers: readonly { level: AnswerLevel }[],
): Record<AnswerLevel, number> {
  const counts = Object.fromEntries(ANSWER_LEVELS.map((l) => [l, 0])) as Record<
    AnswerLevel,
    number
  >;
  for (const a of answers) counts[a.level]++;
  return counts;
}

/** Dates among `recent` where this prompt (same id or same text) was already used. */
export function recentUses(
  prompt: { id: string; text: string },
  recent: readonly Puzzle[],
): DateKey[] {
  const text = prompt.text.trim().toLowerCase();
  return recent
    .filter((p) =>
      p.prompts.some((q) => q.id === prompt.id || q.text.trim().toLowerCase() === text),
    )
    .map((p) => p.date)
    .sort();
}
