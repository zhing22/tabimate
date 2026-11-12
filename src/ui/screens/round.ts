import { MAX_INPUT_LENGTH } from '@/config/game';
import type { Prompt } from '@/core/types';
import { timerRing } from '../components/timerRing';
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
  unmount: Unmount;
}

export function mountRound(
  root: HTMLElement,
  first: RoundProps,
  setup: RoundSetup,
  actions: RoundActions,
): RoundScreen {
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
    'aria-describedby': 'round-prompt',
  });
  const go = h('button', { class: 'button button--primary', type: 'submit' }, 'Go');
  const form = h(
    'form',
    { class: 'answer', autocomplete: 'off' },
    h('label', { for: 'answer', class: 'answer__label' }, 'Your animal'),
    h('div', { class: 'answer__row' }, input, go),
  );
  const ring = timerRing({
    endsAt: first.endsAt,
    totalMs: setup.totalMs,
    now: setup.now,
    ...(setup.frames ? { frames: setup.frames } : {}),
  });

  let locked = false;
  const refresh = () => {
    go.disabled = locked || input.value.trim() === '';
  };
  input.addEventListener('input', refresh);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    // An accidental Enter on an empty box must not throw the round away.
    if (locked || input.value.trim() === '') return;
    actions.submit(input.value);
  });

  root.append(
    h(
      'section',
      { class: 'card round', 'aria-labelledby': 'round-prompt' },
      h('header', { class: 'round__header' }, step, ring.el),
      question,
      form,
    ),
  );

  const setRound = (props: RoundProps) => {
    step.textContent = `Prompt ${props.index + 1} of ${props.total}`;
    question.textContent = props.prompt.text;
    ring.setEndsAt(props.endsAt);
    locked = false;
    input.readOnly = false;
    input.value = '';
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
    unmount: () => ring.destroy(),
  };
}
