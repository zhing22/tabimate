// The puzzle editor's draft state: what is autosaved, and what the views read.
import type { AnswerLevel, TopLevel } from '@/config/levels';
import type { AnimalId, DateKey } from '@/core/types';
import type { BlankValues } from './templates';

/** The levels a row's dropdown offers: everything below CR, which is picked separately. */
export type RowLevel = Exclude<AnswerLevel, TopLevel>;

/** One candidate answer in a slot's table. Its CR status is SlotDraft.cr, not its level. */
export interface AnswerRow {
  readonly animalId: AnimalId;
  readonly level: RowLevel;
  readonly include: boolean;
  /** Added by hand (or imported): kept when the template redrafts. */
  readonly manual?: boolean;
}

export interface SlotDraft {
  readonly templateId: string;
  readonly values: BlankValues;
  readonly rows: readonly AnswerRow[];
  /** The answers marked CR (the top level): one per prompt, or the theme's maxCR. */
  readonly cr: readonly AnimalId[];
}

export interface EditorDraft {
  readonly date: DateKey;
  readonly slots: readonly SlotDraft[];
}

/** A puzzle file as the editor writes it (the shape validatePuzzle reads). */
export interface PuzzleJson {
  readonly date: DateKey;
  readonly number: number;
  readonly prompts: readonly {
    readonly id: string;
    readonly text: string;
    readonly answers: readonly { readonly animalId: AnimalId; readonly level: AnswerLevel }[];
  }[];
}
