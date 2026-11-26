// Dev only (dev/sprites.html): every archetype walking at the reveal card's
// scales, drawn by the game's own portrait code, so a frame that steps badly
// at some device pixel ratio shows up here. Not in the build.
import '@/ui/styles/index.css';
import { UI_SPRITE_SCALE } from '@/config/ui';
import { validateAnimals } from '@/data/validate';
import { createJsonLoader } from '@/data/jsonLoader';
import { createJournalPortraits } from '@/wiring/stillParts';
import { portrait } from '@/ui/components/portrait';
import { watchViewport } from '@/ui/viewport';
import type { Animal } from '@/core/types';

/** The reveal's scale and the steps a short card takes it down to (reveal.css). */
const SCALES = [UI_SPRITE_SCALE.reveal, 3, 2];

const $ = (selector: string) => document.querySelector<HTMLElement>(selector)!;

/** One animal per archetype, the one that draws itself (not a group borrowing a sheet). */
function onePerArchetype(animals: Iterable<Animal>): Animal[] {
  const seen = new Map<string, Animal>();
  for (const a of animals)
    if (a.kind === 'species' && !seen.has(a.archetype)) seen.set(a.archetype, a);
  return [...seen.values()].sort((a, b) => a.archetype.localeCompare(b.archetype));
}

async function main() {
  watchViewport(); // --dpr for the whole-device-pixel sizes
  const loader = createJsonLoader({ baseUrl: '/' });
  const animals = validateAnimals(await loader.load('data/animals.json'), 'animals.json');
  const portraits = createJournalPortraits(animals, loader);
  const chosen = onePerArchetype(animals.values());
  $('#grid').replaceChildren(
    ...chosen.map((animal) => {
      const row = document.createElement('div');
      row.className = 'row';
      for (const scale of SCALES)
        row.append(portrait(animal, false, { scale, portraits, walking: true }));
      const caption = document.createElement('figcaption');
      caption.textContent = `${animal.archetype} (${animal.display}) · ${SCALES.join('x, ')}x`;
      const figure = document.createElement('figure');
      figure.append(row, caption);
      return figure;
    }),
  );
  $('#status').textContent =
    `${chosen.length} archetypes at device pixel ratio ${window.devicePixelRatio}.`;
}

void main().catch((error: unknown) => {
  $('#status').textContent = `Failed: ${String(error)}`;
});
