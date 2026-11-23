import { RESULTS_LIST } from '@/config/game';
import { h } from '../dom';
import { answerRow, type AnswerLine } from './answerRow';
import type { Component } from './component';

export interface AnswerListOptions {
  /** The question it answers, e.g. "Q3": names the region and search box, and prefixes ids. */
  readonly question: string;
  /** How many players picked an answer, as a percentage; null hides it. Read as rows render. */
  readonly share?: (animalId: string) => number | null;
}

export interface AnswerList extends Component {
  /** Scrolls the player's answer into the middle of the box. Call once it is visible. */
  readonly reveal: () => void;
  /** Draws the rows again, e.g. once player shares arrive. */
  readonly refresh: () => void;
}

/** Lowercase without accents, so "kakapo" finds "Kākāpō". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Arrow keys, Home and End move between the rows' buttons; Enter opens one. */
function moveFocus(list: HTMLElement, event: KeyboardEvent) {
  const buttons = [...list.querySelectorAll<HTMLButtonElement>('.answer__row')];
  const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const to = (
    {
      ArrowDown: Math.min(at + 1, buttons.length - 1),
      ArrowUp: Math.max(at - 1, 0),
      Home: 0,
      End: buttons.length - 1,
    } as Record<string, number>
  )[event.key];
  if (to === undefined || at === -1) return;
  event.preventDefault();
  buttons[to]?.focus();
}

/**
 * Every answer a prompt accepted, rarest first, in a small scroll box: how
 * many there are, a search box for long lists, and rows that open to a
 * description. Rows are rendered RESULTS_LIST.renderWindow at a time.
 */
export function answerList(answers: readonly AnswerLine[], options: AnswerListOptions): AnswerList {
  const list = h('ul', { class: 'answer-list__rows' });
  const box = h('div', { class: 'answer-list__box' }, list);
  const ids = new Map(answers.map((a, i) => [a, `${options.question.toLowerCase()}-answer-${i}`]));
  let shown: readonly AnswerLine[] = answers;
  let rendered = 0;

  const renderUpTo = (count: number) => {
    const end = Math.min(count, shown.length);
    for (; rendered < end; rendered++) {
      const answer = shown[rendered]!;
      list.append(answerRow(answer, ids.get(answer)!, options.share?.(answer.animalId) ?? null));
    }
  };
  const show = (items: readonly AnswerLine[]) => {
    shown = items;
    rendered = 0;
    list.replaceChildren();
    if (items.length === 0)
      list.append(h('li', { class: 'answer-list__empty' }, 'No answers match.'));
    // The player's answer is always rendered, even past the first window.
    const picked = items.findIndex((a) => a.picked);
    renderUpTo(Math.max(RESULTS_LIST.renderWindow, picked + 1));
  };
  box.addEventListener('scroll', () => {
    if (box.scrollTop + box.clientHeight >= box.scrollHeight - 40) {
      renderUpTo(rendered + RESULTS_LIST.renderWindow);
    }
  });
  list.addEventListener('keydown', (event) => moveFocus(list, event));

  const search =
    answers.length > RESULTS_LIST.searchFrom
      ? h('input', {
          type: 'search',
          class: 'answer-list__search',
          placeholder: `Search ${answers.length} answers`,
          'aria-label': `Search the answers to ${options.question}`,
        })
      : null;
  search?.addEventListener('input', () => {
    const query = fold(search.value.trim());
    show(query ? answers.filter((a) => fold(a.name).includes(query)) : answers);
  });

  show(answers);
  const el = h(
    'section',
    { class: 'answer-list', role: 'region', 'aria-label': `All answers to ${options.question}` },
    h(
      'p',
      { class: 'answer-list__summary' },
      `${answers.length} possible ${answers.length === 1 ? 'answer' : 'answers'}`,
    ),
    search,
    box,
  );
  return {
    el,
    reveal: () => {
      const row = list.querySelector<HTMLElement>('.answer--picked');
      if (!row) return;
      // Within the box only: scrollIntoView would also scroll the page.
      box.scrollTop = row.offsetTop - (box.clientHeight - row.offsetHeight) / 2;
    },
    refresh: () => show(shown),
    destroy: () => {},
  };
}
