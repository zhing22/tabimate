import { MAX_INPUT_LENGTH, TIMER_WARN_MS } from '@/config/game';
import { timerRing, type TimerRing } from '../components/timerRing';
import { h } from '../dom';
import type { FrameLoop } from '../frames';

export interface RoundSetup {
  readonly totalMs: number;
  readonly now: () => number;
  readonly frames?: FrameLoop;
}

/** The one line under the answer box. Short enough to fit a 320 px phone. */
export const NOT_FOUND = "Not on today's list. Try again.";
export const DID_YOU_MEAN = 'Did you mean this? Press Go to answer.';

export interface RoundView {
  readonly card: HTMLElement;
  readonly step: HTMLElement;
  readonly question: HTMLElement;
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly go: HTMLButtonElement;
  readonly note: HTMLElement;
  readonly ring: TimerRing;
}

/** The round card's elements, built once; mountRound wires up what they do. */
export function buildRound(firstEndsAt: number, setup: RoundSetup): RoundView {
  const step = h('p', { class: 'meta round__step' });
  const question = h('h2', { id: 'round-prompt', class: 'round__prompt' });
  const input = h('input', {
    id: 'answer',
    class: 'answer__input',
    type: 'text',
    maxlength: MAX_INPUT_LENGTH,
    autocomplete: 'off',
    autocapitalize: 'none',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'go',
    'aria-describedby': 'round-prompt answer-note',
  });
  // Not a live region: the app announces these through the host's live region,
  // which also re-reads a message that repeats (two misses in a row).
  const note = h('p', { id: 'answer-note', class: 'answer__note', hidden: true });
  const go = h('button', { class: 'button button--primary', type: 'submit' }, 'Go');
  const form = h(
    'form',
    { class: 'answer', autocomplete: 'off' },
    h('label', { for: 'answer', class: 'answer__label' }, 'Your animal'),
    h('div', { class: 'answer__row' }, input, go),
    note,
  );
  const ring = timerRing({
    endsAt: firstEndsAt,
    totalMs: setup.totalMs,
    now: setup.now,
    warnAtMs: TIMER_WARN_MS,
    ...(setup.frames ? { frames: setup.frames } : {}),
  });
  const card = h(
    'section',
    { class: 'card round', 'aria-labelledby': 'round-prompt' },
    h('header', { class: 'round__header' }, step, ring.el),
    question,
    form,
  );
  return { card, step, question, form, input, go, note, ring };
}
