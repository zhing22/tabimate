// Dev only: author a day's puzzle (dev/puzzles.html). Not in the build.
// Reuses the game's validator, matcher and trait queries, so what passes here
// passes validate-data and plays the same in the game.
import { LAUNCH_DATE_KEY } from '@/config/game';
import { maxCRFor, themeFor, WEEKDAY_NAMES, weekdayOf } from '@/config/themes';
import { dailyKey, puzzleNumber, shiftKey } from '@/core/date';
import type { AnimalLookup, DateKey, Prompt, Puzzle } from '@/core/types';
import { createJsonLoader, MISSING } from '@/data/jsonLoader';
import { ANIMALS_FILE, puzzleFile } from '@/data/localPuzzleSource';
import { validateAnimals, validatePuzzle } from '@/data/validate';
import { explainGuess } from '@/debug/explainGuess';
import { h } from '@/ui/dom';
import { checkPuzzle } from './editor/check';
import {
  addAnimal,
  answerUsage,
  draftRows,
  emptyDraft,
  fromPuzzle,
  recentUses,
  redraftSlot,
  slotAnswers,
  slotPrompt,
  toggleCR,
  toPuzzleJson,
  type EditorDraft,
  type SlotDraft,
} from './editor/model';
import { defaultValues, templateById } from './editor/templates';
import { checkList, guessLine, levelTable, slotCard, type SlotActions } from './editor/view';

const DRAFT_KEY = (date: DateKey) => `tabimate.dev.puzzleDraft.${date}`;
/** Stop looking for more puzzle files after this many missing days in a row. */
const MAX_GAP_DAYS = 14;
const RECENT_DAYS = 30;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

function readDraft(date: DateKey): EditorDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(date));
    return raw ? (JSON.parse(raw) as EditorDraft) : null;
  } catch {
    return null;
  }
}
function writeDraft(draft: EditorDraft) {
  try {
    localStorage.setItem(DRAFT_KEY(draft.date), JSON.stringify(draft));
  } catch {
    // Private mode or full: autosave is a convenience, editing still works.
  }
}

/** Every puzzle file from launch on, until MAX_GAP_DAYS in a row are missing. */
async function loadPuzzles(animals: AnimalLookup): Promise<Map<DateKey, Puzzle>> {
  const loader = createJsonLoader({ baseUrl: '/' }); // fresh: picks up files saved this session
  const out = new Map<DateKey, Puzzle>();
  for (let key = LAUNCH_DATE_KEY, gap = 0; gap < MAX_GAP_DAYS; key = shiftKey(key, 1)) {
    const json = await loader.load(puzzleFile(key));
    if (json === MISSING) {
      gap++;
      continue;
    }
    gap = 0;
    try {
      out.set(key, validatePuzzle(json, { file: puzzleFile(key), key, animals }));
    } catch (error) {
      console.warn(`Skipping ${key}:`, error);
    }
  }
  return out;
}

async function main() {
  const loader = createJsonLoader({ baseUrl: '/' });
  const animals = validateAnimals(await loader.load(ANIMALS_FILE), ANIMALS_FILE);
  let puzzles = await loadPuzzles(animals);
  let usage = answerUsage([...puzzles.values()]);
  $('#animal-names').replaceChildren(
    ...[...animals.values()].map((a) => h('option', { value: a.display })),
  );

  const dateInput = $<HTMLInputElement>('#date');
  dateInput.value = shiftKey(dailyKey(new Date()), 1);
  let draft: EditorDraft = readDraft(dateInput.value) ?? emptyDraft(dateInput.value);

  const update = (next: EditorDraft) => {
    draft = next;
    writeDraft(draft);
    render();
  };
  const editSlot = (index: number, change: (slot: SlotDraft) => SlotDraft) =>
    update({ ...draft, slots: draft.slots.map((s, i) => (i === index ? change(s) : s)) });
  /** Redraws a slot's answers from its template, keeping hand edits. */
  const redrafted = (slot: SlotDraft): SlotDraft => {
    const filter = templateById(slot.templateId)?.toFilter(slot.values) ?? null;
    return filter ? redraftSlot(slot, draftRows(filter, animals, usage), animals) : slot;
  };

  const actions: SlotActions = {
    setTemplate: (i, templateId) =>
      editSlot(i, (s) => {
        const template = templateById(templateId)!;
        return redrafted({ ...s, templateId, values: defaultValues(template), cr: [] });
      }),
    setValue: (i, blank, value) =>
      editSlot(i, (s) => redrafted({ ...s, values: { ...s.values, [blank]: value } })),
    redraft: (i) => editSlot(i, redrafted),
    addAnimal: (i, name) => editSlot(i, (s) => addAnimal(s, name, animals, usage)),
    setRow: (i, id, patch) =>
      editSlot(i, (s) => {
        const rows = s.rows.map((r) => (r.animalId === id ? { ...r, ...patch } : r));
        const cr = patch.include === false ? s.cr.filter((c) => c !== id) : s.cr;
        return { ...s, rows, cr };
      }),
    toggleCR: (i, id) =>
      editSlot(i, (s) => ({ ...s, cr: toggleCR(s.cr, id, maxCRFor(draft.date)) })),
  };

  const testInput = $<HTMLInputElement>('#test-guess');
  const testSlot = $<HTMLSelectElement>('#test-slot');
  const testLog = $('#test-log');

  function render() {
    const theme = themeFor(draft.date);
    const maxCR = maxCRFor(draft.date);
    const weekday = WEEKDAY_NAMES[weekdayOf(draft.date)];
    $('#day').textContent =
      `Puzzle #${puzzleNumber(draft.date)}, ${weekday}: ` +
      (theme
        ? `${theme.name} (up to ${maxCR} CR per prompt)`
        : 'no theme yet (one CR per prompt)') +
      (puzzles.has(draft.date) ? ' · a file exists for this day' : '');
    const recent = [...puzzles.values()].filter(
      (p) => p.date < draft.date && p.date >= shiftKey(draft.date, -RECENT_DAYS),
    );
    $('#slots').replaceChildren(
      ...draft.slots.map((slot, i) =>
        slotCard(
          i,
          slot,
          { animals, maxCR, recent: recentUses(slotPrompt(slot), recent) },
          actions,
        ),
      ),
    );
    $('#counts').replaceChildren(levelTable(draft.slots));
    $('#checks').replaceChildren(checkList(checkPuzzle(toPuzzleJson(draft), animals)));
    const chosen = testSlot.value;
    testSlot.replaceChildren(
      ...draft.slots.map((s, i) =>
        h(
          'option',
          { value: String(i), selected: String(i) === chosen },
          `P${i + 1}: ${slotPrompt(s).text || '(empty)'}`,
        ),
      ),
    );
  }

  dateInput.addEventListener('change', () => {
    if (!dateInput.value) return;
    draft = readDraft(dateInput.value) ?? emptyDraft(dateInput.value);
    render();
  });
  $('#import').addEventListener('click', () => {
    const existing = puzzles.get(draft.date);
    if (!existing) return alert(`No puzzle file for ${draft.date}.`);
    if (confirm(`Replace the draft with public/data/puzzles/${draft.date}.json?`))
      update(fromPuzzle(existing));
  });
  $('#clear').addEventListener('click', () => {
    if (confirm('Start this day over? The draft is cleared.')) update(emptyDraft(draft.date));
  });
  $('#download').addEventListener('click', () => {
    const blob = new Blob([`${JSON.stringify(toPuzzleJson(draft), null, 2)}\n`], {
      type: 'application/json',
    });
    const link = h('a', { href: URL.createObjectURL(blob), download: `${draft.date}.json` });
    link.click();
    URL.revokeObjectURL(link.href);
  });
  $('#save').addEventListener('click', () => {
    void (async () => {
      const response = await fetch(`/__dev/puzzles/${draft.date}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPuzzleJson(draft)),
      });
      const { message } = (await response.json()) as { message: string };
      $('#save-result').textContent = response.ok ? `Saved: ${message}` : `Not saved: ${message}`;
      if (response.ok) {
        puzzles = await loadPuzzles(animals);
        usage = answerUsage([...puzzles.values()]);
        render();
      }
    })();
  });
  $('#test-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const slot = draft.slots[Number(testSlot.value)];
    if (!slot || !testInput.value.trim()) return;
    const prompt: Prompt = { ...slotPrompt(slot), answers: slotAnswers(slot) };
    testLog.prepend(guessLine(explainGuess(testInput.value, prompt, animals)));
    testInput.select();
  });

  render();
}

void main();
