import type { Animal } from './types';

/**
 * A still picture of a character's sprite, for the UI (the results screen's
 * party line-up and team list). The scene makes them; the UI only shows them,
 * so they meet here in core.
 */
export interface PortraitImage {
  /** An image URL (a data: URL of the sprite's first frame). */
  readonly src: string;
  /** Native pixel size: show it at a whole multiple to keep it crisp. */
  readonly width: number;
  readonly height: number;
  /** The party walks right; a sprite drawn facing left should be flipped. */
  readonly facesLeft: boolean;
  /**
   * Its walk cycle, when the sprite has one: the frames side by side in one
   * image (each `width` x `height`), to play in place at `fps`.
   */
  readonly walk?: { readonly src: string; readonly frames: number; readonly fps: number };
}

/**
 * The picture for an animal (or the player, for null), shiny or not. Resolves
 * to null when there is none (no scene, sprites still loading or failed); the
 * UI then shows the emoji.
 */
export type Portraits = (animal: Animal | null, shiny: boolean) => Promise<PortraitImage | null>;
