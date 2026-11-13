import type { Prompt } from '@/core/types';
import { focus } from '../dom';
import type { Unmount } from '../host';
import { buildRound, DID_YOU_MEAN, NOT_FOUND, type RoundSetup } from './roundView';

export type { RoundSetup } from './roundView';

export interface RoundProps {
  readonly index: number;
  readonly total: number;
  readonly prompt: Prompt;
  readonly endsAt: number;
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
  /** The guess was close: put the right name in the box, ready to send or retype. */
  suggest(name: string): void;
  unmount: Unmount;
}

type Note = 'error' | 'hint';

export function mountRound(
  root: HTMLElement,
  first: RoundProps,
  setup: RoundSetup,
  actions: RoundActions,
): RoundScreen {
  const { card, step, question, form, input, go, note, ring } = buildRound(first.endsAt, setup);
  const showNote = (kind: Note | null, text = '') => {
    note.hidden = kind === null;
    note.dataset['kind'] = kind ?? '';
    input.dataset['note'] = kind ?? '';
    input.setAttribute('aria-invalid', String(kind === 'error'));
    note.textContent = text;
  };

  let locked = false;
  const empty = () => input.value.trim() === '';
  const refresh = () => {
    go.disabled = locked || empty();
  };
  input.addEventListener('input', () => {
    showNote(null);
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
    showNote(null);
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
      // The text stays, so it can be fixed rather than retyped.
      showNote('error', NOT_FOUND);
      focus(input);
    },
    suggest(name) {
      input.value = name;
      actions.draft(name); // no input event for a value set in code
      refresh();
      showNote('hint', DID_YOU_MEAN);
      focus(input);
      // Selected, so typing replaces it at once; Go or Enter sends it as is.
      input.select();
    },
    unmount: () => ring.destroy(),
  };
}
