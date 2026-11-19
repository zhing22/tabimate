// The puzzle editor's data model, pure: drafting answer rows from a template,
// suggesting levels, marking CR answers, and converting to and from the puzzle
// file format the game reads. The DOM lives in ../puzzleEditor.ts.
import { MAX_PROMPTS_PER_PUZZLE } from '@/config/game';
import { TOP_LEVEL, type AnswerLevel } from '@/config/levels';
import { puzzleNumber } from '@/core/date';
import { ancestorsOf } from '@/core/hierarchy';
import { queryAnimals, type AnimalFilter } from '@/core/traits';
import type { Animal, AnimalId, AnimalLookup, DateKey, Puzzle } from '@/core/types';
import { fillText, promptIdFor, templateById, type BlankValues } from './templates';

/** One candidate answer in a slot's table. Its CR status is SlotDraft.cr, not its level. */
export interface AnswerRow {
  readonly animalId: AnimalId;
  /** LC..EN; the CR answer is chosen separately (one per prompt, or the theme's maxCR). */
  readonly level: Exclude<AnswerLevel, 5>;
  readonly include: boolean;
  /** Added by hand (or imported): kept when the template redrafts. */
  readonly manual?: boolean;
}

export interface SlotDraft {
  readonly templateId: string;
  readonly values: BlankValues;
  readonly rows: readonly AnswerRow[];
  /** The answers marked CR (level 5). */
  readonly cr: readonly AnimalId[];
}

export interface EditorDraft {
  readonly date: DateKey;
  readonly slots: readonly SlotDraft[];
}

export interface PuzzleJson {
  readonly date: DateKey;
  readonly number: number;
  readonly prompts: readonly {
    readonly id: string;
    readonly text: string;
    readonly answers: readonly { readonly animalId: AnimalId; readonly level: AnswerLevel }[];
  }[];
}

export const SLOT_COUNT = MAX_PROMPTS_PER_PUZZLE;

/** How many prompts each animal already answers: the "is it common?" signal. */
export function answerUsage(puzzles: readonly Puzzle[]): Map<AnimalId, number> {
  const usage = new Map<AnimalId, number>();
  for (const answer of puzzles.flatMap((p) => p.prompts.flatMap((q) => q.answers))) {
    usage.set(answer.animalId, (usage.get(answer.animalId) ?? 0) + 1);
  }
  return usage;
}

/** An animal answering at least this many prompts counts as common (an easy name). */
export const COMMON_MIN_USES = 3;

/**
 * A starting level, to be adjusted by hand: a group is 1, a common animal 2,
 * anything else 3. Never 4 or 5: rarity at the top is always a person's call.
 */
export const suggestLevel = (animal: Animal, usage: ReadonlyMap<AnimalId, number>): 1 | 2 | 3 =>
  animal.kind === 'group' ? 1 : (usage.get(animal.id) ?? 0) >= COMMON_MIN_USES ? 2 : 3;

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
 * Marks or unmarks an answer as CR. With maxCR 1 it acts like a radio button
 * (the new pick replaces the old); above 1, picks toggle up to the limit.
 */
export function toggleCR(cr: readonly AnimalId[], id: AnimalId, maxCR: number): AnimalId[] {
  if (cr.includes(id)) return maxCR === 1 ? [id] : cr.filter((c) => c !== id);
  if (maxCR === 1) return [id];
  return cr.length < maxCR ? [...cr, id] : [...cr];
}

export const emptySlot = (): SlotDraft => ({
  templateId: 'free',
  values: { text: '' },
  rows: [],
  cr: [],
});

export const emptyDraft = (date: DateKey): EditorDraft => ({
  date,
  slots: Array.from({ length: SLOT_COUNT }, emptySlot),
});

/** A slot's prompt id and text, from its template and values. */
export function slotPrompt(slot: SlotDraft): { id: string; text: string } {
  const template = templateById(slot.templateId) ?? templateById('free')!;
  return { id: promptIdFor(template, slot.values), text: fillText(template, slot.values).trim() };
}

/** A slot's answers as the puzzle file stores them: included rows, CR picks at level 5. */
export const slotAnswers = (slot: SlotDraft) =>
  slot.rows
    .filter((r) => r.include)
    .map((r) => ({
      animalId: r.animalId,
      level: slot.cr.includes(r.animalId) ? TOP_LEVEL : r.level,
    }));

/** A slot counts once it has text or answers; empty slots are left out of the file. */
const isUsed = (slot: SlotDraft) =>
  slotPrompt(slot).text !== '' || slot.rows.some((r) => r.include);

/** The draft as a puzzle file. Unchecked here: run it through the real validator. */
export const toPuzzleJson = (draft: EditorDraft): PuzzleJson => ({
  date: draft.date,
  number: puzzleNumber(draft.date),
  prompts: draft.slots.filter(isUsed).map((slot) => ({
    ...slotPrompt(slot),
    answers: slotAnswers(slot),
  })),
});

/**
 * An existing puzzle, back into the editor to change it. Prompts come in as
 * free text (their template isn't stored); level-5 answers become CR picks.
 */
export function fromPuzzle(puzzle: Puzzle): EditorDraft {
  const slots = puzzle.prompts.slice(0, SLOT_COUNT).map((prompt): SlotDraft => ({
    templateId: 'free',
    values: { text: prompt.text },
    rows: prompt.answers.map((a) => ({
      animalId: a.animalId,
      level: a.level === TOP_LEVEL ? 4 : (a.level as AnswerRow['level']),
      include: true,
      manual: true,
    })),
    cr: prompt.answers.filter((a) => a.level === TOP_LEVEL).map((a) => a.animalId),
  }));
  while (slots.length < SLOT_COUNT) slots.push(emptySlot());
  return { date: puzzle.date, slots };
}

/** How many included answers sit at each level 1..5. */
export function levelCounts(
  answers: readonly { level: AnswerLevel }[],
): Record<AnswerLevel, number> {
  const counts: Record<AnswerLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
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
