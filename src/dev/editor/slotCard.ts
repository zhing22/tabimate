// One prompt slot in the editor: template picker, blanks, prompt text, answers.
// Pure rendering from state; every change goes back through SlotActions.
import type { AnimalId, AnimalLookup, DateKey } from '@/core/types';
import { h } from '@/ui/dom';
import { answerTable, option } from './answerTable';
import { slotPrompt } from './puzzleFile';
import { TEMPLATES, templateById } from './templates';
import type { AnswerRow, SlotDraft } from './types';

export interface SlotActions {
  setTemplate(slot: number, templateId: string): void;
  setValue(slot: number, blank: string, value: string): void;
  redraft(slot: number): void;
  addAnimal(slot: number, displayOrId: string): void;
  setRow(slot: number, animalId: AnimalId, patch: Partial<AnswerRow>): void;
  toggleCR(slot: number, animalId: AnimalId): void;
}

export interface SlotContext {
  readonly animals: AnimalLookup;
  readonly maxCR: number;
  /** Dates in the last 30 days that used this prompt already. */
  readonly recent: readonly DateKey[];
}

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

function header(index: number, slot: SlotDraft, actions: SlotActions) {
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
  return h(
    'header',
    {},
    h('strong', {}, `Prompt ${index + 1} `),
    picker,
    ...blankInputs(index, slot, actions),
    redraft,
  );
}

function addBox(index: number, actions: SlotActions) {
  const add = h('input', {
    type: 'text',
    list: 'animal-names',
    placeholder: 'Add an animal…',
    size: 28,
  });
  add.addEventListener('change', () => {
    if (add.value.trim()) actions.addAnimal(index, add.value.trim());
  });
  return add;
}

/** One prompt slot: template, blanks, text, answer table. */
export function slotCard(
  index: number,
  slot: SlotDraft,
  ctx: SlotContext,
  actions: SlotActions,
): HTMLElement {
  const { id, text } = slotPrompt(slot);
  const included = slot.rows.filter((r) => r.include).length;
  const rowActions = {
    setRow: (animalId: AnimalId, patch: Partial<AnswerRow>) =>
      actions.setRow(index, animalId, patch),
    toggleCR: (animalId: AnimalId) => actions.toggleCR(index, animalId),
  };
  return h(
    'section',
    { class: 'slot' },
    header(index, slot, actions),
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
    h(
      'p',
      { class: 'slot__meta' },
      `${included} included of ${slot.rows.length} · `,
      addBox(index, actions),
    ),
    slot.rows.length > 0
      ? answerTable(slot, { animals: ctx.animals, maxCR: ctx.maxCR, slotIndex: index }, rowActions)
      : null,
  );
}
