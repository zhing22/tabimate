// The reveal card's parts (screens/reveal.ts runs its beats).
import { isShiny, LEVELS, TOP_LEVEL } from '@/config/levels';
import { UI_SPRITE_SCALE } from '@/config/ui';
import type { RoundResult } from '@/core/types';
import { card } from '../components/card';
import { levelBadge } from '../components/levelBadge';
import { portrait } from '../components/portrait';
import { topBar } from '../components/topBar';
import { h } from '../dom';
import type { RevealProps } from './reveal';

/** The one level badge; a top-level find says "Jackpot!" inside it, in gold (reveal.css). */
function badge(level: RoundResult['match']['level']): HTMLElement {
  const el = levelBadge(level, { size: 'lg' }).el;
  if (level === TOP_LEVEL) {
    el.classList.add('level-badge--jackpot');
    el.prepend(h('span', { class: 'level-badge__jackpot' }, 'Jackpot!'), ' ');
  }
  return h('div', { class: 'reveal__badge' }, el);
}

/** The card: a drum-roll line, then the picture, name, badge, extras and points; Next in the footer. */
export function revealCard(
  props: RevealProps,
  pointsEl: HTMLElement,
  next: HTMLElement,
): HTMLElement {
  const { animal } = props;
  const level = props.result.match.level;
  const bar = props.bar && topBar(props.bar.puzzleNumber, props.bar.total);
  bar?.set(props.bar?.levels ?? [], null);
  const shown = card({
    className: 'reveal reveal--pending',
    label: 'Result',
    ...(bar ? { title: bar.el } : {}),
    body: [
      h('p', { class: 'reveal__suspense', 'aria-hidden': 'true' }, '. . .'),
      h(
        'div',
        { class: 'reveal__body' },
        revealPicture(props),
        h('p', { class: 'reveal__name' }, animal?.display ?? "Time's up"),
        badge(level),
        props.extras?.length ? h('div', { class: 'reveal__extras' }, ...props.extras) : null,
        pointsEl,
      ),
    ],
    footer: [next],
  });
  shown.el.dataset['level'] = String(level);
  // Styled by effect, not level number, so LEVELS decides which level is shiny.
  shown.el.dataset['effect'] = LEVELS[level].effectId;
  shown.el.style.setProperty('--reveal-level', `var(${LEVELS[level].colour})`);
  shown.el.style.setProperty('--reveal-badge-ms', `${props.timing.badgePopMs}ms`);
  return shown.el;
}

/**
 * The animal's sprite walking (shiny at the shiny level), or a paw print or
 * puff for a miss; a first-ever find wears a small "New" ribbon.
 */
function revealPicture({ animal, result, portraits, isNew }: RevealProps): HTMLElement {
  const level = result.match.level;
  const picture = h(
    'div',
    { class: 'reveal__emoji', 'aria-hidden': 'true' },
    animal
      ? portrait(animal, isShiny(level), {
          scale: UI_SPRITE_SCALE.reveal,
          portraits,
          walking: true,
        })
      : level
        ? '🐾'
        : '💨',
  );
  const ribbon =
    isNew && level !== 0
      ? h(
          'span',
          { class: 'reveal__ribbon' },
          'New',
          h('span', { class: 'sr-only' }, ' to your journal'),
        )
      : null;
  return h('div', { class: 'reveal__picture' }, picture, ribbon);
}
