// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { BONUS } from '@/config/bonus';
import { bonusItems, checkBonus, hasBonusQuiz, toBonusJson } from './bonusDraft';
import { bonusPanel } from './bonusPanel';
import { saveBonus } from './exporting';
import { emptyDraft } from './puzzleFile';
import type { BonusDraftItem, EditorDraft } from './types';

const SUNDAY = '2026-11-29';
const good: BonusDraftItem[] = [1, 2, 3].map((i) => ({
  statement: `Statement ${i}`,
  answer: i !== 2,
  explanation: 'A short reason.',
}));
const draft = (bonus?: BonusDraftItem[]): EditorDraft => ({
  ...emptyDraft(SUNDAY),
  ...(bonus ? { bonus } : {}),
});

describe('the bonus quiz draft', () => {
  it('is offered on Sunday Deep Dive days only', () => {
    expect(hasBonusQuiz(SUNDAY)).toBe(true);
    expect(hasBonusQuiz('2026-11-28')).toBe(false);
  });

  it(`starts as ${BONUS.questions} blank questions the validator rejects`, () => {
    expect(bonusItems(draft())).toHaveLength(BONUS.questions);
    expect(checkBonus(draft())).toContain('items[0]');
    expect(checkBonus(draft([{ ...good[0]!, answer: null }, ...good.slice(1)]))).toMatch(/answer/);
  });

  it('writes the file validate-data reads, and passes once filled in', () => {
    expect(checkBonus(draft(good))).toBeNull();
    expect(toBonusJson(draft(good))).toEqual({ date: SUNDAY, items: good });
  });

  it('saves through the dev API route for bonus files', async () => {
    const fetchFn = vi.fn(() => Promise.resolve(Response.json({ message: 'saved' })));
    expect((await saveBonus(draft(good), fetchFn)).ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith(`/__dev/bonus/${SUNDAY}`, expect.anything());
  });
});

describe('the bonus panel', () => {
  it('edits a question and reports what the validator says', () => {
    const update = vi.fn();
    const panel = bonusPanel(draft(good), update);
    expect(panel.querySelectorAll('fieldset')).toHaveLength(BONUS.questions);
    expect(panel.textContent).toContain('passes the validator');
    const statement = panel.querySelector<HTMLInputElement>('fieldset input[type="text"]')!;
    statement.value = 'New statement';
    statement.dispatchEvent(new Event('change'));
    expect(update).toHaveBeenCalledWith([
      { ...good[0], statement: 'New statement' },
      good[1],
      good[2],
    ]);
  });
});
