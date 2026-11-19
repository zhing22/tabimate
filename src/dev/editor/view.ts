// Renders the puzzle editor: one card per prompt slot, and the side panel.
// Pure rendering from state; every change goes back through SlotActions.
import { LEVELS } from '@/config/levels';
import type { AnimalId, AnimalLookup, DateKey } from '@/core/types';
import { h } from '@/ui/dom';
import type { GuessExplained } from '@/debug/explainGuess';
import type { CheckResult } from './check';
import { slotAnswers, slotPrompt, type AnswerRow, type SlotDraft } from './model';
import { TEMPLATES, templateById } from './templates';

export interface SlotActions {
  setTemplate(slot: number, templateId: string): void;
  setValue(slot: number, blank: string, value: string): void;
  redraft(slot: number): void;
  addAnimal(slot: number, displayOrId: string): void;
  setRow(slot: number, animalId: AnimalId, patch: Partial<AnswerRow>): void;
  toggleCR(slot: number, animalId: AnimalId): void;
}

const option = (value: string, label: string, selected: boolean) =>
  h('option', { value, selected }, label);

function blankInputs(index: number, slot: SlotDraft, actions: SlotActions) {
  const template = templateById(slot.templateId);
  return (template?.blanks ?? []).map((blank) => {
    const value = slot.values[blank.name] ?? '';
    const input = blank.options
      ? h('select', {}, ...blank.options.map((o) => option(o.value, o.label, o.value === value)))
      : h('input', { type: 'text', value, size: 40, placeholder: 'Name an animal that…' });
    input.addEventListener('change', () => actions.setValue(index, blank.name, input.value));
    return h('label', {}, `${blank.label} `, input);
  });
}

function levelSelect(row: AnswerRow, onChange: (level: AnswerRow['level']) => void) {
  // CR is chosen with the radio column, so the dropdown stops at EN.
  const select = h(
    'select',
    {},
    ...LEVELS.filter((l) => l.id >= 1 && l.id <= 4).map((l) =>
      option(String(l.id), `${l.shortName} ${l.points}`, l.id === row.level),
    ),
  );
  select.addEventListener('change', () => onChange(Number(select.value) as AnswerRow['level']));
  return select;
}

function answerTable(
  index: number,
  slot: SlotDraft,
  animals: AnimalLookup,
  maxCR: number,
  actions: SlotActions,
) {
  const crType = maxCR === 1 ? 'radio' : 'checkbox';
  const rows = slot.rows.map((row) => {
    const animal = animals.get(row.animalId);
    const include = h('input', { type: 'checkbox', checked: row.include });
    include.addEventListener('change', () =>
      actions.setRow(index, row.animalId, { include: include.checked }),
    );
    const cr = h('input', {
      type: crType,
      name: `cr-${index}`,
      checked: slot.cr.includes(row.animalId),
      disabled: !row.include,
      title: 'Mark as CR (level 5)',
    });
    cr.addEventListener('change', () => actions.toggleCR(index, row.animalId));
    return h(
      'tr',
      { class: row.include ? '' : 'row--out' },
      h('td', {}, `${animal?.emoji ?? ''} ${animal?.display ?? row.animalId}`),
      h('td', {}, animal?.kind ?? '?'),
      h(
        'td',
        {},
        levelSelect(row, (level) => actions.setRow(index, row.animalId, { level })),
      ),
      h('td', { class: 'aliases' }, animal?.aliases.join(', ') ?? ''),
      h('td', {}, include),
      h('td', {}, cr),
    );
  });
  return h(
    'table',
    {},
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        ...[
          'Animal',
          'Kind',
          'Level',
          'Aliases',
          'Include',
          maxCR === 1 ? 'CR' : `CR (≤${maxCR})`,
        ].map((c) => h('th', {}, c)),
      ),
    ),
    h('tbody', {}, ...rows),
  );
}

/** One prompt slot: template, blanks, text, answer table. */
export function slotCard(
  index: number,
  slot: SlotDraft,
  ctx: { animals: AnimalLookup; maxCR: number; recent: readonly DateKey[] },
  actions: SlotActions,
): HTMLElement {
  const picker = h(
    'select',
    {},
    ...TEMPLATES.map((t) => option(t.id, t.label, t.id === slot.templateId)),
  );
  picker.addEventListener('change', () => actions.setTemplate(index, picker.value));
  const redraft = h(
    'button',
    { type: 'button', disabled: slot.templateId === 'free' },
    'Redraft answers',
  );
  redraft.addEventListener('click', () => actions.redraft(index));
  const add = h('input', {
    type: 'text',
    list: 'animal-names',
    placeholder: 'Add an animal…',
    size: 28,
  });
  add.addEventListener('change', () => {
    if (add.value.trim()) actions.addAnimal(index, add.value.trim());
  });
  const { id, text } = slotPrompt(slot);
  const included = slot.rows.filter((r) => r.include).length;
  return h(
    'section',
    { class: 'slot' },
    h(
      'header',
      {},
      h('strong', {}, `Prompt ${index + 1} `),
      picker,
      ...blankInputs(index, slot, actions),
      redraft,
    ),
    h(
      'p',
      { class: 'slot__text' },
      text || '(empty: left out of the file)',
      ' ',
      h('code', {}, id),
      ctx.recent.length > 0
        ? h('span', { class: 'warn' }, ` used in the last 30 days: ${ctx.recent.join(', ')}`)
        : null,
    ),
    h('p', { class: 'slot__meta' }, `${included} included of ${slot.rows.length} · `, add),
    slot.rows.length > 0 ? answerTable(index, slot, ctx.animals, ctx.maxCR, actions) : null,
  );
}

/** Level counts per slot and in total. */
export function levelTable(slots: readonly SlotDraft[]): HTMLElement {
  const answers = slots.map(slotAnswers);
  const levels = LEVELS.filter((l) => l.id > 0);
  const count = (list: readonly { level: number }[], level: number) =>
    list.filter((a) => a.level === level).length;
  return h(
    'table',
    { class: 'counts' },
    h('thead', {}, h('tr', {}, h('th', {}, ''), ...levels.map((l) => h('th', {}, l.shortName)))),
    h(
      'tbody',
      {},
      ...answers.map((list, i) =>
        list.length === 0
          ? null
          : h(
              'tr',
              {},
              h('th', {}, `P${i + 1}`),
              ...levels.map((l) => h('td', {}, count(list, l.id))),
            ),
      ),
      h(
        'tr',
        {},
        h('th', {}, 'All'),
        ...levels.map((l) => h('td', {}, count(answers.flat(), l.id))),
      ),
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
