// A slot's answer rows: drafting them from a template's filter, suggesting
// levels, adding by hand, redrafting without losing edits, and picking CRs.
import { ancestorsOf } from '@/core/hierarchy';
import { queryAnimals, type AnimalFilter } from '@/core/traits';
import type { Animal, AnimalId, AnimalLookup } from '@/core/types';
import type { AnswerRow, RowLevel, SlotDraft } from './types';

/** An animal answering at least this many prompts counts as common (an easy name). */
export const COMMON_MIN_USES = 3;

/** Starting levels for suggestLevel: easy, familiar, and everything else. */
const SUGGESTED = { group: 1, common: 2, other: 3 } as const satisfies Record<string, RowLevel>;

/**
 * A starting level, to be adjusted by hand: a group is 1, a common animal 2,
 * anything else 3. Never 4 or 5: rarity at the top is always a person's call.
 */
export const suggestLevel = (animal: Animal, usage: ReadonlyMap<AnimalId, number>): RowLevel =>
  animal.kind === 'group'
    ? SUGGESTED.group
    : (usage.get(animal.id) ?? 0) >= COMMON_MIN_USES
      ? SUGGESTED.common
      : SUGGESTED.other;

/** Groups first, then by level, then by name. */
export function sortRows(rows: readonly AnswerRow[], animals: AnimalLookup): AnswerRow[] {
  const key = (r: AnswerRow) => {
    const a = animals.get(r.animalId);
    return [a?.kind === 'group' ? 0 : 1, r.level, a?.display ?? r.animalId] as const;
  };
  return [...rows].sort((x, y) => {
    const [a, b] = [key(x), key(y)];
    return a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2]);
  });
}

/**
 * Draft rows for a filter: every matching animal, ticked, plus the groups above
 * the matching species. A group that matches the filter itself is ticked; one
 * that only contains matches is offered unticked, since a group fits a trait
 * prompt only when the trait is typical of the whole group.
 */
export function draftRows(
  filter: AnimalFilter,
  animals: AnimalLookup,
  usage: ReadonlyMap<AnimalId, number>,
): AnswerRow[] {
  const matched = queryAnimals(animals.values(), filter);
  const ids = new Set(matched.map((a) => a.id));
  const groups = new Map<AnimalId, Animal>();
  for (const a of matched) for (const g of ancestorsOf(a, animals)) groups.set(g.id, g);
  const all = [...matched, ...[...groups.values()].filter((g) => !ids.has(g.id))];
  const rows = all.map((a) => ({
    animalId: a.id,
    level: suggestLevel(a, usage),
    include: ids.has(a.id),
  }));
  return sortRows(rows, animals);
}

/**
 * A slot after its template drafts new rows: drafted rows keep any level or
 * include you set before, hand-added rows stay, other old rows go, and CR picks
 * that are no longer included are dropped.
 */
export function redraftSlot(
  slot: SlotDraft,
  drafted: readonly AnswerRow[],
  animals: AnimalLookup,
): SlotDraft {
  const before = new Map(slot.rows.map((r) => [r.animalId, r]));
  const fresh = drafted.map((r) => {
    const old = before.get(r.animalId);
    return old ? { ...r, level: old.level, include: old.include } : r;
  });
  const ids = new Set(fresh.map((r) => r.animalId));
  const manual = slot.rows.filter((r) => r.manual && !ids.has(r.animalId));
  const rows = sortRows([...fresh, ...manual], animals);
  const included = new Set(rows.filter((r) => r.include).map((r) => r.animalId));
  return { ...slot, rows, cr: slot.cr.filter((id) => included.has(id)) };
}

/** Adds an animal by hand (by id or display name, any case); unchanged if unknown or present. */
export function addAnimal(
  slot: SlotDraft,
  nameOrId: string,
  animals: AnimalLookup,
  usage: ReadonlyMap<AnimalId, number>,
): SlotDraft {
  const key = nameOrId.trim().toLowerCase();
  const animal =
    animals.get(key) ?? [...animals.values()].find((a) => a.display.toLowerCase() === key);
  if (!animal || slot.rows.some((r) => r.animalId === animal.id)) return slot;
  const row: AnswerRow = {
    animalId: animal.id,
    level: suggestLevel(animal, usage),
    include: true,
    manual: true,
  };
  return { ...slot, rows: sortRows([...slot.rows, row], animals) };
}

/** Changes one row; un-including it also takes away its CR mark. */
export function editRow(slot: SlotDraft, id: AnimalId, patch: Partial<AnswerRow>): SlotDraft {
  const rows = slot.rows.map((r) => (r.animalId === id ? { ...r, ...patch } : r));
  const cr = patch.include === false ? slot.cr.filter((c) => c !== id) : slot.cr;
  return { ...slot, rows, cr };
}

/**
 * Marks or unmarks an answer as CR. With maxCR 1 it acts like a radio button
 * (the new pick replaces the old); above 1, picks toggle up to the limit.
 */
export function toggleCR(cr: readonly AnimalId[], id: AnimalId, maxCR: number): AnimalId[] {
  if (cr.includes(id)) return maxCR === 1 ? [id] : cr.filter((c) => c !== id);
  if (maxCR === 1) return [id];
  return cr.length < maxCR ? [...cr, id] : [...cr];
}
