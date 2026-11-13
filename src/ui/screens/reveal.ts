import { revealBuildUpMs, type RevealTiming } from '@/config/game';
import { TIERS } from '@/config/tiers';
import type { Animal, RoundResult } from '@/core/types';
import { tierBadge } from '../components/tierBadge';
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
  /**
   * Move focus to the button once shown. Only when no answer box is on screen
   * (a reload mid-reveal); otherwise the box keeps focus and Enter moves on.
   */
  readonly focusNext: boolean;
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
  if (match.tier === 0) {
    // A miss only reaches a reveal when time runs out (other misses can be retried).
    return match.input === ''
      ? "Time's up. No match."
      : `Time's up. No match for "${match.input}".`;
  }
  return `${animal?.display ?? match.animalId}: ${TIERS[match.tier].name}, ${points} points.`;
}

/**
 * Inside the reveal, so it only appears once the tier is shown. Pressing it
 * must not take focus from the answer box: on a phone that would close the
 * keyboard, and the next prompt wants it open.
 */
function nextButton(isLast: boolean, next: () => void): HTMLButtonElement {
  const button = h(
    'button',
    { class: 'button button--primary reveal__next', type: 'button' },
    isLast ? 'See results' : 'Next prompt',
  );
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', next);
  return button;
}

/**
 * Shown as an overlay above the round, so the answer box keeps focus (and the
 * phone keeps its keyboard). Focus is not moved; the live region speaks instead.
 *
 * Three beats: a drum-roll (longer for rarer tiers), the tier badge popping in
 * with an overshoot, then the name, points and Next button.
 */
export const revealScreen: Screen<RevealProps, RevealActions> = (root, props, actions) => {
  const { result, animal, points } = props;
  const tier = result.match.tier;
  const next = nextButton(props.isLast, () => actions.next());
  const card = h(
    'section',
    {
      class: 'card reveal reveal--pending',
      'data-tier': tier,
      // Styled by effect, not tier number, so TIERS decides which tier is shiny.
      'data-effect': TIERS[tier].effectId,
      style: `--reveal-tier: var(${TIERS[tier].colour}); --reveal-badge-ms: ${props.timing.badgePopMs}ms`,
      'aria-label': 'Result',
    },
    h('p', { class: 'reveal__suspense', 'aria-hidden': 'true' }, '. . .'),
    h(
      'div',
      { class: 'reveal__body' },
      h(
        'p',
        { class: 'reveal__emoji', 'aria-hidden': 'true' },
        animal?.emoji ?? (tier ? '🐾' : '💨'),
      ),
      h('p', { class: 'reveal__name' }, animal?.display ?? "Time's up"),
      h('div', { class: 'reveal__badge' }, tierBadge(tier, { size: 'lg' }).el),
      h('p', { class: 'reveal__points' }, tier ? `+${points}` : '+0'),
      next,
    ),
  );
  root.append(card);

  const timers: ReturnType<typeof setTimeout>[] = [];
  const after = (ms: number, step: () => void) => {
    if (ms <= 0) step();
    else timers.push(setTimeout(step, ms));
  };
  const showName = () => {
    card.classList.replace('reveal--badge', 'reveal--named');
    actions.revealed(describeResult(result, animal, points));
    if (props.focusNext) focus(next);
  };
  const showBadge = () => {
    card.classList.replace('reveal--pending', 'reveal--badge');
    after(props.timing.nameDelayMs, showName);
  };
  after(revealBuildUpMs(tier, props.timing), showBadge);
  return () => timers.forEach(clearTimeout);
};
