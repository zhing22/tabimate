// What the editor loads and keeps: the animals, every existing puzzle (for
// "common" levels and recent repeats), and the per-date drafts in localStorage.
import { LAUNCH_DATE_KEY } from '@/config/game';
import { shiftKey } from '@/core/date';
import type { AnimalId, AnimalLookup, BonusItem, DateKey, Puzzle } from '@/core/types';
import { createJsonLoader, MISSING } from '@/data/jsonLoader';
import { ANIMALS_FILE, bonusFile, puzzleFile } from '@/data/localPuzzleSource';
import { validateBonus } from '@/data/validateBonus';
import { validateAnimals, validatePuzzle } from '@/data/validate';
import { answerUsage } from './stats';
import type { EditorDraft } from './types';

const DRAFT_KEY = (date: DateKey) => `tabimate.dev.puzzleDraft.${date}`;
/** Stop looking for more puzzle files after this many missing days in a row. */
const MAX_GAP_DAYS = 14;

export interface EditorData {
  readonly animals: AnimalLookup;
  readonly puzzles: ReadonlyMap<DateKey, Puzzle>;
  /** How many prompts each animal answers already (suggestLevel's "common"). */
  readonly usage: ReadonlyMap<AnimalId, number>;
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

/** The puzzles (and usage), reread: after a save, the new file counts. */
export async function withPuzzles(animals: AnimalLookup): Promise<EditorData> {
  const puzzles = await loadPuzzles(animals);
  return { animals, puzzles, usage: answerUsage([...puzzles.values()]) };
}

export async function loadData(): Promise<EditorData> {
  const loader = createJsonLoader({ baseUrl: '/' });
  return withPuzzles(validateAnimals(await loader.load(ANIMALS_FILE), ANIMALS_FILE));
}

/** A day's saved bonus quiz, or null when there is none (or it doesn't read). */
export async function loadBonus(date: DateKey): Promise<readonly BonusItem[] | null> {
  const json = await createJsonLoader({ baseUrl: '/' }).load(bonusFile(date));
  if (json === MISSING) return null;
  try {
    return validateBonus(json, bonusFile(date), date);
  } catch (error) {
    console.warn(`Skipping the ${date} bonus quiz:`, error);
    return null;
  }
}

export function readDraft(date: DateKey): EditorDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(date));
    return raw ? (JSON.parse(raw) as EditorDraft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: EditorDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY(draft.date), JSON.stringify(draft));
  } catch {
    // Private mode or full: autosave is a convenience, editing still works.
  }
}
