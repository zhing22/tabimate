import { MATCHER_CONFIG, type MatcherConfig } from '@/config/game';
import { matchAnswer } from '@/core/matcher';
import type { AnimalLookup, Puzzle } from '@/core/types';

/**
 * Every answer's display name must score exactly on each prompt it is on, and
 * each alias must lead back to that answer. Otherwise typing a correct name, or
 * accepting the matcher's own correction, would land on a different answer or
 * none (a name that normalises into another's, or reads as a list of animals).
 * Returns one message per collision; empty when every name resolves to itself.
 */
export function nameCollisions(
  puzzle: Puzzle,
  animals: AnimalLookup,
  cfg: MatcherConfig = MATCHER_CONFIG,
): string[] {
  const problems: string[] = [];
  puzzle.prompts.forEach((prompt, p) => {
    for (const answer of prompt.answers) {
      const animal = animals.get(answer.animalId);
      if (!animal) continue; // the validator reports unknown animals
      [animal.display, ...animal.aliases].forEach((name, n) => {
        const got = matchAnswer(name, prompt, animals, cfg);
        const ok = got.animalId === animal.id && (n > 0 || got.strategy === 'exact');
        if (ok) return;
        const kind = n === 0 ? 'display name' : 'alias';
        const where = got.animalId ? `"${got.animalId}" by ${got.strategy}` : 'no answer';
        problems.push(
          `prompts[${p}] (${prompt.id}): ${kind} "${name}" of "${animal.id}" resolves to ${where}`,
        );
      });
    }
  });
  return problems;
}
