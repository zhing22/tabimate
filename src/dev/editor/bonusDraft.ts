// The bonus quiz in the editor's draft: empty questions to fill in, the file
// it saves, and the real validator's verdict on it.
import { BONUS } from '@/config/bonus';
import { themeFor } from '@/config/themes';
import type { BonusItem, DateKey } from '@/core/types';
import { validateBonus } from '@/data/validateBonus';
import type { BonusDraftItem, BonusJson, EditorDraft } from './types';

/** Whether this day ends with a bonus quiz (its theme says so). */
export const hasBonusQuiz = (date: DateKey): boolean => themeFor(date)?.bonusQuiz === true;

const emptyItem = (): BonusDraftItem => ({ statement: '', answer: null, explanation: '' });

/** The draft's questions, always BONUS.questions of them (blank until written). */
export const bonusItems = (draft: EditorDraft): readonly BonusDraftItem[] =>
  Array.from({ length: BONUS.questions }, (_, i) => draft.bonus?.[i] ?? emptyItem());

export const toBonusJson = (draft: EditorDraft): BonusJson => ({
  date: draft.date,
  items: bonusItems(draft).map((item) => ({ ...item })),
});

/** A saved quiz back into the draft (Import). */
export const fromBonus = (items: readonly BonusItem[]): BonusDraftItem[] =>
  items.map((item) => ({ ...item }));

/** What the validator says about the drafted quiz: null when it would save. */
export function checkBonus(draft: EditorDraft): string | null {
  try {
    validateBonus(toBonusJson(draft), `data/bonus/${draft.date}.json`, draft.date);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Words in an explanation, for the counter beside it. */
export const explanationWords = (text: string): number =>
  text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
