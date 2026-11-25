import { h } from '../dom';

/** "Fishy Friday · Puzzle #21", or "Puzzle #21" on a plain day (start and loading). */
export function themeChip(puzzleNumber: number, themeName: string | null): HTMLElement {
  return h(
    'p',
    { class: 'theme-chip' },
    themeName ? h('strong', { class: 'theme-chip__name' }, themeName) : null,
    themeName ? ' · ' : null,
    `Puzzle #${puzzleNumber}`,
  );
}
