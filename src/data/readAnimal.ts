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

function range(r: JsonReader, value: unknown, path: string): MetreRange {
  const list = r.array(value, path);
  if (list.length !== 2) r.fail(path, `must be [min, max] (got ${list.length} values)`);
  const min = r.number(list[0], item(path, 0));
  const max = r.number(list[1], item(path, 1));
  if (min > max) r.fail(path, `min ${min} is more than max ${max}`);
  return [min, max];
}

function readTraits(r: JsonReader, value: unknown, path: string): AnimalTraits {
  const o = r.object(value, path);
  const known = new Set<string>();
  const opt = <T, K extends string>(key: K, read: (v: unknown, p: string) => T) => {
    known.add(key);
    return optional(o, key, path, read);
  };
  const many =
    <T>(options: readonly T[]) =>
    (v: unknown, p: string): readonly T[] =>
      r.array(v, p).map((entry, i) => r.oneOf(entry, options, item(p, i)));
  const one =
    <T>(options: readonly T[]) =>
    (v: unknown, p: string): T =>
      r.oneOf(v, options, p);
  const flag = (v: unknown, p: string) => r.boolean(v, p);
  const traits: AnimalTraits = {
    ...opt('class', one(ANIMAL_CLASSES)),
    ...opt('diet', many(DIETS)),
    ...opt('habitat', many(HABITATS)),
    ...opt('continent', many(CONTINENTS)),
    ...opt('legs', (v, p) => {
      const n = r.integer(v, p);
      return n >= 0 ? n : r.fail(p, `must be 0 or more (got ${n})`);
    }),
    ...opt('tail', flag),
    ...opt('gills', flag),
    ...opt('shell', flag),
    ...opt('horns', flag),
    ...opt('feathers', flag),
    ...opt('pouch', flag),
    ...opt('flies', flag),
    ...opt('social', one(SOCIAL)),
    ...opt('active', one(ACTIVE_TIMES)),
    ...opt('extinct', flag),
    ...opt('altitudeM', (v, p) => range(r, v, p)),
    ...opt('depthM', (v, p) => range(r, v, p)),
    ...opt('size', one(BODY_SIZES)),
  };
  // A misspelt trait would silently never match a prompt, so unknown keys fail.
  const extra = Object.keys(o).find((key) => !known.has(key));
  if (extra !== undefined) r.fail(field(path, extra), 'is not a known trait');
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

function wiki(r: JsonReader, value: unknown, path: string): string {
  const url = r.string(value, path);
  return url.startsWith('https://') ? url : r.fail(path, `must be an https:// link (got "${url}")`);
}

/** One animals.json entry. Hierarchy links are checked once all are read (checkHierarchy). */
export function readAnimal(r: JsonReader, value: unknown, path: string): Animal {
  const o = r.object(value, path);
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
