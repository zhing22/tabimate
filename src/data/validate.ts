import { PROMPTS_PER_DAY } from '@/config/game';
import type { AnswerTierId } from '@/config/tiers';
import { puzzleNumber } from '@/core/date';
import type {
  Animal,
  AnimalId,
  DateKey,
  Movement,
  Prompt,
  Puzzle,
  PuzzleAnswer,
  SizeClass,
} from '@/core/types';
import { createJsonReader, field, item, type JsonReader } from './jsonReader';

const MOVEMENTS: readonly Movement[] = ['land', 'sky', 'water'];
const SIZES: readonly SizeClass[] = ['S', 'M', 'L'];
const ANSWER_TIERS: readonly AnswerTierId[] = [1, 2, 3, 4, 5];
// Ids end up in URLs, sprite keys and hashes, so keep them plain.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type AnimalRegistry = ReadonlyMap<AnimalId, Animal>;

function slug(r: JsonReader, value: unknown, path: string): string {
  const s = r.string(value, path);
  return SLUG.test(s) ? s : r.fail(path, `must be lowercase-with-dashes (got "${s}")`);
}

function readAnimal(r: JsonReader, value: unknown, path: string): Animal {
  const o = r.object(value, path);
  return {
    id: slug(r, o.id, field(path, 'id')),
    display: r.string(o.display, field(path, 'display')),
    aliases: r.stringArray(o.aliases, field(path, 'aliases')),
    archetype: slug(r, o.archetype, field(path, 'archetype')),
    movement: r.oneOf(o.movement, MOVEMENTS, field(path, 'movement')),
    size: r.oneOf(o.size, SIZES, field(path, 'size')),
    tint: r.hex(o.tint, field(path, 'tint')),
    emoji: r.string(o.emoji, field(path, 'emoji')),
  };
}

/**
 * Two animals sharing a name or alias would make matching ambiguous, so every
 * name (case-insensitive) must belong to exactly one animal.
 */
function checkNamesUnique(r: JsonReader, animals: readonly Animal[]): void {
  const owner = new Map<string, AnimalId>();
  animals.forEach((animal, i) => {
    const names = [animal.display, ...animal.aliases];
    names.forEach((name, n) => {
      const key = name.trim().toLowerCase();
      const taken = owner.get(key);
      if (taken !== undefined && taken !== animal.id) {
        const path = n === 0 ? `[${i}].display` : `[${i}].aliases[${n - 1}]`;
        r.fail(path, `"${name}" is already used by "${taken}"`);
      }
      owner.set(key, animal.id);
    });
  });
}

/** Validates animals.json (an array of animals) into a registry keyed by id. */
export function validateAnimals(json: unknown, file: string): AnimalRegistry {
  const r = createJsonReader(file);
  const list = r.array(json, '');
  if (list.length === 0) r.fail('', 'must contain at least one animal');

  const registry = new Map<AnimalId, Animal>();
  const animals = list.map((value, i) => {
    const animal = readAnimal(r, value, item('', i));
    if (registry.has(animal.id)) r.fail(`[${i}].id`, `"${animal.id}" is a duplicate`);
    registry.set(animal.id, animal);
    return animal;
  });
  checkNamesUnique(r, animals);
  return registry;
}

function readAnswer(r: JsonReader, value: unknown, path: string, animals: AnimalRegistry) {
  const o = r.object(value, path);
  const animalId = r.string(o.animalId, field(path, 'animalId'));
  if (!animals.has(animalId)) {
    r.fail(field(path, 'animalId'), `"${animalId}" is not in the animal registry`);
  }
  const tier = r.oneOf(o.tier, ANSWER_TIERS, field(path, 'tier'));
  return { animalId, tier } satisfies PuzzleAnswer;
}

function readPrompt(r: JsonReader, value: unknown, path: string, animals: AnimalRegistry): Prompt {
  const o = r.object(value, path);
  const answersPath = field(path, 'answers');
  const list = r.array(o.answers, answersPath);
  if (list.length === 0) r.fail(answersPath, 'must contain at least one answer');

  const seen = new Set<AnimalId>();
  const answers = list.map((entry, i) => {
    const answer = readAnswer(r, entry, item(answersPath, i), animals);
    if (seen.has(answer.animalId)) {
      r.fail(field(item(answersPath, i), 'animalId'), `"${answer.animalId}" is listed twice`);
    }
    seen.add(answer.animalId);
    return answer;
  });
  return {
    id: slug(r, o.id, field(path, 'id')),
    text: r.string(o.text, field(path, 'text')),
    answers,
  };
}

export interface PuzzleContext {
  readonly file: string;
  /** The key the file was requested for; the puzzle's date must match it. */
  readonly key: DateKey;
  readonly animals: AnimalRegistry;
}

/** Validates one puzzle file against its expected key and the animal registry. */
export function validatePuzzle(json: unknown, { file, key, animals }: PuzzleContext): Puzzle {
  const r = createJsonReader(file);
  const o = r.object(json, '');

  const date = r.string(o.date, 'date');
  if (date !== key) r.fail('date', `"${date}" does not match the requested key "${key}"`);
  const number = r.integer(o.number, 'number');
  const expected = puzzleNumber(key);
  if (number !== expected) r.fail('number', `is ${number} but ${key} is puzzle ${expected}`);

  const list = r.array(o.prompts, 'prompts');
  if (list.length !== PROMPTS_PER_DAY) {
    r.fail('prompts', `must have ${PROMPTS_PER_DAY} prompts (got ${list.length})`);
  }
  const prompts = list.map((value, i) => readPrompt(r, value, item('prompts', i), animals));
  const ids = new Set<string>();
  prompts.forEach((prompt, i) => {
    if (ids.has(prompt.id)) r.fail(`prompts[${i}].id`, `"${prompt.id}" is a duplicate`);
    ids.add(prompt.id);
  });
  return { date, number, prompts };
}
