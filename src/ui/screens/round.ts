import type { LevelId } from '@/config/levels';
import type { Prompt } from '@/core/types';
import { focus } from '../dom';
import type { Unmount } from '../host';
import { currentLayout, setTyping } from '../layout/shell';
import {
  buildRound,
  DID_YOU_MEAN,
  NOT_FOUND,
  TAP_TO_ANSWER,
  TYPE_AN_ANIMAL,
  type RoundSetup,
} from './roundView';

export type { RoundSetup } from './roundView';

export interface RoundProps {
  readonly index: number;
  readonly total: number;
  readonly prompt: Prompt;
  readonly endsAt: number;
  /** The levels of the prompts answered so far, in order (the top bar's footprints). */
  readonly levels: readonly LevelId[];
}

export interface RoundActions {
  submit(text: string): void;
  /** Enter pressed while locked (the reveal is up): move on. */
  next(): void;
  /** The text in the box changed (it is submitted as it stands if time runs out). */
  draft(text: string): void;
  /** The player is ready (the box has focus): the round's countdown starts. */
  begin(): void;
}

/**
 * The prompt screen. Unlike the other screens it stays mounted for the whole
 * run and is told about each new round.
 *
 * Focus differs by layout. Landscape and desktop: the box takes focus each
 * round and keeps it through the reveal (Enter moves on). Portrait (a phone
 * upright): the box is never focused for the player; it says "Tap to answer",
 * and while it has focus the stage slides away (html.is-typing) so the sheet
 * gets the space above the keyboard. A scored answer or time-up blurs it, so
 * the keyboard closes and the stage comes back for the reveal. Either way the
 * countdown starts when the box first takes focus (or after the start grace).
 */
export interface RoundScreen {
  setRound(props: RoundProps): void;
  /** The countdown started (the box took focus): its new deadline. */
  timerStarted(endsAt: number): void;
  /** While a reveal shows: input read-only, timer held; in portrait the box lets go of focus. */
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
  const { card, step, question, form, input, go, note, ring, bar } = buildRound(
    first.endsAt,
    setup,
  );
  const showNote = (kind: Note | null, text = '') => {
    note.hidden = kind === null;
    note.dataset['kind'] = kind ?? '';
    input.dataset['note'] = kind ?? '';
    input.setAttribute('aria-invalid', String(kind === 'error'));
    note.textContent = text;
  };

  const doc = root.ownerDocument;
  const portrait = () => currentLayout(doc) === 'portrait';
  const typing = (on: boolean) => setTyping(on, doc);
  let locked = false;
  const empty = () => input.value.trim() === '';
  input.addEventListener('focus', () => {
    typing(true);
    if (!locked) actions.begin();
  });
  input.addEventListener('blur', () => typing(false));
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
    bar.set(props.levels, props.index);
    question.textContent = props.prompt.text;
    ring.setEndsAt(props.endsAt);
    locked = false;
    input.readOnly = false;
    input.value = '';
    showNote(null);
    refresh();
    input.placeholder = portrait() ? TAP_TO_ANSWER : TYPE_AN_ANIMAL;
    if (portrait()) return;
    focus(input);
    // Still focused from the last round (no focus event): ready all the same.
    if (doc.activeElement === input) actions.begin();
  };
  setRound(first);

  return {
    setRound,
    timerStarted: (endsAt) => ring.setEndsAt(endsAt),
    lock() {
      locked = true;
      input.readOnly = true; // readOnly, not disabled: disabling would drop focus (landscape keeps it)
      ring.freeze();
      refresh();
      if (portrait()) input.blur(); // the keyboard closes; the stage comes back for the reveal
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
    unmount() {
      ring.destroy();
      typing(false);
    },
  };
}
