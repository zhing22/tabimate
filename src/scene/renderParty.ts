import type { DrawCircleOpt, DrawSpriteOpt, KAPLAYCtx } from 'kaplay';
import { GLOW } from '@/config/effects';
import { FOLLOWER_SPACING, GROUND_Y } from '@/config/render';
import type { EffectTarget } from './effects/types';
import { movementFor, type Point } from './entities/followerTrail';
import type { Pose } from './entities/idleMotion';
import { frameAt } from './sprites/sheet';
import type { SpriteProvider, SpriteRef } from './sprites/spriteProvider';
import { followerStepTime } from './follower';
import type { World } from './world';

const DEG = 180 / Math.PI;

/** How a character is drawn this frame, besides where. */
interface Look {
  pose: Pose;
  /** 0..1 while popping in, then 1. */
  pop: number;
  /** Seconds into the walk, or -1 when standing (first frame). */
  walkS: number;
  /** Show the eyes-closed copy of the frame. */
  blinking: boolean;
}

// A pop that overshoots a little before settling at 1.
const popScale = (t: number) => {
  const s = 1.70158;
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

/**
 * Draws the party: followers (farthest back first) with their glows, then the
 * player. Keeps each follower's effect target on its sprite. Option objects
 * are made once and refilled, so a frame allocates nothing of ours.
 */
export function createPartyRenderer(k: KAPLAYCtx, world: World, sprites: SpriteProvider) {
  const pos = k.vec2(0, 0);
  const scale = k.vec2(1, 1);
  const sprite: DrawSpriteOpt = { sprite: '', pos, scale, angle: 0, anchor: 'bot', frame: 0 };
  const glowPos = k.vec2(0, 0);
  const glow: DrawCircleOpt = { radius: 0, pos: glowPos, color: k.rgb(GLOW.colour), opacity: 0 };
  const look: Look = { pose: world.playerPose, pop: 1, walkS: -1, blinking: false };
  const onPath: Point = { x: 0, y: 0 };
  const placed: Point = { x: 0, y: 0 };

  function drawCharacter(
    ref: SpriteRef,
    x: number,
    y: number,
    { pose, pop, walkS, blinking }: Look,
  ) {
    const s = pop < 1 ? popScale(pop) : 1;
    sprite.sprite = blinking && ref.blinkName ? ref.blinkName : ref.name;
    sprite.frame = ref.walk && walkS >= 0 ? frameAt(ref.walk, walkS) : 0;
    pos.x = x;
    pos.y = y + pose.dy;
    sprite.flipX = ref.facesLeft;
    sprite.angle = pose.angle * DEG;
    scale.x = s;
    scale.y = s * pose.scaleY;
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

  return function drawParty(cameraX: number) {
    const { followers, trail, player } = world;
    for (let i = followers.length - 1; i >= 0; i--) {
      const f = followers[i]!;
      trail.pointBehind((i + 1) * FOLLOWER_SPACING, onPath);
      movementFor(f.animal.movement)(onPath, 0, 0, placed);
      const x = Math.round(placed.x) - cameraX;
      const y = Math.round(placed.y);
      f.target.x = x;
      f.target.y = y + f.pose.dy;
      drawGlow(f.target);
      look.pose = f.pose;
      look.pop = f.pop;
      look.walkS = player.walking ? followerStepTime(player, i) : -1;
      look.blinking = f.blink > 0;
      drawCharacter(sprites.spriteFor(f.animal, f.shiny), x, y, look);
    }
    look.pose = world.playerPose;
    look.pop = 1;
    look.walkS = player.walking ? player.stepTime : -1;
    look.blinking = false;
    drawCharacter(sprites.playerSprite(), Math.round(player.x) - cameraX, GROUND_Y, look);
  };
}
