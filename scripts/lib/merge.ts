// Merges reviewed drafts into animals.json. It only ever fills what is empty:
// a trait, wiki link, parent or description already in animals.json is never
// replaced, so hand edits survive every rerun. Animals in the drafts but not in
// animals.json are added, with presentation fields taken from their parent
// group (or their class) so they validate and can be tuned later.
import type { AnimalTraits } from '../../src/core/types.ts';
import type { ListedAnimal } from './animalList.ts';

export type AnimalJson = Record<string, unknown> & { id: string };

export interface TraitDraft {
  readonly listed: ListedAnimal;
  /** https://en.wikipedia.org/wiki/... or null when the title didn't resolve to an article. */
  readonly wiki: string | null;
  readonly qid: string | null;
  readonly traits: AnimalTraits;
  /** Why this draft is incomplete (missing page, disambiguation...). */
  readonly problems: readonly string[];
}

export interface DescriptionDraft {
  readonly id: string;
  readonly description: string;
  readonly wiki: string;
}

const CLASS_EMOJI: Readonly<Record<string, string>> = {
  mammal: '🐾',
  bird: '🐦',
  reptile: '🦎',
  amphibian: '🐸',
  fish: '🐟',
  insect: '🐛',
  arachnid: '🕷️',
  crustacean: '🦀',
  mollusc: '🐚',
};
const CLASS_TINT: Readonly<Record<string, string>> = {
  mammal: '#8a6a4a',
  bird: '#6a8ab0',
  reptile: '#6a8a4a',
  amphibian: '#5aa05a',
  fish: '#4a7ab0',
  insect: '#b0904a',
  arachnid: '#5a4a4a',
  crustacean: '#c0603a',
  mollusc: '#9a7aa0',
};
const SPRITE_SIZE: Readonly<Record<string, string>> = {
  tiny: 'S',
  small: 'S',
  medium: 'M',
  large: 'L',
  huge: 'L',
};

const isEmpty = (v: unknown) => v === undefined || v === null || v === '';

/** Field order in animals.json, so merged records read like hand-written ones. */
const ORDER = [
  'id',
  'display',
  'aliases',
  'kind',
  'parent',
  'representative',
  'archetype',
  'movement',
  'size',
  'tint',
  'emoji',
  'description',
  'descriptionReviewed',
  'wiki',
  'traits',
];
const ordered = (a: AnimalJson): AnimalJson => {
  const keys = [
    ...ORDER.filter((k) => k in a),
    ...Object.keys(a).filter((k) => !ORDER.includes(k)),
  ];
  return Object.fromEntries(keys.map((k) => [k, a[k]])) as AnimalJson;
};

/** A new animal record from its draft, inheriting looks from its parent group when it has one. */
function newRecord(draft: TraitDraft, parent: AnimalJson | undefined): AnimalJson {
  const { listed, traits } = draft;
  const cls = traits.class;
  const movement =
    listed.movement ??
    (parent?.movement as string | undefined) ??
    (cls === 'fish' ? 'water' : cls === 'bird' ? 'sky' : 'land');
  return ordered({
    id: listed.id,
    display: listed.display,
    aliases: [],
    kind: listed.kind,
    ...(listed.parent ? { parent: listed.parent } : {}),
    ...(listed.representative ? { representative: listed.representative } : {}),
    archetype: parent?.archetype ?? (listed.kind === 'group' ? listed.id : (cls ?? 'animal')),
    movement,
    size: SPRITE_SIZE[traits.size ?? ''] ?? parent?.size ?? 'M',
    tint: parent?.tint ?? CLASS_TINT[cls ?? ''] ?? '#808080',
    emoji: listed.emoji ?? parent?.emoji ?? CLASS_EMOJI[cls ?? ''] ?? '🐾',
    ...(draft.wiki ? { wiki: draft.wiki } : {}),
    ...(Object.keys(traits).length > 0 ? { traits } : {}),
  });
}

/** Fills the empty fields of an existing record from its draft. Returns the fields it filled. */
function fillRecord(record: AnimalJson, draft: TraitDraft): string[] {
  const filled: string[] = [];
  const traits = { ...((record.traits as Record<string, unknown> | undefined) ?? {}) };
  for (const [key, value] of Object.entries(draft.traits)) {
    if (isEmpty(traits[key])) {
      traits[key] = value;
      filled.push(`traits.${key}`);
    }
  }
  if (filled.length > 0) record.traits = traits;
  if (isEmpty(record.wiki) && draft.wiki) {
    record.wiki = draft.wiki;
    filled.push('wiki');
  }
  if (isEmpty(record.parent) && draft.listed.parent) {
    record.parent = draft.listed.parent;
    filled.push('parent');
  }
  if (isEmpty(record.representative) && draft.listed.representative) {
    record.representative = draft.listed.representative;
    filled.push('representative');
  }
  return filled;
}

export interface MergeReport {
  readonly animals: AnimalJson[];
  readonly added: string[];
  /** id -> fields filled on an existing animal. */
  readonly filled: Record<string, string[]>;
}

/** Trait drafts into animals.json: new animals added, existing ones only filled where empty. */
export function mergeTraits(
  animals: readonly AnimalJson[],
  drafts: readonly TraitDraft[],
): MergeReport {
  const out = animals.map((a) => ({ ...a }));
  const byId = new Map(out.map((a) => [a.id, a]));
  const added: string[] = [];
  const filled: Record<string, string[]> = {};
  // Groups first, so their species can inherit from them.
  const order = [...drafts].sort(
    (a, b) => Number(a.listed.kind === 'species') - Number(b.listed.kind === 'species'),
  );
  for (const draft of order) {
    const existing = byId.get(draft.listed.id);
    if (existing) {
      const fields = fillRecord(existing, draft);
      if (fields.length > 0) filled[draft.listed.id] = fields;
      continue;
    }
    const record = newRecord(
      draft,
      draft.listed.parent ? byId.get(draft.listed.parent) : undefined,
    );
    out.push(record);
    byId.set(record.id, record);
    added.push(record.id);
  }
  return { animals: out.map(ordered), added, filled };
}

/** Description drafts into animals.json: only where there is no description yet. */
export function mergeDescriptions(
  animals: readonly AnimalJson[],
  drafts: readonly DescriptionDraft[],
): { animals: AnimalJson[]; described: string[] } {
  const byId = new Map(drafts.map((d) => [d.id, d]));
  const described: string[] = [];
  const out = animals.map((a) => {
    const draft = byId.get(a.id);
    if (!draft || !isEmpty(a.description) || draft.description === '') return a;
    described.push(a.id);
    return ordered({
      ...a,
      description: draft.description,
      descriptionReviewed: false,
      ...(isEmpty(a.wiki) ? { wiki: draft.wiki } : {}),
    });
  });
  return { animals: out, described };
}

/**
 * A group whose article isn't a single taxon ("whale", "big cat") gets no
 * class from Wikidata, but its species say what it is. Fills a group's empty
 * class when every species below it (at any depth) agrees on one.
 */
export function inheritGroupClass(animals: readonly AnimalJson[]): {
  animals: AnimalJson[];
  filled: string[];
} {
  const childrenOf = new Map<string, AnimalJson[]>();
  for (const a of animals) {
    if (typeof a.parent === 'string')
      childrenOf.set(a.parent, [...(childrenOf.get(a.parent) ?? []), a]);
  }
  const classOf = (a: AnimalJson) => (a.traits as { class?: string } | undefined)?.class;
  const speciesClasses = (id: string, seen = new Set<string>()): string[] => {
    if (seen.has(id)) return [];
    seen.add(id);
    return (childrenOf.get(id) ?? []).flatMap((c) =>
      c.kind === 'species' ? [classOf(c) ?? '?'] : speciesClasses(c.id, seen),
    );
  };
  const filled: string[] = [];
  const out = animals.map((a) => {
    if (a.kind !== 'group' || classOf(a) !== undefined) return a;
    const classes = new Set(speciesClasses(a.id));
    const [only] = classes;
    if (classes.size !== 1 || only === undefined || only === '?') return a;
    filled.push(a.id);
    const traits = { ...((a.traits as Record<string, unknown> | undefined) ?? {}), class: only };
    return ordered({ ...a, traits: { ...traits, feathers: only === 'bird' } });
  });
  return { animals: out, filled };
}
