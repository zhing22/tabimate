// Which sprite sheets players would see most: every answer on every puzzle,
// counted under the archetype that draws it (a group under its representative's),
// weighted so recent and upcoming days count more. Pure; scripts/sprite-coverage.ts
// reads the files and prints it.
import { COVERAGE } from '../../src/config/sprites.ts';
import { representativeFor } from '../../src/core/hierarchy.ts';
import type { AnimalLookup } from '../../src/core/types.ts';

export interface CoveragePuzzle {
  readonly date: string;
  readonly prompts: readonly { readonly answers: readonly { readonly animalId: string }[] }[];
}

export interface CoverageRow {
  readonly archetype: string;
  /** Answers, each counted by its day's weight. */
  readonly weight: number;
  /** Answers on all days, unweighted. */
  readonly answers: number;
  /** The animals it would draw, most weighted first. */
  readonly animals: readonly string[];
  /** A pixel sheet exists (in the sprite manifest). */
  readonly hasSheet: boolean;
}

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/** Today and later count 1; older days halve every COVERAGE.halfLifeDays. */
export const dayWeight = (date: string, today: string): number =>
  date >= today ? 1 : 0.5 ** (daysBetween(date, today) / COVERAGE.halfLifeDays);

export function spriteCoverage(
  puzzles: readonly CoveragePuzzle[],
  animals: AnimalLookup,
  sheets: ReadonlySet<string>,
  today: string,
): CoverageRow[] {
  const rows = new Map<
    string,
    { weight: number; answers: number; byAnimal: Map<string, number> }
  >();
  for (const puzzle of puzzles) {
    const w = dayWeight(puzzle.date, today);
    for (const answer of puzzle.prompts.flatMap((p) => p.answers)) {
      const animal = animals.get(answer.animalId);
      if (!animal) continue;
      const { archetype } = representativeFor(animal, animals);
      const row = rows.get(archetype) ?? { weight: 0, answers: 0, byAnimal: new Map() };
      row.weight += w;
      row.answers += 1;
      row.byAnimal.set(animal.id, (row.byAnimal.get(animal.id) ?? 0) + w);
      rows.set(archetype, row);
    }
  }
  return [...rows]
    .map(([archetype, row]) => ({
      archetype,
      weight: row.weight,
      answers: row.answers,
      animals: [...row.byAnimal].sort((a, b) => b[1] - a[1]).map(([id]) => id),
      hasSheet: sheets.has(archetype),
    }))
    .sort((a, b) => b.weight - a.weight || a.archetype.localeCompare(b.archetype));
}
