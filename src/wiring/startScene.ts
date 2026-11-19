// Composition helpers for main.ts: they pick real implementations, like main.
import { SPRITE_SOURCE } from '@/config/render';
import type { GameBus } from '@/core/events';
import type { Animal, AnimalId, Puzzle } from '@/core/types';
import type { JsonLoader } from '@/data/jsonLoader';
import { loadSheetFiles, loadSpriteArt } from '@/data/spriteArtSource';
import { createScene, type Scene } from '@/scene/sceneManager';
import { createEmojiSpriteProvider } from '@/scene/sprites/emojiSpriteProvider';
import { createPixelSpriteProvider, readSheet } from '@/scene/sprites/pixelSpriteProvider';

/**
 * The scene is scenery: if it can't start (no WebGL, say), the game is still
 * fully playable over the CSS backdrop, so a failure is only logged.
 */
export function startScene(
  bus: GameBus,
  puzzle: Puzzle,
  animals: ReadonlyMap<AnimalId, Animal>,
  loader: JsonLoader,
): Pick<Scene, 'portraits' | 'backdrops' | 'ready'> | null {
  const container = document.querySelector<HTMLElement>('#scene');
  if (!container) return null;
  try {
    const scene = createScene(container, bus, {
      animals,
      puzzleDate: puzzle.date,
      createSprites: (k) => {
        const emoji = createEmojiSpriteProvider(k);
        if (SPRITE_SOURCE === 'emoji') return emoji;
        return createPixelSpriteProvider(k, {
          loadArt: () => loadSpriteArt(loader),
          loadSheet: async (archetype) => readSheet(await loadSheetFiles(loader, archetype)),
          fallback: emoji,
        });
      },
    });
    scene.ready.catch((error: unknown) => console.error('Scene sprites failed to load', error));
    return scene;
  } catch (error) {
    console.error('Scene failed to start; playing without it', error);
    return null;
  }
}
