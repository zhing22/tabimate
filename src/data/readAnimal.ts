import { DESCRIPTION_MAX_WORDS, MOVEMENTS, SIZE_CLASSES } from '@/config/animals';
import {
  ACTIVE_TIMES,
  ANIMAL_CLASSES,
  ANIMAL_KINDS,
  BODY_SIZES,
  CONTINENTS,
  DIETS,
  HABITATS,
  SOCIAL,
} from '@/config/traits';
import type { Animal, AnimalTraits, MetreRange } from '@/core/types';
import { field, item, type JsonObject, type JsonReader } from './jsonReader';

// Ids end up in URLs, sprite keys and hashes, so keep them plain.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slug(r: JsonReader, value: unknown, path: string): string {
  const s = r.string(value, path);
  return SLUG.test(s) ? s : r.fail(path, `must be lowercase-with-dashes (got "${s}")`);
}

/** Reads o[key] with `read` if it is present; absent keys stay absent (exactOptionalPropertyTypes). */
function optional<T, K extends string>(
  o: JsonObject,
  key: K,
  path: string,
  read: (value: unknown, path: string) => T,
): { [P in K]?: T } {
  return o[key] === undefined ? {} : ({ [key]: read(o[key], field(path, key)) } as { [P in K]: T });
}

/** Reads one trait value; fails (DataError) on a bad one. */
type Reader<T> = (r: JsonReader, value: unknown, path: string) => T;

const one =
  <T>(options: readonly T[]): Reader<T> =>
  (r, v, p) =>
    r.oneOf(v, options, p);
const many =
  <T>(options: readonly T[]): Reader<readonly T[]> =>
  (r, v, p) =>
    r.array(v, p).map((entry, i) => r.oneOf(entry, options, item(p, i)));
const flag: Reader<boolean> = (r, v, p) => r.boolean(v, p);

const count: Reader<number> = (r, v, p) => {
  const n = r.integer(v, p);
  return n >= 0 ? n : r.fail(p, `must be 0 or more (got ${n})`);
};

const range: Reader<MetreRange> = (r, value, path) => {
  const list = r.array(value, path);
  if (list.length !== 2) r.fail(path, `must be [min, max] (got ${list.length} values)`);
  const min = r.number(list[0], item(path, 0));
  const max = r.number(list[1], item(path, 1));
  if (min > max) r.fail(path, `min ${min} is more than max ${max}`);
  return [min, max];
};

/**
 * One reader per trait. Typed against AnimalTraits, so a new trait won't
 * compile until it has a reader here; the known keys come from this table too.
 */
const TRAIT_READERS: { readonly [K in keyof AnimalTraits]-?: Reader<AnimalTraits[K] & {}> } = {
  class: one(ANIMAL_CLASSES),
  diet: many(DIETS),
  habitat: many(HABITATS),
  continent: many(CONTINENTS),
  legs: count,
  tail: flag,
  gills: flag,
  shell: flag,
  horns: flag,
  feathers: flag,
  pouch: flag,
  flies: flag,
  social: one(SOCIAL),
  active: one(ACTIVE_TIMES),
  extinct: flag,
  altitudeM: range,
  depthM: range,
  size: one(BODY_SIZES),
};

/** Every trait key, in table order: for reports over the data. */
export const TRAIT_KEYS = Object.keys(TRAIT_READERS) as readonly (keyof AnimalTraits)[];

const isTrait = (key: string): key is keyof AnimalTraits => Object.hasOwn(TRAIT_READERS, key);

function readTraits(r: JsonReader, value: unknown, path: string): AnimalTraits {
  const o = r.object(value, path);
  const traits: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(o)) {
    // A misspelt trait would silently never match a prompt, so unknown keys fail.
    if (!isTrait(key)) return r.fail(field(path, key), 'is not a known trait');
    if (v !== undefined) traits[key] = TRAIT_READERS[key](r, v, field(path, key));
  }
  return traits;
}

function description(r: JsonReader, value: unknown, path: string): string {
  const text = r.string(value, path);
  const words = text.trim().split(/\s+/).length;
  if (words > DESCRIPTION_MAX_WORDS) {
    r.fail(path, `has ${words} words (at most ${DESCRIPTION_MAX_WORDS})`);
  }
  return text;
}

/** Descriptions are drafted from English Wikipedia, so the link shown beside them goes there. */
const WIKI = /^https:\/\/en\.wikipedia\.org\/wiki\/[^\s/?#]+$/;

function wiki(r: JsonReader, value: unknown, path: string): string {
  const url = r.string(value, path);
  return WIKI.test(url)
    ? url
    : r.fail(path, `must be an https://en.wikipedia.org/wiki/ article link (got "${url}")`);
}

/** One animals.json entry. Hierarchy links are checked once all are read (checkHierarchy). */
export function readAnimal(r: JsonReader, value: unknown, path: string): Animal {
  const o = r.object(value, path);
  // A reviewed description must exist: "reviewed" with nothing to review is a mistake.
  if (o.descriptionReviewed === true && o.description === undefined) {
    r.fail(field(path, 'description'), 'is missing, but descriptionReviewed is true');
  }
  return {
    id: slug(r, o.id, field(path, 'id')),
    display: r.string(o.display, field(path, 'display')),
    aliases: r.stringArray(o.aliases, field(path, 'aliases')),
    archetype: slug(r, o.archetype, field(path, 'archetype')),
    movement: r.oneOf(o.movement, MOVEMENTS, field(path, 'movement')),
    size: r.oneOf(o.size, SIZE_CLASSES, field(path, 'size')),
    tint: r.hex(o.tint, field(path, 'tint')),
    emoji: r.string(o.emoji, field(path, 'emoji')),
    kind: r.oneOf(o.kind, ANIMAL_KINDS, field(path, 'kind')),
    ...optional(o, 'parent', path, (v, p) => slug(r, v, p)),
    ...optional(o, 'representative', path, (v, p) => slug(r, v, p)),
    ...optional(o, 'description', path, (v, p) => description(r, v, p)),
    ...optional(o, 'descriptionReviewed', path, (v, p) => r.boolean(v, p)),
    ...optional(o, 'wiki', path, (v, p) => wiki(r, v, p)),
    ...optional(o, 'traits', path, (v, p) => readTraits(r, v, p)),
  };
}
