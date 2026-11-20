import type { PortraitImage } from '@/core/portrait';
import type { Animal } from '@/core/types';
import type { FrameTag } from './sheet';

/** A sprite registered with Kaplay, and which way it was drawn facing. */
export interface SpriteRef {
  readonly name: string;
  /** The journey goes right; a sprite drawn facing left is flipped. */
  readonly facesLeft: boolean;
  /** Frames to play while walking; without it the sprite is one still frame. */
  readonly walk?: FrameTag;
  /** Wing beats for a sky animal (the sheet's 'flap' tag); it hovers on walk frames without. */
  readonly flap?: FrameTag;
  /** Swimming frames for a water animal (the sheet's 'swim' tag). */
  readonly swim?: FrameTag;
  /** The same frames with the eyes closed, shown briefly when the idle motion blinks. */
  readonly blinkName?: string;
}

/**
 * Where character sprites come from. The scene only ever asks this, so
 * placeholder emoji (Step 8) and pixel sheets (Step 8b) swap without changes.
 */
export interface SpriteProvider {
  /** Prepares every sprite these animals need, shiny or not. */
  load(animals: Iterable<Animal>): Promise<void>;
  spriteFor(animal: Animal, shiny: boolean): SpriteRef;
  playerSprite(): SpriteRef;
  /**
   * A still of the sprite (its first frame) for the UI, or null if it isn't
   * loaded. `animal` null means the player.
   */
  portrait(animal: Animal | null, shiny: boolean): PortraitImage | null;
}
