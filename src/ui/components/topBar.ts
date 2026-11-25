import { LEVELS, type LevelId } from '@/config/levels';
import { h } from '../dom';
import { pixelSvg } from './pixelArt';
import { FOOTPRINT_ICON } from './pixelIcons';
import { wordmark } from './wordmark';

export interface TopBar {
  readonly el: HTMLElement;
  /** Answered prompts' levels so far, and the prompt in play (null: none, e.g. a reveal). */
  set(levels: readonly LevelId[], current: number | null): void;
}

/**
 * The compact bar over a prompt and its reveal: "Tabimate #21" and a
 * footprint per prompt, each answered one in its level's colour, the
 * current one outlined. Visual only: the round says "Prompt 2 of 7" to
 * screen readers itself.
 */
export function topBar(puzzleNumber: number, total: number): TopBar {
  const prints = Array.from({ length: total }, () =>
    h('span', { class: 'footprint' }, pixelSvg(FOOTPRINT_ICON, 'footprint__art')),
  );
  const el = h(
    'div',
    { class: 'top-bar' },
    wordmark('sm', `#${puzzleNumber}`),
    h('span', { class: 'top-bar__prints', 'aria-hidden': 'true' }, ...prints),
  );
  return {
    el,
    set(levels, current) {
      prints.forEach((print, i) => {
        const level = levels[i];
        print.classList.toggle('footprint--done', level !== undefined);
        print.classList.toggle('footprint--current', i === current);
        if (level === undefined) print.style.removeProperty('color');
        else print.style.color = `var(${LEVELS[level].colour})`;
      });
    },
  };
}
