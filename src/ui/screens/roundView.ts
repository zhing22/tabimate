import { MAX_INPUT_LENGTH, TIMER_AMBER_MS, TIMER_WARN_MS } from '@/config/game';
import { card } from '../components/card';
import { timerRing, type TimerRing } from '../components/timerRing';
import { topBar, type TopBar } from '../components/topBar';
import { h } from '../dom';
import type { FrameLoop } from '../frames';

export interface RoundSetup {
  /** For the top bar: "Tabimate #21" and a footprint per prompt. */
  readonly puzzleNumber: number;
  readonly promptCount: number;
  readonly totalMs: number;
  readonly now: () => number;
  readonly frames?: FrameLoop;
}

/** The one line under the answer box. Short enough to fit a 320 px phone. */
export const NOT_FOUND = "Not on today's list. Try again.";
export const DID_YOU_MEAN = 'Did you mean this? Press Go to answer.';

/** The empty box's hint: in portrait the keyboard waits for a tap; elsewhere the box has focus. */
export const TAP_TO_ANSWER = 'Tap to answer';
export const TYPE_AN_ANIMAL = 'Type an animal';

export interface RoundView {
  readonly card: HTMLElement;
  readonly step: HTMLElement;
  readonly question: HTMLElement;
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly go: HTMLButtonElement;
  readonly note: HTMLElement;
  readonly ring: TimerRing;
  readonly bar: TopBar;
}

/** The round card's elements, built once; mountRound wires up what they do. */
export function buildRound(firstEndsAt: number, setup: RoundSetup): RoundView {
  // Read out, not shown: the footprints in the top bar show it.
  const step = h('p', { class: 'round__step sr-only' });
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
    amberAtMs: TIMER_AMBER_MS,
    ...(setup.frames ? { frames: setup.frames } : {}),
  });
  // The question scrolls if it must; the answer box and Go stay in the footer.
  const bar = topBar(setup.puzzleNumber, setup.promptCount);
  const shown = card({
    className: 'round',
    title: bar.el,
    labelledBy: 'round-prompt',
    tools: [ring.el],
    body: [step, question],
    footer: [form],
  });
  return { card: shown.el, step, question, form, input, go, note, ring, bar };
}
