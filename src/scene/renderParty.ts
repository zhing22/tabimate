import type { DrawCircleOpt, DrawSpriteOpt, KAPLAYCtx } from 'kaplay';
import { GLOW } from '@/config/effects';
import { FOLLOWER_SPACING, GROUND_Y } from '@/config/render';
import type { EffectTarget } from './effects/types';
import type { Point } from './entities/followerTrail';
import type { Pose } from './entities/idleMotion';
import {
  createPlacement,
  movementFor,
  type MovementInput,
  type Placement,
} from './entities/movement';
import { frameAt, type FrameTag } from './sprites/sheet';
import type { SpriteProvider, SpriteRef } from './sprites/spriteProvider';
import { followerStepTime, type Follower } from './follower';
import { createMovementDecor } from './movementDecor';
import type { World } from './world';

const DEG = 180 / Math.PI;

/** How a character is drawn this frame, besides where. */
interface Look {
  pose: Pose;
  /** 0..1 while popping in, then 1. */
  pop: number;
  /** The frames to play, and seconds into them; undefined or -1 for the first frame. */
  tag: FrameTag | undefined;
  animS: number;
  /** Show the eyes-closed copy of the frame. */
  blinking: boolean;
}

// A pop that overshoots a little before settling at 1.
const popScale = (t: number) => {
  const s = 1.70158;
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

/** The frames a placement asks for, falling back to the walk cycle. */
const tagFor = (ref: SpriteRef, anim: Placement['anim']): FrameTag | undefined =>
  (anim === 'flap' ? ref.flap : anim === 'swim' ? ref.swim : undefined) ?? ref.walk;

/**
 * Draws the party: followers (farthest back first) with their glows, shadows
 * and bubbles, then the player. Each follower moves by its kind (land, sky,
 * water: scene/entities/movement.ts). Option objects are made once and
 * refilled, so a frame allocates nothing of ours.
 */
export function createPartyRenderer(
  k: KAPLAYCtx,
  world: World,
  sprites: SpriteProvider,
  reducedMotion: boolean,
) {
  const pos = k.vec2(0, 0);
  const scale = k.vec2(1, 1);
  const sprite: DrawSpriteOpt = { sprite: '', pos, scale, angle: 0, anchor: 'bot', frame: 0 };
  const glowPos = k.vec2(0, 0);
  const glow: DrawCircleOpt = { radius: 0, pos: glowPos, color: k.rgb(GLOW.colour), opacity: 0 };
  const decor = createMovementDecor(k);
  const look: Look = { pose: world.playerPose, pop: 1, tag: undefined, animS: -1, blinking: false };
  const onPath: Point = { x: 0, y: 0 };
  const placed = createPlacement();
  const input: { -readonly [K in keyof MovementInput]: MovementInput[K] } = {
    timeS: 0,
    phase: 0,
    inWater: false,
    reducedMotion,
  };

  function drawCharacter(ref: SpriteRef, x: number, y: number, l: Look) {
    const s = l.pop < 1 ? popScale(l.pop) : 1;
    sprite.sprite = l.blinking && ref.blinkName ? ref.blinkName : ref.name;
    sprite.frame = l.tag && l.animS >= 0 ? frameAt(l.tag, l.animS) : 0;
    pos.x = x;
    pos.y = y + l.pose.dy;
    sprite.flipX = ref.facesLeft;
    sprite.angle = l.pose.angle * DEG;
    scale.x = s;
    scale.y = s * l.pose.scaleY;
    k.drawSprite(sprite);
  }

  /** A soft halo behind a follower whose effect asks for one (shiny, sparkle). */
  function drawGlow(target: EffectTarget) {
    if (target.glow <= 0) return;
    glowPos.x = target.x;
    glowPos.y = target.y - target.size / 2;
    glow.radius = target.size * GLOW.radius;
    glow.opacity = target.glow * GLOW.opacity;
    k.drawCircle(glow);
  }

  function drawFollower(f: Follower, i: number, cameraX: number) {
    const { player } = world;
    world.trail.pointBehind((i + 1) * FOLLOWER_SPACING, onPath);
    input.timeS = f.motionS;
    input.phase = f.phase;
    input.inWater = world.env.inWater;
    movementFor(f.animal.movement)(onPath, input, placed);
    const x = Math.round(placed.x) - cameraX;
    f.target.x = x;
    f.target.y = placed.y + f.pose.dy;
    if (placed.shadow) decor.shadow(x, onPath.y, f.target.size);
    drawGlow(f.target);
    const ref = sprites.spriteFor(f.animal, f.shiny);
    look.pose = f.pose;
    look.pop = f.pop;
    look.tag = tagFor(ref, placed.anim);
    // Walkers step only while the player walks; wings and fins keep going.
    look.animS =
      placed.anim !== 'walk' ? f.motionS : player.walking ? followerStepTime(player, i) : -1;
    look.blinking = f.blink > 0;
    drawCharacter(ref, x, placed.y, look);
    decor.bubble(f);
  }

  return function drawParty(cameraX: number) {
    const { followers, player } = world;
    for (let i = followers.length - 1; i >= 0; i--) drawFollower(followers[i]!, i, cameraX);
    const ref = sprites.playerSprite();
    look.pose = world.playerPose;
    look.pop = 1;
    look.tag = ref.walk;
    look.animS = player.walking ? player.stepTime : -1;
    look.blinking = false;
    drawCharacter(ref, Math.round(player.x) - cameraX, GROUND_Y, look);
  };
}
