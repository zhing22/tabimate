import type { DrawRectOpt, KAPLAYCtx } from 'kaplay';
import type { BiomeId } from '@/config/biomes';
import { GROUND_Y } from '@/config/render';
import type { BiomeArtSprites } from './biomes/load';
import type { BorderSprites } from './borders/load';
import type { BorderKey } from './borders/registry';
import { easeSpan, partyCameraX, partySpan } from './camera';
import { createSceneryRenderer } from './drawScenery';
import { createTitleCardRenderer } from './drawTitleCard';
import { kaplaySceneryBackend } from './kaplayBackend';
import type { EffectsLayer } from './effects/effectsLayer';
import { createPartyRenderer } from './renderParty';
import type { SpriteProvider } from './sprites/spriteProvider';
import type { Viewport } from './viewport';
import type { World } from './world';

const FOOTPRINT_COLOUR = '#222034';

export interface RendererDeps {
  readonly art: Readonly<Record<BiomeId, BiomeArtSprites>>;
  readonly borders: ReadonlyMap<BorderKey, BorderSprites>;
  readonly sprites: SpriteProvider;
  readonly seed: string;
  readonly effects: Pick<EffectsLayer, 'offset' | 'drawFront'>;
  readonly reducedMotion: boolean;
}

/**
 * Draws the world each frame, back to front: scenery along the strip, the
 * footprints of misses, the party, effects, and a biome's title card on top.
 * The camera keeps the whole party (traveller and followers) in view.
 * Option objects are made once and reused, so drawing allocates nothing of ours.
 */
export function createRenderer(k: KAPLAYCtx, world: World, deps: RendererDeps) {
  const drawScenery = createSceneryRenderer(kaplaySceneryBackend(k), deps);
  const drawParty = createPartyRenderer(k, world, deps.sprites, deps.reducedMotion);
  const drawTitleCard = createTitleCardRenderer(k);
  const printPos = k.vec2(0, 0);
  const print: DrawRectOpt = {
    width: 2,
    height: 1,
    pos: printPos,
    color: k.rgb(FOOTPRINT_COLOUR),
    opacity: 0.45,
  };

  function drawFootprints(cameraX: number) {
    const prints = world.footprints;
    for (let i = 0; i < prints.length; i++) {
      const x = prints[i]!;
      if (Number.isNaN(x)) continue;
      printPos.x = Math.round(x) - cameraX;
      printPos.y = GROUND_Y - 1;
      k.drawRect(print);
      printPos.x += 4;
      printPos.y = GROUND_Y + 1;
      k.drawRect(print);
    }
  }

  // The party's span the camera frames; it eases to the real one as followers join.
  let span = partySpan(world.followers.length);

  return function draw(view: Viewport, ready: boolean) {
    span = easeSpan(span, partySpan(world.followers.length), k.dt(), deps.reducedMotion);
    // Whole native pixels only: a camera between pixels makes everything shimmer.
    const cameraX = partyCameraX(Math.round(world.player.x), span, view.visibleWidth);
    // Everything in the world moves together when an effect shakes the scene.
    k.pushTransform();
    k.pushTranslate(deps.effects.offset.x, deps.effects.offset.y);
    drawScenery(world.state, cameraX, view.drawWidth);
    drawFootprints(cameraX);
    if (ready) {
      drawParty(cameraX);
      deps.effects.drawFront(); // sparks and twinkles, in front of everyone
    }
    k.popTransform();
    drawTitleCard(world.titleCard, view.visibleWidth);
  };
}
