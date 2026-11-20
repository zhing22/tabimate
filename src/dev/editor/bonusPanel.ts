// The editor's fourth panel on Sundays: the bonus quiz's three true-or-false
// questions, each with an explanation, checked by the real validator.
import { BONUS } from '@/config/bonus';
import { h } from '@/ui/dom';
import { bonusItems, checkBonus, explanationWords } from './bonusDraft';
import type { BonusDraftItem, EditorDraft } from './types';

function itemFields(item: BonusDraftItem, i: number, change: (next: BonusDraftItem) => void) {
  const statement = h('input', { type: 'text', value: item.statement, placeholder: 'Statement' });
  statement.addEventListener('change', () => change({ ...item, statement: statement.value }));
  const choice = (value: boolean) => {
    const radio = h('input', { type: 'radio', name: `bonus-${i}`, checked: item.answer === value });
    radio.addEventListener('change', () => change({ ...item, answer: value }));
    return h('label', {}, radio, value ? ' True' : ' False');
  };
  const explanation = h('input', {
    type: 'text',
    value: item.explanation,
    placeholder: `Explanation (${BONUS.explanationWords} words or fewer)`,
  });
  explanation.addEventListener('change', () => change({ ...item, explanation: explanation.value }));
  const words = explanationWords(item.explanation);
  return h(
    'fieldset',
    { class: 'bonus-item' },
    h('legend', {}, `Question ${i + 1}`),
    statement,
    h('div', {}, choice(true), ' ', choice(false)),
    explanation,
    h('small', { class: words > BONUS.explanationWords ? 'error' : '' }, `${words} words`),
  );
}

export function bonusPanel(
  draft: EditorDraft,
  update: (items: readonly BonusDraftItem[]) => void,
): HTMLElement {
  const items = bonusItems(draft);
  const problem = checkBonus(draft);
  return h(
    'div',
    {},
    ...items.map((item, i) =>
      itemFields(item, i, (next) => update(items.map((old, j) => (j === i ? next : old)))),
    ),
    h('p', { class: problem ? 'error' : 'ok' }, problem ?? 'The quiz passes the validator.'),
  );
}
