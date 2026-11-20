import { BONUS } from '@/config/bonus';
import type { BonusItem, BonusResult } from '@/core/types';
import { timerRing } from '../components/timerRing';
import { focus, h } from '../dom';
import type { FrameLoop } from '../frames';
import type { Screen } from '../host';

/** What the bonus quiz shows: its intro, a question, or the answer to one. */
export type BonusView =
  | { readonly kind: 'intro'; readonly total: number }
  | {
      readonly kind: 'question';
      readonly index: number;
      readonly total: number;
      readonly item: BonusItem;
      readonly endsAt: number;
    }
  | {
      readonly kind: 'answered';
      readonly index: number;
      readonly total: number;
      readonly item: BonusItem;
      readonly result: BonusResult;
    };

export interface BonusProps {
  readonly view: BonusView;
  readonly now: () => number;
  readonly frames?: FrameLoop | undefined;
}

export interface BonusActions {
  answer(value: boolean): void;
  /** From the intro or an answer: to the next question, or the results. */
  next(): void;
}

const counter = (index: number, total: number) =>
  h('p', { class: 'meta' }, `Bonus question ${index + 1} of ${total}`);

/** What the player hears and sees after answering. */
export function verdict(result: BonusResult, item: BonusItem): string {
  if (result.answer === null) return `Time's up. It's ${item.answer ? 'true' : 'false'}.`;
  return result.correct ? 'Right!' : `Not quite: it's ${item.answer ? 'true' : 'false'}.`;
}

function intro(total: number, next: HTMLButtonElement): HTMLElement[] {
  const step = Math.round(BONUS.step * 10) / 10;
  return [
    h('h1', { class: 'title title--sm' }, 'Bonus quiz'),
    h(
      'p',
      {},
      `${total} true-or-false questions, ${BONUS.questionMs / 1000} seconds each. ` +
        `Each right answer adds ×${step} to today's total.`,
    ),
    next,
  ];
}

function question(
  view: Extract<BonusView, { kind: 'question' }>,
  props: BonusProps,
  actions: BonusActions,
) {
  const ring = timerRing({
    endsAt: view.endsAt,
    totalMs: BONUS.questionMs,
    now: props.now,
    warnAtMs: 3_000,
    ...(props.frames ? { frames: props.frames } : {}),
  });
  const choice = (value: boolean) => {
    const button = h(
      'button',
      { class: `button bonus__choice bonus__choice--${String(value)}`, type: 'button' },
      value ? 'True' : 'False',
    );
    button.addEventListener('click', () => actions.answer(value));
    return button;
  };
  const buttons = [choice(true), choice(false)];
  const el = [
    h('div', { class: 'bonus__head' }, counter(view.index, view.total), ring.el),
    h('p', { class: 'bonus__statement', id: 'bonus-statement' }, view.item.statement),
    h(
      'div',
      { class: 'bonus__choices', role: 'group', 'aria-labelledby': 'bonus-statement' },
      ...buttons,
    ),
  ];
  return { el, first: buttons[0]!, destroy: () => ring.destroy() };
}

/**
 * The Sunday bonus quiz, one card per step: an intro, then each question with
 * a ring and two big buttons, then its answer and explanation.
 */
export const bonusScreen: Screen<BonusProps, BonusActions> = (root, props, actions) => {
  const { view } = props;
  const next = h('button', { class: 'button button--primary', type: 'button' });
  next.addEventListener('click', () => actions.next());
  let destroy = () => {};
  let content: HTMLElement[];
  let focusOn: HTMLElement = next;
  if (view.kind === 'intro') {
    next.textContent = 'Start';
    content = intro(view.total, next);
  } else if (view.kind === 'question') {
    const q = question(view, props, actions);
    ({ el: content, first: focusOn, destroy } = q);
  } else {
    const last = view.index === view.total - 1;
    next.textContent = last ? 'See results' : 'Next question';
    content = [
      counter(view.index, view.total),
      h('p', { class: 'bonus__statement' }, view.item.statement),
      h(
        'p',
        {
          class: view.result.correct ? 'bonus__verdict bonus__verdict--right' : 'bonus__verdict',
          role: 'status',
        },
        verdict(view.result, view.item),
      ),
      h('p', { class: 'bonus__explanation' }, view.item.explanation),
      next,
    ];
  }
  root.append(
    h('section', { class: 'card card--journal bonus', 'aria-label': 'Bonus quiz' }, ...content),
  );
  focus(focusOn);
  return () => destroy();
};
