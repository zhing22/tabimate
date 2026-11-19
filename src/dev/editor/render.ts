// Draws the whole editor from the draft: the day line, the slots, and the side
// panel. Cheap enough to redo on every change (7 slots, a few hundred rows).
import { maxCRFor, themeFor, WEEKDAY_NAMES, weekdayOf } from '@/config/themes';
import { puzzleNumber, shiftKey } from '@/core/date';
import { h } from '@/ui/dom';
import { checkPuzzle } from './check';
import { slotPrompt, toPuzzleJson } from './puzzleFile';
import { checkList, levelTable } from './sidePanel';
import { slotCard, type SlotActions } from './slotCard';
import { recentUses } from './stats';
import type { EditorData } from './store';
import type { EditorDraft } from './types';

const RECENT_DAYS = 30;

const $ = (selector: string) => document.querySelector<HTMLElement>(selector)!;

/** "Puzzle #20, Wednesday: no theme yet (one CR per prompt)". */
export function dayLine(draft: EditorDraft, data: EditorData): string {
  const theme = themeFor(draft.date);
  const maxCR = maxCRFor(draft.date);
  const rules = theme
    ? `${theme.name} (up to ${maxCR} CR per prompt)`
    : 'no theme yet (one CR per prompt)';
  const exists = data.puzzles.has(draft.date) ? ' · a file exists for this day' : '';
  return `Puzzle #${puzzleNumber(draft.date)}, ${WEEKDAY_NAMES[weekdayOf(draft.date)]}: ${rules}${exists}`;
}

function testSlotOptions(draft: EditorDraft, select: HTMLSelectElement) {
  const chosen = select.value;
  select.replaceChildren(
    ...draft.slots.map((s, i) =>
      h(
        'option',
        { value: String(i), selected: String(i) === chosen },
        `P${i + 1}: ${slotPrompt(s).text || '(empty)'}`,
      ),
    ),
  );
}

export function renderEditor(draft: EditorDraft, data: EditorData, actions: SlotActions): void {
  const maxCR = maxCRFor(draft.date);
  const from = shiftKey(draft.date, -RECENT_DAYS);
  const recent = [...data.puzzles.values()].filter((p) => p.date < draft.date && p.date >= from);
  $('#day').textContent = dayLine(draft, data);
  $('#slots').replaceChildren(
    ...draft.slots.map((slot, i) =>
      slotCard(
        i,
        slot,
        { animals: data.animals, maxCR, recent: recentUses(slotPrompt(slot), recent) },
        actions,
      ),
    ),
  );
  $('#counts').replaceChildren(levelTable(draft.slots));
  $('#checks').replaceChildren(checkList(checkPuzzle(toPuzzleJson(draft), data.animals)));
  testSlotOptions(draft, document.querySelector<HTMLSelectElement>('#test-slot')!);
}
