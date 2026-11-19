// Converting between the editor's draft and the puzzle file the game reads.
import { MAX_PROMPTS_PER_PUZZLE } from '@/config/game';
import { TOP_LEVEL } from '@/config/levels';
import { puzzleNumber } from '@/core/date';
import type { DateKey, Puzzle } from '@/core/types';
import { fillText, promptIdFor, templateById } from './templates';
import type { EditorDraft, PuzzleJson, RowLevel, SlotDraft } from './types';

export const SLOT_COUNT = MAX_PROMPTS_PER_PUZZLE;

/** The level an imported CR answer gets in its dropdown: the one just below CR. */
const BELOW_TOP = (TOP_LEVEL - 1) as RowLevel;

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

/** A slot's answers as the puzzle file stores them: included rows, CR picks at the top level. */
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

/** The draft as a puzzle file. Unchecked here: run it through checkPuzzle. */
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
 * free text (their template isn't stored); top-level answers become CR picks.
 */
export function fromPuzzle(puzzle: Puzzle): EditorDraft {
  const slots = puzzle.prompts.slice(0, SLOT_COUNT).map((prompt): SlotDraft => ({
    templateId: 'free',
    values: { text: prompt.text },
    rows: prompt.answers.map((a) => ({
      animalId: a.animalId,
      level: a.level === TOP_LEVEL ? BELOW_TOP : a.level,
      include: true,
      manual: true,
    })),
    cr: prompt.answers.filter((a) => a.level === TOP_LEVEL).map((a) => a.animalId),
  }));
  while (slots.length < SLOT_COUNT) slots.push(emptySlot());
  return { date: puzzle.date, slots };
}
