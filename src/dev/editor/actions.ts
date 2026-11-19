// What each control in a slot does to the draft. Every action builds the next
// draft from the current one and hands it to `update` (which saves and redraws).
import { maxCRFor } from '@/config/themes';
import { redraftSlot, addAnimal, draftRows, editRow, toggleCR } from './rows';
import type { SlotActions } from './slotCard';
import type { EditorData } from './store';
import { defaultValues, templateById } from './templates';
import type { EditorDraft, SlotDraft } from './types';

export interface ActionContext {
  readonly draft: () => EditorDraft;
  readonly data: () => EditorData;
  readonly update: (next: EditorDraft) => void;
}

export function createSlotActions({ draft, data, update }: ActionContext): SlotActions {
  const editSlot = (index: number, change: (slot: SlotDraft) => SlotDraft) =>
    update({ ...draft(), slots: draft().slots.map((s, i) => (i === index ? change(s) : s)) });

  /** Redraws a slot's answers from its template, keeping hand edits. */
  const redrafted = (slot: SlotDraft): SlotDraft => {
    const filter = templateById(slot.templateId)?.toFilter(slot.values) ?? null;
    const { animals, usage } = data();
    return filter ? redraftSlot(slot, draftRows(filter, animals, usage), animals) : slot;
  };

  return {
    setTemplate: (i, templateId) =>
      editSlot(i, (s) => {
        const template = templateById(templateId)!;
        return redrafted({ ...s, templateId, values: defaultValues(template), cr: [] });
      }),
    setValue: (i, blank, value) =>
      editSlot(i, (s) => redrafted({ ...s, values: { ...s.values, [blank]: value } })),
    redraft: (i) => editSlot(i, redrafted),
    addAnimal: (i, name) => editSlot(i, (s) => addAnimal(s, name, data().animals, data().usage)),
    setRow: (i, id, patch) => editSlot(i, (s) => editRow(s, id, patch)),
    toggleCR: (i, id) =>
      editSlot(i, (s) => ({ ...s, cr: toggleCR(s.cr, id, maxCRFor(draft().date)) })),
  };
}
