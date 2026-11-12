import type { Animal } from '@/core/types';

/** A sprite registered with Kaplay, and which way it was drawn facing. */
export interface SpriteRef {
  readonly name: string;
  /** The journey goes right; a sprite drawn facing left is flipped. */
  readonly facesLeft: boolean;
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
}
