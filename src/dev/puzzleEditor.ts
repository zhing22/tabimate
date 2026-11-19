// Dev only: author a day's puzzle (dev/puzzles.html). Not in the build.
// Reuses the game's validator, matcher and trait queries, so what passes here
// passes validate-data and plays the same in the game. This file only wires the
// page together; the pieces live in ./editor/.
import { dailyKey, shiftKey } from '@/core/date';
import type { Prompt } from '@/core/types';
import { explainGuess } from '@/debug/explainGuess';
import { h } from '@/ui/dom';
import { createSlotActions } from './editor/actions';
import { downloadPuzzle, savePuzzle } from './editor/exporting';
import { emptyDraft, fromPuzzle, slotAnswers, slotPrompt } from './editor/puzzleFile';
import { renderEditor } from './editor/render';
import { guessLine } from './editor/sidePanel';
import { loadData, readDraft, withPuzzles, writeDraft, type EditorData } from './editor/store';
import type { EditorDraft } from './editor/types';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

interface Editor {
  draft: EditorDraft;
  data: EditorData;
  /** Saves the draft and redraws. */
  update(next: EditorDraft): void;
  render(): void;
}

function wireToolbar(editor: Editor) {
  const dateInput = $<HTMLInputElement>('#date');
  dateInput.value = editor.draft.date;
  dateInput.addEventListener('change', () => {
    if (!dateInput.value) return;
    editor.draft = readDraft(dateInput.value) ?? emptyDraft(dateInput.value);
    editor.render();
  });
  $('#import').addEventListener('click', () => {
    const existing = editor.data.puzzles.get(editor.draft.date);
    if (!existing) return alert(`No puzzle file for ${editor.draft.date}.`);
    if (confirm(`Replace the draft with public/data/puzzles/${editor.draft.date}.json?`)) {
      editor.update(fromPuzzle(existing));
    }
  });
  $('#clear').addEventListener('click', () => {
    if (confirm('Start this day over? The draft is cleared.'))
      editor.update(emptyDraft(editor.draft.date));
  });
  $('#download').addEventListener('click', () => downloadPuzzle(editor.draft));
  $('#save').addEventListener('click', () => {
    void savePuzzle(editor.draft).then(async (result) => {
      $('#save-result').textContent = result.text;
      if (!result.ok) return;
      editor.data = await withPuzzles(editor.data.animals);
      editor.render();
    });
  });
}

function wireTestBox(editor: Editor) {
  const input = $<HTMLInputElement>('#test-guess');
  $('#test-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const slot = editor.draft.slots[Number($<HTMLSelectElement>('#test-slot').value)];
    if (!slot || !input.value.trim()) return;
    const prompt: Prompt = { ...slotPrompt(slot), answers: slotAnswers(slot) };
    $('#test-log').prepend(guessLine(explainGuess(input.value, prompt, editor.data.animals)));
    input.select();
  });
}

async function main() {
  const data = await loadData();
  $('#animal-names').replaceChildren(
    ...[...data.animals.values()].map((a) => h('option', { value: a.display })),
  );
  const date = shiftKey(dailyKey(new Date()), 1);
  const editor: Editor = {
    draft: readDraft(date) ?? emptyDraft(date),
    data,
    update(next) {
      editor.draft = next;
      writeDraft(next);
      editor.render();
    },
    render: () => renderEditor(editor.draft, editor.data, actions),
  };
  const actions = createSlotActions({
    draft: () => editor.draft,
    data: () => editor.data,
    update: (next) => editor.update(next),
  });
  wireToolbar(editor);
  wireTestBox(editor);
  editor.render();
}

void main();
