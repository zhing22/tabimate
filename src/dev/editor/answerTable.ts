// A slot's answer table: animal, kind, level dropdown, aliases, include, CR.
import { ANSWER_LEVELS, LEVELS, TOP_LEVEL } from '@/config/levels';
import type { AnimalId, AnimalLookup } from '@/core/types';
import { h } from '@/ui/dom';
import type { AnswerRow, RowLevel, SlotDraft } from './types';

export interface RowActions {
  setRow(animalId: AnimalId, patch: Partial<AnswerRow>): void;
  toggleCR(animalId: AnimalId): void;
}

/** The dropdown's levels: every answer level except the top one, which the CR column picks. */
const ROW_LEVELS = ANSWER_LEVELS.filter((l): l is RowLevel => l !== TOP_LEVEL);
const CR = LEVELS[TOP_LEVEL];

export const option = (value: string, label: string, selected: boolean) =>
  h('option', { value, selected }, label);

function levelSelect(row: AnswerRow, onChange: (level: RowLevel) => void) {
  const select = h(
    'select',
    {},
    ...ROW_LEVELS.map((id) =>
      option(String(id), `${LEVELS[id].shortName} ${LEVELS[id].points}`, id === row.level),
    ),
  );
  select.addEventListener('change', () => onChange(Number(select.value) as RowLevel));
  return select;
}

function answerRow(row: AnswerRow, slot: SlotDraft, ctx: TableContext, actions: RowActions) {
  const animal = ctx.animals.get(row.animalId);
  const include = h('input', { type: 'checkbox', checked: row.include });
  include.addEventListener('change', () =>
    actions.setRow(row.animalId, { include: include.checked }),
  );
  const cr = h('input', {
    type: ctx.maxCR === 1 ? 'radio' : 'checkbox',
    name: `cr-${ctx.slotIndex}`,
    checked: slot.cr.includes(row.animalId),
    disabled: !row.include,
    title: `Mark as ${CR.shortName} (${CR.name}, ${CR.points} points)`,
  });
  cr.addEventListener('change', () => actions.toggleCR(row.animalId));
  return h(
    'tr',
    { class: row.include ? '' : 'row--out' },
    h('td', {}, `${animal?.emoji ?? ''} ${animal?.display ?? row.animalId}`),
    h('td', {}, animal?.kind ?? '?'),
    h(
      'td',
      {},
      levelSelect(row, (level) => actions.setRow(row.animalId, { level })),
    ),
    h('td', { class: 'aliases' }, animal?.aliases.join(', ') ?? ''),
    h('td', {}, include),
    h('td', {}, cr),
  );
}

export interface TableContext {
  readonly animals: AnimalLookup;
  /** CR answers allowed per prompt: 1 shows radios, more shows checkboxes. */
  readonly maxCR: number;
  /** Names the CR radio group, so each slot has its own. */
  readonly slotIndex: number;
}

export function answerTable(slot: SlotDraft, ctx: TableContext, actions: RowActions) {
  const crHeading = ctx.maxCR === 1 ? CR.shortName : `${CR.shortName} (≤${ctx.maxCR})`;
  return h(
    'table',
    {},
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        ...['Animal', 'Kind', 'Level', 'Aliases', 'Include', crHeading].map((c) => h('th', {}, c)),
      ),
    ),
    h('tbody', {}, ...slot.rows.map((row) => answerRow(row, slot, ctx, actions))),
  );
}
