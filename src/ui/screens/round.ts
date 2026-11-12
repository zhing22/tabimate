import { MAX_INPUT_LENGTH, TIMER_WARN_MS } from '@/config/game';
import type { Prompt } from '@/core/types';
import { timerRing, type TimerRing } from '../components/timerRing';
import { focus, h } from '../dom';
import type { FrameLoop } from '../frames';
import type { Unmount } from '../host';

export interface RoundProps {
  readonly index: number;
  readonly total: number;
  readonly prompt: Prompt;
  readonly endsAt: number;
}

export interface RoundSetup {
  readonly totalMs: number;
  readonly now: () => number;
  readonly frames?: FrameLoop;
}

export interface RoundActions {
  submit(text: string): void;
  /** Enter pressed while locked (the reveal is up): move on. */
  next(): void;
  /** The text in the box changed (it is submitted as it stands if time runs out). */
  draft(text: string): void;
}

/**
 * The prompt screen. Unlike the other screens it stays mounted for the whole
 * run and is told about each new round: on iOS only a tap can open the
 * keyboard, so keeping one input focused keeps the keyboard up between rounds.
 */
export interface RoundScreen {
  setRound(props: RoundProps): void;
  /** While a reveal shows: input kept (and focused) but read-only, timer held. */
  lock(): void;
  /** The guess matched nothing: say so, keep the text and focus for another try. */
  reject(): void;
  unmount: Unmount;
}

const NOT_FOUND = "Not on today's list. Try another animal.";

interface RoundView {
  readonly card: HTMLElement;
  readonly step: HTMLElement;
  readonly question: HTMLElement;
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly go: HTMLButtonElement;
  readonly error: HTMLElement;
  readonly ring: TimerRing;
}

function buildRound(first: RoundProps, setup: RoundSetup): RoundView {
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
    'aria-describedby': 'round-prompt answer-error',
  });
  // role=alert: read out as soon as it appears, without moving focus.
  const error = h(
    'p',
    { id: 'answer-error', class: 'answer__error', role: 'alert', hidden: true },
    NOT_FOUND,
  );
  const go = h('button', { class: 'button button--primary', type: 'submit' }, 'Go');
  const form = h(
    'form',
    { class: 'answer', autocomplete: 'off' },
    h('label', { for: 'answer', class: 'answer__label' }, 'Your animal'),
    h('div', { class: 'answer__row' }, input, go),
    error,
  );
  const ring = timerRing({
    endsAt: first.endsAt,
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
  return { card, step, question, form, input, go, error, ring };
}

export function mountRound(
  root: HTMLElement,
  first: RoundProps,
  setup: RoundSetup,
  actions: RoundActions,
): RoundScreen {
  const { card, step, question, form, input, go, error, ring } = buildRound(first, setup);
  const showError = (shown: boolean) => {
    error.hidden = !shown;
    input.setAttribute('aria-invalid', String(shown));
  };

  let locked = false;
  const empty = () => input.value.trim() === '';
  const refresh = () => {
    go.disabled = locked || empty();
  };
  input.addEventListener('input', () => {
    showError(false);
    refresh();
    actions.draft(input.value);
  });
  // While locked the Go button is disabled, so Enter would not submit the form.
  // The box keeps focus during the reveal, so Enter (or "go" on a phone) moves on.
  input.addEventListener('keydown', (event) => {
    if (!locked || event.key !== 'Enter') return;
    event.preventDefault();
    actions.next();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    // An accidental Enter on an empty box must not throw the round away.
    if (!locked && !empty()) actions.submit(input.value);
  });
  root.append(card);

  const setRound = (props: RoundProps) => {
    step.textContent = `Prompt ${props.index + 1} of ${props.total}`;
    question.textContent = props.prompt.text;
    ring.setEndsAt(props.endsAt);
    locked = false;
    input.readOnly = false;
    input.value = '';
    showError(false);
    refresh();
    focus(input);
  };
  setRound(first);

  return {
    setRound,
    lock() {
      locked = true;
      input.readOnly = true; // readOnly, not disabled: disabling would drop focus and the keyboard
      ring.freeze();
      refresh();
    },
    reject() {
      // The text stays, so a near miss can be fixed rather than retyped.
      // Cleared and set again, so a screen reader repeats it on every miss.
      error.textContent = '';
      showError(true);
      error.textContent = NOT_FOUND;
      focus(input);
    },
    unmount: () => ring.destroy(),
  };
}
