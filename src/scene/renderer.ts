import type { Color, DrawRectOpt, DrawSpriteOpt, KAPLAYCtx } from 'kaplay';
import type { BiomeId } from '@/config/biomes';
import {
  FOLLOWER_SPACING,
  GROUND_Y,
  NATIVE_HEIGHT,
  PLAYER_SCREEN_X,
  PROP_BASE_Y,
} from '@/config/render';
import type { BiomeArtSprites } from './biomes/load';
import { movementFor, type Point } from './entities/followerTrail';
import type { Pose } from './entities/idleMotion';
import { tile } from './layers';
import { propsInSegment, segmentsInView, type PlacedProp } from './props';
import type { SpriteProvider, SpriteRef } from './sprites/spriteProvider';
import type { Viewport } from './viewport';
import type { World } from './world';

const DEG = 180 / Math.PI;
const FOOTPRINT_COLOUR = '#222034';
const PROP_CACHE_LIMIT = 64;

// A pop that overshoots a little before settling at 1.
const popScale = (t: number) => {
  const s = 1.70158;
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

/**
 * Draws the world each frame, back to front. Option objects and vectors are
 * made once and reused, so drawing allocates nothing of ours per frame.
 */
export function createRenderer(
  k: KAPLAYCtx,
  world: World,
  art: Readonly<Record<BiomeId, BiomeArtSprites>>,
  sprites: SpriteProvider,
  seed: string,
) {
  const pos = k.vec2(0, 0);
  const scale = k.vec2(1, 1);
  const printPos = k.vec2(0, 0);
  const sprite: DrawSpriteOpt = {
    sprite: '',
    pos,
    scale,
    angle: 0,
    opacity: 1,
    anchor: 'topleft',
    flipX: false,
  };
  const sky: DrawRectOpt = { width: 0, height: NATIVE_HEIGHT, pos: k.vec2(0, 0), opacity: 1 };
  const print: DrawRectOpt = {
    width: 2,
    height: 1,
    pos: printPos,
    color: k.rgb(FOOTPRINT_COLOUR),
    opacity: 0.45,
  };
  const skyColours = new Map<BiomeId, [Color, Color]>();
  for (const [id, a] of Object.entries(art) as [BiomeId, BiomeArtSprites][]) {
    skyColours.set(id, [k.rgb(a.sky[0]), k.rgb(a.sky[1])]);
  }
  const propCache = new Map<string, readonly PlacedProp[]>();
  const onPath: Point = { x: 0, y: 0 };
  const placed: Point = { x: 0, y: 0 };

  const drawImage = (name: string, x: number, y: number, opacity: number) => {
    sprite.sprite = name;
    pos.x = x;
    pos.y = y;
    sprite.anchor = 'topleft';
    sprite.angle = 0;
    sprite.flipX = false;
    sprite.opacity = opacity;
    scale.x = 1;
    scale.y = 1;
    k.drawSprite(sprite);
  };

  function propsFor(id: BiomeId, segment: number) {
    const key = `${id}|${segment}`;
    let list = propCache.get(key);
    if (!list) {
      // Only when a new stretch of world comes into view.
      if (propCache.size > PROP_CACHE_LIMIT) propCache.clear();
      list = propsInSegment(`${seed}|${id}`, art[id].props, segment);
      propCache.set(key, list);
    }
    return list;
  }

  function drawBiome(id: BiomeId, cameraX: number, drawWidth: number, opacity: number) {
    const a = art[id];
    sky.width = drawWidth;
    const gradient = skyColours.get(id);
    if (gradient) sky.gradient = gradient;
    sky.opacity = opacity;
    k.drawRect(sky);
    for (const layer of a.layers) {
      const { firstX, copies } = tile(cameraX, layer.parallax, layer.width, drawWidth);
      for (let i = 0; i < copies; i++) {
        drawImage(layer.sprite, firstX + i * layer.width, layer.y, opacity);
      }
    }
    const { first, last } = segmentsInView(cameraX, drawWidth, a.maxPropWidth);
    for (let s = first; s <= last; s++) {
      for (const p of propsFor(id, s)) {
        const x = p.x - cameraX;
        const prop = a.props[p.kind]!;
        if (x > drawWidth || x + prop.width < 0) continue;
        drawImage(prop.sprite, x, PROP_BASE_Y - prop.height, opacity);
      }
    }
  }

  function drawCharacter(ref: SpriteRef, x: number, y: number, pose: Pose, pop: number) {
    const s = pop < 1 ? popScale(pop) : 1;
    sprite.sprite = ref.name;
    pos.x = x;
    pos.y = y + pose.dy;
    sprite.anchor = 'bot';
    sprite.flipX = ref.facesLeft;
    sprite.angle = pose.angle * DEG;
    sprite.opacity = 1;
    scale.x = s;
    scale.y = s * pose.scaleY;
    k.drawSprite(sprite);
  }

  return function draw(view: Viewport, ready: boolean) {
    const playerX = Math.round(world.player.x);
    // Whole native pixels only: a camera between pixels makes everything shimmer.
    const cameraX = playerX - Math.round(PLAYER_SCREEN_X * view.visibleWidth);
    const { biome } = world;
    if (biome.from) drawBiome(biome.from, cameraX, view.drawWidth, 1);
    drawBiome(biome.to, cameraX, view.drawWidth, biome.from ? biome.progress : 1);

    for (const x of world.footprints) {
      if (Number.isNaN(x)) continue;
      printPos.x = Math.round(x) - cameraX;
      printPos.y = GROUND_Y - 1;
      k.drawRect(print);
      printPos.x += 4;
      printPos.y = GROUND_Y + 1;
      k.drawRect(print);
    }
    if (!ready) return;

    // Farthest back first, so nearer followers overlap them.
    const { followers, trail } = world;
    for (let i = followers.length - 1; i >= 0; i--) {
      const f = followers[i]!;
      trail.pointBehind((i + 1) * FOLLOWER_SPACING, onPath);
      movementFor(f.animal.movement)(onPath, 0, 0, placed);
      const x = Math.round(placed.x) - cameraX;
      drawCharacter(sprites.spriteFor(f.animal, f.shiny), x, Math.round(placed.y), f.pose, f.pop);
    }
    drawCharacter(sprites.playerSprite(), playerX - cameraX, GROUND_Y, world.playerPose, 1);
  };
}
