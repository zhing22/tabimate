// The editor's side panel: level counts, checks, and test-guess results.
import { ANSWER_LEVELS, LEVELS } from '@/config/levels';
import type { GuessExplained } from '@/debug/explainGuess';
import { h } from '@/ui/dom';
import type { CheckResult } from './check';
import { slotAnswers } from './puzzleFile';
import { levelCounts } from './stats';
import type { SlotDraft } from './types';

const countRow = (label: string, answers: Parameters<typeof levelCounts>[0]) => {
  const counts = levelCounts(answers);
  return h('tr', {}, h('th', {}, label), ...ANSWER_LEVELS.map((l) => h('td', {}, counts[l])));
};

/** Level counts per used slot and in total. */
export function levelTable(slots: readonly SlotDraft[]): HTMLElement {
  const answers = slots.map(slotAnswers);
  return h(
    'table',
    { class: 'counts' },
    h(
      'thead',
      {},
      h('tr', {}, h('th', {}, ''), ...ANSWER_LEVELS.map((l) => h('th', {}, LEVELS[l].shortName))),
    ),
    h(
      'tbody',
      {},
      ...answers.map((list, i) => (list.length === 0 ? null : countRow(`P${i + 1}`, list))),
      countRow('All', answers.flat()),
    ),
  );
}

/** What the real validator and name check say about the export. */
export function checkList(result: CheckResult): HTMLElement {
  const items = [
    ...(result.error
      ? [h('li', { class: 'error' }, result.error)]
      : [h('li', { class: 'ok' }, 'Valid: ready to export.')]),
    ...result.collisions.map((c) => h('li', { class: 'error' }, c)),
    ...result.warnings.map((w) => h('li', { class: 'warn' }, w)),
  ];
  return h('ul', { class: 'checks' }, ...items);
}

/** How the real matcher read a test guess. */
export const guessLine = (g: GuessExplained): HTMLElement =>
  h(
    'li',
    {},
    `"${g.input}" → `,
    h('strong', {}, g.verdict),
    g.animal
      ? ` ${g.animal} (level ${g.level}, ${g.strategy}${g.tie ? `; ${g.tie}` : ''})`
      : ' no answer',
    g.note ? ` (${g.note})` : null,
  );
