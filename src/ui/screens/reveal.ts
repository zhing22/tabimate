import { revealBuildUpMs, revealNameMs, type RevealTiming } from '@/config/game';
import { isShiny, LEVELS, TOP_LEVEL } from '@/config/levels';
import { UI_SPRITE_SCALE } from '@/config/ui';
import type { Portraits } from '@/core/portrait';
import type { Animal, RoundResult } from '@/core/types';
import { card } from '../components/card';
import { countUp } from '../components/countUp';
import { levelBadge } from '../components/levelBadge';
import { portrait } from '../components/portrait';
import { focus, h } from '../dom';
import type { Screen } from '../host';

export interface RevealProps {
  readonly result: RoundResult;
  readonly animal: Animal | null;
  readonly points: number;
  /** The drum-roll, badge and name beats (config REVEAL_TIMING; INSTANT_REVEAL in tests). */
  readonly timing: RevealTiming;
  /** The last prompt: the button leads to the results instead. */
  readonly isLast: boolean;
  /** The last prompt's button text: "See results", or "Bonus quiz" on a quiz day. */
  readonly lastLabel?: string;
  /**
   * Move focus to the button once shown. Only when no answer box is on screen
   * (a reload mid-reveal); otherwise the box keeps focus and Enter moves on.
   */
  readonly focusNext: boolean;
  /** Lines under the name (ui/reveal/extras.ts): the fact, the near-miss hint. */
  readonly extras?: readonly HTMLElement[];
  /** A first-ever find (in neither the Field Journal nor earlier answers today): a "New" ribbon on the sprite. */
  readonly isNew?: boolean;
  /** The animal's sprite (walking; shiny at the shiny level), else its emoji. */
  readonly portraits?: Portraits | undefined;
}

export interface RevealActions {
  /** Called once the name is shown, with a sentence for screen readers. */
  revealed(summary: string): void;
  /** The player wants to move on. */
  next(): void;
}

/** What to say about a result, for the screen and for screen readers. */
export function describeResult(result: RoundResult, animal: Animal | null, points: number): string {
  const { match } = result;
  if (match.level === 0) {
    // A miss only reaches a reveal when time runs out (other misses can be retried).
    return match.input === ''
      ? "Time's up. No match."
      : `Time's up. No match for "${match.input}".`;
  }
  return `${animal?.display ?? match.animalId}: ${LEVELS[match.level].name}, ${points} points.`;
}

/**
 * Inside the reveal, so it only appears once the level is shown. Pressing it
 * must not take focus from the answer box: on a phone that would close the
 * keyboard, and the next prompt wants it open.
 */
function nextButton(label: string, next: () => void): HTMLButtonElement {
  const button = h(
    'button',
    { class: 'button button--primary reveal__next', type: 'button' },
    label,
  );
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', next);
  return button;
}

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
function revealCard(props: RevealProps, pointsEl: HTMLElement, next: HTMLElement): HTMLElement {
  const { animal } = props;
  const level = props.result.match.level;
  const shown = card({
    className: 'reveal reveal--pending',
    label: 'Result',
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

/** Steps run after a delay (at once for none), all cancelled together. */
function timeline() {
  const timers: ReturnType<typeof setTimeout>[] = [];
  return {
    after: (ms: number, step: () => void) => {
      if (ms <= 0) step();
      else timers.push(setTimeout(step, ms));
    },
    clear: () => timers.forEach(clearTimeout),
  };
}

/**
 * Shown as an overlay above the round, so the answer box keeps focus (and the
 * phone keeps its keyboard). Focus is not moved; the live region speaks instead.
 *
 * Three beats: a drum-roll (longer for rarer levels), the level badge popping in
 * with an overshoot, then the name, points and Next button.
 */
export const revealScreen: Screen<RevealProps, RevealActions> = (root, props, actions) => {
  const { result, animal, points } = props;
  const level = result.match.level;
  const next = nextButton(props.isLast ? (props.lastLabel ?? 'See results') : 'Next prompt', () =>
    actions.next(),
  );
  const pointsEl = h('p', { class: 'reveal__points' }, `+${level ? points : 0}`);
  let stopCount = () => {};
  const card = revealCard(props, pointsEl, next);
  root.append(card);

  const { after, clear } = timeline();
  const showName = () => {
    card.classList.replace('reveal--badge', 'reveal--named');
    // A top-level find lands with a gold flash (reveal.css), after its freeze.
    if (level === TOP_LEVEL) card.classList.add('reveal--jackpot');
    stopCount = countUp(pointsEl, level ? points : 0, props.timing.countUpMs);
    actions.revealed(describeResult(result, animal, points));
    if (props.focusNext) focus(next);
  };
  const showBadge = () => {
    card.classList.replace('reveal--pending', 'reveal--badge');
    // The name's delay after the badge, plus the jackpot freeze for a top-level find.
    after(revealNameMs(level, props.timing) - revealBuildUpMs(level, props.timing), showName);
  };
  after(revealBuildUpMs(level, props.timing), showBadge);
  return () => {
    clear();
    stopCount();
  };
};
