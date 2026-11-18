import { type AnswerLevel, LEVELS, TOP_LEVEL } from '@/config/tiers';
import { ancestorsOf } from '@/core/hierarchy';
import type { Animal, AnimalLookup, AnimalId, PuzzleAnswer } from '@/core/types';
import { DataError } from './dataError';
import { field, item, type JsonReader } from './jsonReader';

/** True if following parents from `animal` ever comes back to it. */
function inLoop(animal: Animal, animals: AnimalLookup): boolean {
  const seen = new Set<AnimalId>();
  for (let id = animal.parent; id !== undefined; id = animals.get(id)?.parent) {
    if (id === animal.id) return true;
    if (seen.has(id)) return false; // a loop further up; its own members report it
    seen.add(id);
  }
  return false;
}

function checkParent(r: JsonReader, animal: Animal, path: string, animals: AnimalLookup) {
  if (animal.parent === undefined) return;
  const parent = animals.get(animal.parent);
  if (!parent) r.fail(field(path, 'parent'), `"${animal.parent}" is not in the animal registry`);
  else if (parent.kind !== 'group') {
    r.fail(field(path, 'parent'), `"${animal.parent}" is a species, so it can't be a parent`);
  } else if (inLoop(animal, animals)) {
    r.fail(field(path, 'parent'), `"${animal.parent}" leads back to "${animal.id}" (a loop)`);
  }
}

function checkRepresentative(r: JsonReader, animal: Animal, path: string, animals: AnimalLookup) {
  const at = field(path, 'representative');
  const id = animal.representative;
  if (animal.kind === 'species') {
    if (id !== undefined) r.fail(at, 'is only for groups');
    return;
  }
  if (id === undefined) return r.fail(at, 'must be set for a group (its sprite comes from it)');
  const rep = animals.get(id);
  if (!rep) return r.fail(at, `"${id}" is not in the animal registry`);
  const below = rep.kind === 'species' && ancestorsOf(rep, animals).some((g) => g.id === animal.id);
  if (!below) r.fail(at, `"${id}" must be a species under "${animal.id}"`);
}

/**
 * Parents exist, are groups and never loop; every group names a representative
 * species somewhere below it. Runs after every animal is read, since links can
 * point forward in the file.
 */
export function checkHierarchy(r: JsonReader, list: readonly Animal[], animals: AnimalLookup) {
  list.forEach((animal, i) => checkParent(r, animal, item('', i), animals));
  list.forEach((animal, i) => checkRepresentative(r, animal, item('', i), animals));
}

export interface PromptLevelRules {
  readonly file: string;
  readonly animals: AnimalLookup;
  /** Most CR answers a prompt may have (a theme's maxCR). Unset: exactly one. */
  readonly maxCR?: number | undefined;
  /** Gets each non-fatal problem as a full message. Unset: warnings are dropped. */
  readonly warn?: ((message: string) => void) | undefined;
}

const levelName = (level: AnswerLevel) => `level ${level} (${LEVELS[level].shortName})`;

/**
 * The top level is the one prize per prompt: exactly one CR answer, or 1 to
 * maxCR on a themed day. A species ranked below its own group is allowed but
 * odd (the specific answer should be at least as rare), so it only warns.
 */
export function checkPromptLevels(
  r: JsonReader,
  answers: readonly PuzzleAnswer[],
  path: string,
  { file, animals, maxCR, warn }: PromptLevelRules,
) {
  const top = answers.filter((a) => a.level === TOP_LEVEL).length;
  const most = maxCR ?? 1;
  if (top < 1 || top > most) {
    r.fail(
      path,
      maxCR === undefined
        ? `must have exactly one level-${TOP_LEVEL} (CR) answer (got ${top})`
        : `must have 1 to ${most} level-${TOP_LEVEL} (CR) answers (got ${top})`,
    );
  }
  if (!warn) return;
  const levelOf = new Map(answers.map((a) => [a.animalId, a.level]));
  answers.forEach((answer, i) => {
    const animal = animals.get(answer.animalId);
    if (!animal) return;
    for (const group of ancestorsOf(animal, animals)) {
      const groupLevel = levelOf.get(group.id);
      if (groupLevel === undefined || groupLevel <= answer.level) continue;
      const problem =
        `"${animal.id}" is ${levelName(answer.level)}, below its group ` +
        `"${group.id}" at ${levelName(groupLevel)}`;
      warn(new DataError(file, field(item(path, i), 'level'), problem).message);
    }
  });
}
