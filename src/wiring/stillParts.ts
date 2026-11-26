// The scene's pieces that need no Kaplay: the Town still painted while the
// day loads, and pixel portraits of any animal (the loading card, the Field
// Journal). Loaded with import() by wiring/startScene.ts.
import type { Portraits } from '@/core/portrait';
import type { Animal, AnimalId } from '@/core/types';
import type { JsonLoader } from '@/data/jsonLoader';
import { loadSheetFiles, loadSpriteArt } from '@/data/spriteArtSource';
import { readSheet } from '@/scene/sprites/sheetImages';
import { createStillPortraits } from '@/scene/sprites/stillPortraits';
import { showStillScene } from '@/scene/stillScene';

/** The Town on a plain canvas (no Kaplay, no sprites); null with nowhere to draw. */
export function showStill(): { dispose(): void } | null {
  const container = document.querySelector<HTMLElement>('#scene');
  return container ? showStillScene(container, 'town') : null;
}

export function createJournalPortraits(
  animals: ReadonlyMap<AnimalId, Animal>,
  loader: JsonLoader,
): Portraits {
  return createStillPortraits({
    animals,
    loadArt: () => loadSpriteArt(loader),
    loadSheet: async (archetype) => readSheet(await loadSheetFiles(loader, archetype)),
  });
}
