import { LEVELS, TOP_LEVEL, type AnswerLevel } from '@/config/levels';
import { pointsFor } from '@/core/scoring';
import { isMoreSpecific } from '@/core/hierarchy';
import type { Animal, AnimalLookup, Prompt } from '@/core/types';

export interface BetterChild {
  readonly animal: Animal;
  readonly level: AnswerLevel;
}

/**
 * For a group answer, the rarest species under it that this prompt also
 * accepts, if it beats the group's own level. Never a top-level (CR) answer:
 * the hint must not give the prize away. Ties go to the name, so it is stable.
 */
export function betterChild(
  prompt: Prompt,
  group: Animal,
  groupLevel: AnswerLevel,
  animals: AnimalLookup,
): BetterChild | null {
  let best: BetterChild | null = null;
  for (const { animalId, level } of prompt.answers) {
    const animal = animals.get(animalId);
    if (!animal || level <= groupLevel || level === TOP_LEVEL) continue;
    if (!isMoreSpecific(animal, group, animals)) continue;
    const better =
      !best ||
      level > best.level ||
      (level === best.level && animal.display.localeCompare(best.animal.display) < 0);
    if (better) best = { animal, level };
  }
  return best;
}

const levelText = (level: AnswerLevel) => `${LEVELS[level].shortName} (${pointsFor(level)})`;

/** "Bear is LC (10) — Brown bear would have been NT (25)". */
export const nearMissText = (group: Animal, groupLevel: AnswerLevel, child: BetterChild): string =>
  `${group.display} is ${levelText(groupLevel)} — ${child.animal.display} would have been ${levelText(child.level)}`;
