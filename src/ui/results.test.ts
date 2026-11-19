// @vitest-environment jsdom
// The results screen's team rows and answer lists (v2 Step 6).
import { describe, expect, it } from 'vitest';
import { RESULTS_LIST } from '@/config/game';
import type { AnswerLevel } from '@/config/levels';
import { ANIMALS } from '@/core/matcher/testFixtures';
import type { Animal, Prompt } from '@/core/types';
import { answerList } from './components/answerList';
import type { AnswerLine } from './components/answerRow';
import { teamCard, type TeamRound } from './components/teamCard';
import { answerLines } from './resultsProps';

const line = (i: number, extra: Partial<AnswerLine> = {}): AnswerLine => ({
  animalId: `a${i}`,
  name: `Animal ${i}`,
  kind: 'species',
  level: 2,
  points: 25,
  picked: false,
  ...extra,
});
/** n answers, rarest first like answerLines: one CR on top, then the rest. */
const answers = (n: number, pickedAt = -1): AnswerLine[] =>
  Array.from({ length: n }, (_, i) =>
    line(i, {
      ...(i === 0 ? { level: 5, points: 100 } : {}),
      picked: i === pickedAt,
    }),
  );
const rows = (el: HTMLElement) => [...el.querySelectorAll<HTMLLIElement>('.answer')];
const buttons = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>('.answer__row')];

describe('answerLines', () => {
  it('lists every answer rarest first, with what an opened row shows', () => {
    const lion: Animal = {
      ...ANIMALS.get('tiger')!,
      id: 'tiger',
      description: 'A big striped cat.',
      wiki: 'https://en.wikipedia.org/wiki/Tiger',
    };
    const animals = new Map([...ANIMALS, ['tiger', lion]]);
    const prompt: Prompt = {
      id: 'p',
      text: 'P',
      answers: [
        { animalId: 'penguin', level: 1 },
        { animalId: 'tiger', level: 4 },
      ],
    };
    expect(answerLines(prompt, animals, 'tiger')).toEqual([
      {
        animalId: 'tiger',
        name: 'Tiger',
        kind: 'species',
        level: 4,
        points: 85,
        picked: true,
        description: 'A big striped cat.',
        wiki: 'https://en.wikipedia.org/wiki/Tiger',
      },
      {
        animalId: 'penguin',
        name: 'Penguin',
        kind: 'group',
        level: 1,
        points: 10,
        picked: false,
        description: undefined,
        wiki: undefined,
      },
    ]);
  });
});

describe('answerList', () => {
  it('is a labelled region that says how many you found and the best possible', () => {
    const { el } = answerList(answers(3, 1), { question: 'Q3' });
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('All answers to Q3');
    expect(el.textContent).toContain('You found 1 of 3 · best possible 100');
    expect(answerList(answers(2), { question: 'Q1' }).el.textContent).toContain('You found 0 of 2');
  });

  it('shows the CR answer as the gold row on top, and marks yours', () => {
    const { el } = answerList(answers(3, 2), { question: 'Q1' });
    const [top, , mine] = rows(el);
    expect(top!.classList.contains('answer--top')).toBe(true);
    expect(top!.textContent).toContain('CR · 100');
    expect(mine!.classList.contains('answer--picked')).toBe(true);
    expect(mine!.textContent).toContain('(your answer)');
    expect(rows(el).filter((r) => r.classList.contains('answer--top'))).toHaveLength(1);
  });

  it('tags group answers', () => {
    const { el } = answerList([line(0, { kind: 'group' }), line(1)], { question: 'Q1' });
    expect(rows(el).map((r) => r.querySelector('.tag')?.textContent ?? null)).toEqual([
      'group',
      null,
    ]);
  });

  it('opens a row to its description and Wikipedia link, in a new tab', () => {
    const wiki = 'https://en.wikipedia.org/wiki/Tiger';
    const { el } = answerList(
      [line(0, { description: 'A big cat.', wiki }), line(1, { wiki }), line(2)],
      { question: 'Q1' },
    );
    const [full, linkOnly, bare] = rows(el);
    const button = full!.querySelector('button')!;
    const panel = full!.querySelector<HTMLElement>('.answer__details')!;
    expect(panel.hidden).toBe(true);
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toBe('A big cat.Read more on Wikipedia');
    const link = panel.querySelector('a')!;
    expect([link.href, link.target, link.rel]).toEqual([wiki, '_blank', 'noopener']);
    button.click();
    expect(panel.hidden).toBe(true);
    expect(linkOnly!.querySelector('.answer__details')!.textContent).toBe('Read more on Wikipedia');
    expect(bare!.querySelector('.answer__details')!.textContent).toBe('No details yet.');
  });

  it(`adds a search box past ${RESULTS_LIST.searchFrom} answers that filters as you type`, () => {
    expect(
      answerList(answers(RESULTS_LIST.searchFrom), { question: 'Q1' }).el.querySelector('input'),
    ).toBeNull();
    const list = [...answers(RESULTS_LIST.searchFrom), line(99, { name: 'Kākāpō' })];
    const { el } = answerList(list, { question: 'Q1' });
    const search = el.querySelector<HTMLInputElement>('input[type=search]')!;
    expect(search.getAttribute('aria-label')).toBe('Search the answers to Q1');
    search.value = 'kakapo'; // accents and case don't matter
    search.dispatchEvent(new Event('input'));
    expect(rows(el).map((r) => r.querySelector('.answer__name')!.textContent)).toEqual(['Kākāpō']);
    search.value = 'zebra';
    search.dispatchEvent(new Event('input'));
    expect(el.querySelector('.answer-list__empty')?.textContent).toBe('No answers match.');
    search.value = '';
    search.dispatchEvent(new Event('input'));
    expect(rows(el)).toHaveLength(list.length);
  });

  it('moves between rows with the arrow keys, Home and End', () => {
    const { el } = answerList(answers(4), { question: 'Q1' });
    document.body.append(el);
    const all = buttons(el);
    const press = (key: string) =>
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    all[0]!.focus();
    press('ArrowDown');
    expect(document.activeElement).toBe(all[1]);
    press('End');
    expect(document.activeElement).toBe(all[3]);
    press('ArrowDown'); // stays on the last
    expect(document.activeElement).toBe(all[3]);
    press('Home');
    expect(document.activeElement).toBe(all[0]);
    press('ArrowUp'); // stays on the first
    expect(document.activeElement).toBe(all[0]);
    el.remove();
  });

  it('with 150 answers, scrolls your answer into the middle of the box', () => {
    const { el, reveal } = answerList(answers(150, 120), { question: 'Q1' });
    expect(rows(el)).toHaveLength(150);
    const box = el.querySelector<HTMLElement>('.answer-list__box')!;
    const mine = el.querySelector<HTMLElement>('.answer--picked')!;
    // jsdom has no layout: give the box and row the sizes a browser would.
    Object.defineProperty(box, 'clientHeight', { value: 220 });
    Object.defineProperty(mine, 'offsetTop', { value: 120 * 44 });
    Object.defineProperty(mine, 'offsetHeight', { value: 44 });
    reveal();
    expect(box.scrollTop).toBe(120 * 44 - (220 - 44) / 2);
  });

  it(`renders ${RESULTS_LIST.renderWindow} rows at a time past that, always including yours`, () => {
    const n = RESULTS_LIST.renderWindow * 2 + 50;
    const { el } = answerList(answers(n, RESULTS_LIST.renderWindow + 10), { question: 'Q1' });
    expect(rows(el)).toHaveLength(RESULTS_LIST.renderWindow + 11);
    const box = el.querySelector<HTMLElement>('.answer-list__box')!;
    Object.defineProperty(box, 'scrollHeight', { value: 1000 });
    Object.defineProperty(box, 'clientHeight', { value: 220 });
    box.scrollTop = 1000 - 220;
    box.dispatchEvent(new Event('scroll'));
    expect(rows(el)).toHaveLength(RESULTS_LIST.renderWindow * 2 + 11);
  });
});

describe('teamCard', () => {
  const tiger = ANIMALS.get('tiger')!;
  const penguin = ANIMALS.get('penguin')!;
  const prompt: Prompt = {
    id: 'p',
    text: 'Name an animal with stripes that lives in Asia and hunts alone at night',
    answers: [],
  };
  const round = (animal: Animal | null, level: AnswerLevel | 0, list: AnswerLine[]): TeamRound => ({
    prompt,
    animal,
    answers: list,
    result: {
      promptId: 'p',
      timeMs: 1,
      match:
        animal && level
          ? { level, animalId: animal.id, strategy: 'exact', input: animal.display }
          : { level: 0, animalId: null, strategy: null, input: '' },
    },
  });

  it('shows the full question, the animal, its level and points, and a group tag', () => {
    const { el } = teamCard([round(tiger, 4, []), round(null, 0, []), round(penguin, 1, [])]);
    const summaries = [...el.querySelectorAll('summary')];
    expect(summaries[0]!.querySelector('.team-card__prompt')!.textContent).toBe(
      `Q1 · ${prompt.text}`,
    );
    expect(summaries[0]!.querySelector('.team-card__name')!.textContent).toBe('Tiger');
    expect(summaries[0]!.querySelector('.team-card__score')!.textContent).toBe('EN · 85');
    expect(summaries[1]!.textContent).toContain('No match');
    expect(summaries[1]!.querySelector('.team-card__score')!.textContent).toBe('No match · 0');
    expect(summaries[2]!.querySelector('.team-card__name')!.textContent).toBe('Penguingroup');
  });

  it('builds the answer list on first open, then scrolls to your answer each time', () => {
    const { el } = teamCard([round(tiger, 4, answers(30, 20))]);
    const details = el.querySelector('details')!;
    expect(details.querySelector('.answer-list')).toBeNull();
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    const list = details.querySelector('.answer-list')!;
    expect(list.getAttribute('aria-label')).toBe('All answers to Q1');
    expect(list.querySelector('img, .portrait')).toBeNull(); // names only
    details.open = false;
    details.dispatchEvent(new Event('toggle'));
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    expect(details.querySelectorAll('.answer-list')).toHaveLength(1);
  });
});
